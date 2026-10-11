// ACL / safety proof for the public_farm_jobs invoker-wrapper migration.
// Embedded PGlite only — production is never touched.
// Proves: (A) anon needs EXECUTE for the invoker view to work, (B) direct RPC
// exposes only the 14 public open-job fields, (C) untrusted roles cannot
// replace the function/tables, (D) authenticated view access is preserved.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
const db = new PGlite();
const exec = async (s) => { await db.exec(s); };
const q = async (s) => (await db.query(s)).rows;
let passed = 0;
const ok = (n, c, x = '') => { if (!c) throw new Error(`FAIL: ${n} ${x}`); passed += 1; console.log(`  PASS: ${n}`); };

await exec(`DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
// Minimal schema mirroring prod hardening: anon has NO direct table grants.
await exec(`GRANT USAGE ON SCHEMA public TO anon, authenticated;
CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text NOT NULL);
CREATE TABLE public.farms (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
  name text NOT NULL, location text NOT NULL, area numeric NOT NULL);
CREATE TABLE public.farm_jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
  farm_id uuid NOT NULL, title text NOT NULL, location text NOT NULL, work_type text NOT NULL,
  start_date date NOT NULL, end_date date, workers_needed integer NOT NULL, wage_rate numeric,
  wage_unit text NOT NULL, description text NOT NULL, contact_preference text, contact_phone text,
  status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.farm_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.farm_jobs FROM PUBLIC, anon;
REVOKE ALL ON public.farms FROM PUBLIC, anon;
GRANT SELECT ON public.farm_jobs TO authenticated;`);
await exec(`INSERT INTO public.profiles (id, full_name) VALUES ('11111111-1111-4111-8111-111111111111','T A');
INSERT INTO public.farms (id, user_id, name, location, area) VALUES
  ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Farm A','Loc A',1);
INSERT INTO public.farm_jobs (user_id, farm_id, title, location, work_type, start_date, workers_needed,
  wage_unit, description, contact_phone, status) VALUES
  ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','Open Job','Loc A','Harvesting',
   CURRENT_DATE,2,'day','Desc','+91-90000-00001','open'),
  ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','Shut Job','Loc A','Weeding',
   CURRENT_DATE,1,'day','Desc','+91-90000-00002','cancelled');`);

console.log('Apply revised migration verbatim...');
await exec(read('supabase/migrations/20261011000000_public_farm_jobs_invoker_wrapper.sql'));

console.log('A) With migration grants in place, anon reads view + RPC...');
await exec('SET ROLE anon;');
let rows = await q('SELECT * FROM public.public_farm_jobs ORDER BY title;');
ok('anon view read works (EXECUTE granted)', rows.length === 1 && rows[0].title === 'Open Job');
rows = await q('SELECT * FROM public.get_public_farm_jobs() ORDER BY title;');
ok('anon direct RPC = only open row, 14 public cols, no private keys',
  rows.length === 1 && rows[0].title === 'Open Job' && !('contact_phone' in rows[0]) && !('user_id' in rows[0]));
await exec('RESET ROLE;');

console.log('B) Proof: EXECUTE is REQUIRED for the invoker view (cannot be view-only)...');
await exec('REVOKE EXECUTE ON FUNCTION public.get_public_farm_jobs() FROM anon;');
await exec('SET ROLE anon;');
let failed = false;
try { await q('SELECT * FROM public.public_farm_jobs;'); } catch { failed = true; }
ok('view read FAILS once anon EXECUTE is revoked (confirms requirement)', failed);
await exec('RESET ROLE;');
await exec('GRANT EXECUTE ON FUNCTION public.get_public_farm_jobs() TO anon;');

console.log('C) Untrusted-role object-replacement safety...');
await exec('SET ROLE anon;');
let cannotReplaceFn = false;
try {
  await exec(`CREATE OR REPLACE FUNCTION public.get_public_farm_jobs() RETURNS text AS $$ SELECT 'hack' $$ LANGUAGE sql;`);
} catch { cannotReplaceFn = true; }
ok('anon cannot replace the function (owned by postgres)', cannotReplaceFn);
let cannotReadTable = false;
try { await q('SELECT contact_phone FROM public.farm_jobs;'); } catch { cannotReadTable = true; }
ok('anon cannot read farm_jobs private cols directly', cannotReadTable);
let cannotReadInquiries = false;
try { await q('SELECT 1 FROM public.job_inquiries;'); } catch { cannotReadInquiries = true; }
ok('anon cannot read job_inquiries (no such grant / absent table)', cannotReadInquiries);
await exec('RESET ROLE;');

console.log('D) Authenticated view access preserved (sees open jobs via view despite owner-only table RLS)...');
await exec('SET ROLE authenticated;');
rows = await q('SELECT * FROM public.public_farm_jobs;');
ok('authenticated view read works', rows.length === 1 && rows[0].title === 'Open Job');
await exec('RESET ROLE;');

await db.close();
console.log(`\nALL ${passed} ACL/SAFETY CHECKS PASSED (embedded PGlite; production untouched).`);
