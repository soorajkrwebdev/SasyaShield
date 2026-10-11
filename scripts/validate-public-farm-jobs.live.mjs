// Live SQL execution on embedded PGlite (no Docker, no prod).
// Usage: node scripts/validate-public-farm-jobs.live.mjs  (part 1 of 2)
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
let passed = 0;
export const ok = (n, c, x = '') => {
  if (!c) throw new Error(`FAIL: ${n} ${x}`);
  passed += 1;
  console.log(`  PASS: ${n}`);
};
export const db = new PGlite();
export const q = async (sql, params = []) => (await db.query(sql, params)).rows;
export const exec = async (sql) => { await db.exec(sql); };

console.log('1) Build minimal schema...');
await exec(`DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text NOT NULL);
CREATE TABLE public.farms (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
  name text NOT NULL, location text NOT NULL, area numeric NOT NULL);
CREATE TABLE public.farm_jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
  farm_id uuid NOT NULL, title text NOT NULL, location text NOT NULL, work_type text NOT NULL,
  start_date date NOT NULL, end_date date, workers_needed integer NOT NULL, wage_rate numeric,
  wage_unit text NOT NULL, description text NOT NULL, contact_preference text,
  contact_phone text, status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());`);

console.log('2) Apply revised migration verbatim...');
await exec(read('supabase/migrations/20261011000000_public_farm_jobs_invoker_wrapper.sql'));
console.log('  PASS: migration executes without error');

console.log('3) Catalog: view options + columns + types...');
const [{ reloptions }] = await q(`SELECT reloptions FROM pg_class WHERE oid='public.public_farm_jobs'::regclass;`);
ok('security_invoker=true set', reloptions?.includes('security_invoker=true'), JSON.stringify(reloptions));
ok('security_barrier removed', !reloptions?.includes('security_barrier=true'));
const [{ cols }] = await q(`SELECT string_agg(attname,',' ORDER BY attnum) AS cols FROM pg_attribute
  WHERE attrelid='public.public_farm_jobs'::regclass AND attnum>0 AND NOT attisdropped;`);
ok('14 approved columns', cols === 'id,title,location,work_type,start_date,end_date,workers_needed,wage_rate,wage_unit,description,contact_preference,status,farm_display_name,created_at', cols);
const [{ types }] = await q(`SELECT string_agg(format_type(atttypid, atttypmod),',' ORDER BY attnum) AS types
  FROM pg_attribute WHERE attrelid='public.public_farm_jobs'::regclass AND attnum>0 AND NOT attisdropped;`);
ok('types match schema', types === 'uuid,text,text,text,date,date,integer,numeric,text,text,text,text,text,timestamp with time zone', types);
console.log('4) Function: security + volatility + grants...');
const [fn] = await q(`SELECT p.prosecdef AS secdef, p.provolatile AS vol,
  COALESCE(array_to_string(p.proconfig, ','), '') AS cfg
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='get_public_farm_jobs';`);
ok('SECURITY DEFINER', fn.secdef === true);
ok('STABLE (vol=s)', fn.vol === 's', String(fn.vol));
ok('fixed search_path', fn.cfg.includes('search_path=pg_catalog, public'), fn.cfg);
const grants = await q(`SELECT DISTINCT grantee FROM information_schema.role_routine_grants
  WHERE routine_schema='public' AND routine_name='get_public_farm_jobs' ORDER BY 1;`);
ok('EXECUTE limited scope', grants.map((g) => g.grantee).every((g) => ['anon', 'authenticated', 'postgres'].includes(g)), JSON.stringify(grants));
console.log('5) Behaviour: open visible, closed hidden, no private cols...');
await exec(`INSERT INTO public.profiles (id, full_name) VALUES ('11111111-1111-4111-8111-111111111111','T A');
INSERT INTO public.farms (id, user_id, name, location, area) VALUES
  ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Farm A','Loc A',1);
INSERT INTO public.farm_jobs (user_id, farm_id, title, location, work_type, start_date, workers_needed,
  wage_unit, description, contact_phone, status) VALUES
  ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','Open Job','Loc A','Harvesting',
   CURRENT_DATE,2,'day','Desc','+91-90000-00001','open'),
  ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','Shut Job','Loc A','Weeding',
   CURRENT_DATE,1,'day','Desc','+91-90000-00002','cancelled');`);
const rows = await q(`SELECT * FROM public.public_farm_jobs ORDER BY title;`);
ok('only open row returned', rows.length === 1 && rows[0].title === 'Open Job');
ok('farm_display_name joined', rows[0].farm_display_name === 'Farm A');
ok('no private keys', !('user_id' in rows[0]) && !('farm_id' in rows[0]) && !('contact_phone' in rows[0]));
const rpc = await q(`SELECT * FROM public.get_public_farm_jobs();`);
ok('direct RPC same open row', rpc.length === 1 && rpc[0].title === 'Open Job');
console.log('6) Idempotency (CREATE OR REPLACE, no DROP)...');
await exec(read('supabase/migrations/20261011000000_public_farm_jobs_invoker_wrapper.sql'));
const [{ reloptions: ro2 }] = await q(`SELECT reloptions FROM pg_class WHERE oid='public.public_farm_jobs'::regclass;`);
ok('re-apply keeps invoker option', ro2?.includes('security_invoker=true'));
await db.close();
console.log(`\nALL ${passed} LIVE CHECKS PASSED (embedded PGlite; production untouched).`);
console.log(`INFO: passed-counter is module-local (${passed}); see per-line PASS above.`);
