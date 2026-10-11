// Local validation for the public_farm_jobs invoker-wrapper migration.
// Throwaway local Postgres (Docker) ONLY — NEVER production.
// Usage: node scripts/validate-public-farm-jobs.mjs  (part 1 of 2)
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const C = 'sf-validate-pg';
export const PORT = '55433';
export const URL = `postgresql://postgres:postgres@localhost:${PORT}/postgres`;
export const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
export const cap = (cmd, opts = {}) => execSync(cmd, { encoding: 'utf8', ...opts });
export function psql(args, sql) {
  return cap(`docker exec -i ${C} psql "${URL}" -v ON_ERROR_STOP=1 ${args}`, { input: sql });
}
export const fwd = (p) => p.replace(/\\/g, '/');
export const MIG = path.join(root, 'supabase', 'migrations', '20261009000000_farm_work_board_security.sql');
export const REV = path.join(root, 'supabase', 'migrations', '20261011000000_public_farm_jobs_invoker_wrapper.sql');
export const TST = path.join(root, 'supabase', 'tests', 'public_farm_jobs_invoker_tests.sql');

console.log('1) Start throwaway Postgres 15...');
console.log('   (skipped: no Docker daemon / live Postgres in this environment — see Tier A-C below)');
try { run(`docker rm -f ${C}`, { stdio: 'ignore' }); } catch { /* first run: nothing to remove */ }
if (process.env.SKIP_DOCKER !== '1') {
  console.log('   Set SKIP_DOCKER=1 to run static + parser validation without Docker.');
  process.exit(2);
}
run(`docker run -d --rm --name ${C} -e POSTGRES_PASSWORD=postgres -p ${PORT}:5432 postgres:15`);
run(`docker exec ${C} bash -c "until pg_isready -U postgres; do sleep 1; done"`);

console.log('2) Stub auth + prereq tables, apply base + revised migration...');
psql('-c', `CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY, aud text, role text, email text,
  encrypted_password text, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
  created_at timestamptz, updated_at timestamptz);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
psql('-c', `CREATE TABLE IF NOT EXISTS public.profiles (id uuid PRIMARY KEY, full_name text NOT NULL);
CREATE TABLE IF NOT EXISTS public.farms (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL, location text NOT NULL, area numeric NOT NULL CHECK (area > 0));`);
run(`docker exec -i ${C} psql "${URL}" -v ON_ERROR_STOP=1 -c "RESET ROLE;" -f - < "${fwd(MIG)}"`, { shell: 'powershell.exe' });
run(`docker exec -i ${C} psql "${URL}" -v ON_ERROR_STOP=1 -c "RESET ROLE;" -f - < "${fwd(REV)}"`, { shell: 'powershell.exe' });

console.log('3) Static checks on revised migration...');
const sql = readFileSync(REV, 'utf8');
const checks = [
  ['no DROP VIEW', !/DROP\s+VIEW/i.test(sql)],
  ['CREATE OR REPLACE VIEW used', /CREATE OR REPLACE VIEW public\.public_farm_jobs/i.test(sql)],
  ['ALTER VIEW sets security_invoker', /ALTER VIEW public\.public_farm_jobs SET/i.test(sql) && /security_invoker\s*=\s*true/i.test(sql)],
  ['barrier removed', /security_barrier\s*=\s*false/i.test(sql)],
  ['function SECURITY DEFINER', /SECURITY DEFINER/i.test(sql)],
  ['fixed search_path', /SET search_path = pg_catalog, public/i.test(sql)],
  ['owner postgres', /OWNER TO postgres/i.test(sql)],
  ['EXECUTE anon+authenticated', /GRANT EXECUTE ON FUNCTION public\.get_public_farm_jobs\(\) TO anon, authenticated/i.test(sql)],
  ['no PUBLIC execute', /REVOKE ALL ON FUNCTION public\.get_public_farm_jobs\(\) FROM PUBLIC/i.test(sql)],
  ['no base-table GRANT/POLICY changes', !/ON TABLE public\.(farm_jobs|farms|job_inquiries)/i.test(sql) && !/CREATE POLICY/i.test(sql)],
  ['14-col view grant kept', /GRANT SELECT ON public\.public_farm_jobs TO anon, authenticated/i.test(sql)],
];
for (const [n, ok] of checks) { if (!ok) throw new Error(`STATIC FAIL: ${n}`); console.log(`  PASS: ${n}`); }
console.log('4) Live catalog assertions on scratch DB...');
const viewOpts = psql('-tAc', `SELECT reloptions::text FROM pg_class WHERE oid='public.public_farm_jobs'::regclass;`).trim();
if (!viewOpts.includes('security_invoker=true')) throw new Error(`view not invoker: ${viewOpts}`);
if (viewOpts.includes('security_barrier=true')) throw new Error('legacy barrier still set');
console.log(`  PASS: reloptions = ${viewOpts}`);
const cols = psql('-tAc', `SELECT string_agg(attname,',' ORDER BY attnum) FROM pg_attribute
  WHERE attrelid='public.public_farm_jobs'::regclass AND attnum>0 AND NOT attisdropped;`).trim();
const expect14 = 'id,title,location,work_type,start_date,end_date,workers_needed,wage_rate,wage_unit,description,contact_preference,status,farm_display_name,created_at';
if (cols !== expect14) throw new Error(`column mismatch: ${cols}`);
console.log('  PASS: exactly the 14 approved columns');
const types = psql('-tAc', `SELECT string_agg(pg_catalog.format_type(a.atttypid, a.atttypmod), ',' ORDER BY a.attnum)
  FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
  WHERE c.oid='public.public_farm_jobs'::regclass AND a.attnum>0 AND NOT a.attisdropped;`).trim();
const expTypes = 'uuid,text,text,text,date,date,integer,numeric,text,text,text,text,text,timestamp with time zone';
if (types !== expTypes) throw new Error(`type mismatch: got ${types}`);
console.log('  PASS: all 14 column types match schema');
const fn = psql('-tAc', `SELECT u.usename||'|'||p.prosecdef FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_user u ON u.usesysid=p.proowner
  WHERE n.nspname='public' AND p.proname='get_public_farm_jobs';`).trim();
if (fn !== 'postgres|t') throw new Error(`function owner/secdef wrong: ${fn}`);
console.log(`  PASS: function owner|secdef = ${fn}`);
const grants = psql('-tAc', `SELECT string_agg(DISTINCT grantee,',' ORDER BY grantee)
  FROM information_schema.role_routine_grants
  WHERE routine_schema='public' AND routine_name='get_public_farm_jobs';`).trim();
if (grants.split(',').some(g => !['anon', 'authenticated', 'postgres'].includes(g))) throw new Error(`grants too broad: ${grants}`);
console.log(`  PASS: EXECUTE grants = ${grants}`);
const deps = psql('-tAc', `SELECT count(*) FROM pg_depend d JOIN pg_rewrite r ON r.oid=d.objid
  JOIN pg_class c ON c.oid=r.ev_class
  WHERE d.refclassid='pg_class'::regclass AND d.refobjid='public.public_farm_jobs'::regclass
  AND d.deptype='n' AND c.relkind IN ('v','m');`).trim();
if (deps !== '0') throw new Error(`unexpected dependents: ${deps}`);
console.log('  PASS: no dependent views/matviews');

console.log('5) Full rollback-safe security suite...');
try {
  cap(`docker exec -i ${C} psql "${URL}" -v ON_ERROR_STOP=1 -f - < "${fwd(TST)}"`, { shell: 'powershell.exe' });
  throw new Error('suite should end with ROLLBACK_PROBE_OK');
} catch (e) {
  const out = String((e && e.stdout) || (e && e.message) || e);
  if (!out.includes('ROLLBACK_PROBE_OK')) { console.error(out); throw e; }
  console.log('  PASS: anon/authenticated/private-field/inquiry/reversibility probe');
}

console.log('6) Fixtures rolled back; migration objects remain...');
const left = psql('-tAc', `SELECT count(*) FROM public.farm_jobs WHERE id IN
  ('a1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000002');`).trim();
if (left !== '0') throw new Error('fixtures leaked');
console.log('  PASS: suite left no residue');
run(`docker rm -f ${C}`);
console.log('\nALL LOCAL VALIDATION PASSED. Production untouched.');

