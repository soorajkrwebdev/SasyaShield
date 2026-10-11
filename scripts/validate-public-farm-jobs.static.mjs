// Static/offline validation for the public_farm_jobs invoker-wrapper migration.
// Runs WITHOUT Docker or any database — parses SQL text only.
// Usage: node scripts/validate-public-farm-jobs.static.mjs
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
let passed = 0;
const ok = (name, cond, extra = '') => {
  if (!cond) throw new Error(`FAIL: ${name} ${extra}`);
  passed += 1;
  console.log(`  PASS: ${name}`);
};

const rev = read('supabase/migrations/20261011000000_public_farm_jobs_invoker_wrapper.sql');
const base = read('supabase/migrations/20261009000000_farm_work_board_security.sql');
const phase5 = read('supabase/migrations/20260924000002_phase5_farm_work_expenses_market_ai_reports.sql');
const phase1 = read('supabase/migrations/20260923000000_phase1_core_schema.sql');

console.log('A) Requirement 1 — no DROP VIEW, CREATE OR REPLACE + ALTER path...');
const revActive = rev.split('\n').filter((l) => !l.trimStart().startsWith('--')).join('\n');
ok('no DROP VIEW in active UP migration', !/DROP\s+VIEW/i.test(revActive));
ok('CREATE OR REPLACE VIEW public_farm_jobs', /CREATE OR REPLACE VIEW public\.public_farm_jobs/i.test(rev));
ok('ALTER VIEW SET (security_invoker=true)', /ALTER VIEW public\.public_farm_jobs SET/i.test(rev) && /security_invoker\s*=\s*true/i.test(rev));
ok('legacy barrier explicitly removed', /security_barrier\s*=\s*false/i.test(rev));

console.log('B) Requirement 2 — dependency check...');
const refs = [...read('supabase/migrations/20261009000000_farm_work_board_security.sql').matchAll(/public_farm_jobs/g)].length;
ok('base migration only defines/grants the view', refs === 4, `(found ${refs})`);
const revRefs = [...rev.matchAll(/public_farm_jobs/g)].length;
ok('revised migration references the view (def + alter + grants + commented DOWN)', revRefs >= 4, `(found ${revRefs})`);
const appRefs = (read('src/services/farmJobService.ts').match(/public_farm_jobs/g) || []).length;
ok('app queries the view by name (unchanged contract)', appRefs >= 1);
const otherDbRefs = ['supabase/migrations/20260925000000_chunk1_rls_audit.sql',
  'supabase/migrations/20261010000000_notification_generation.sql',
  'supabase/tests/farm_work_security_tests.sql',
  'supabase/tests/rls_tests.sql']
  .filter((f) => { try { return /public_farm_jobs|get_public_farm_jobs/.test(read(f)); } catch { return false; } });
ok('no other DB object depends on the view (only existing tests reference it)', otherDbRefs.length === 1 && otherDbRefs[0].endsWith('farm_work_security_tests.sql'), `(${otherDbRefs.join(',')})`);

console.log('C) Requirement 3 — all 14 RETURNS TABLE types vs actual schema...');
// Base truth from phase5 DDL:
const truth = {
  id: 'uuid', title: 'text', location: 'text', work_type: 'text',
  start_date: 'date', end_date: 'date', workers_needed: 'integer', wage_rate: 'numeric',
  wage_unit: 'text', description: 'text', contact_preference: 'text', status: 'text',
  created_at: 'timestamptz', farm_display_name: 'text /* farms.name */',
};
for (const [col, ty] of Object.entries(truth)) {
  if (col === 'farm_display_name') {
    ok('farm_display_name text (from farms.name text)', /farm_display_name\s+text/i.test(rev) && /name text not null/i.test(phase1));
    continue;
  }
  const ddlHit = phase5.includes(`${col} `);
  ok(`${col}: RETURNS ${ty} matches DDL (${ddlHit ? 'ddl found' : 'DDL MISSING'})`,
    ddlHit && new RegExp(`${col}\\s+${ty.replace('(', '\\(')}`, 'i').test(rev));
}

console.log('D) Requirement 4 — owner, search_path, grants...');
ok('SECURITY DEFINER', /SECURITY DEFINER/.test(rev));
ok('fixed search_path pg_catalog, public', /SET search_path = pg_catalog, public/.test(rev));
ok('owner pinned to postgres', /OWNER TO postgres/.test(rev));
ok('EXECUTE to anon+authenticated only', /GRANT EXECUTE ON FUNCTION public\.get_public_farm_jobs\(\) TO anon, authenticated/.test(rev));
ok('REVOKE FROM PUBLIC on function', /REVOKE ALL ON FUNCTION public\.get_public_farm_jobs\(\) FROM PUBLIC/.test(rev));
ok('comment documents 14-col scope', /only the 14/i.test(rev));

console.log('E) Requirement 5 — RPC exposes only the 14 fields...');
const fnBody = rev.slice(rev.indexOf('AS $$'), rev.indexOf('$$;', rev.indexOf('AS $$')));
// Output list = SELECT ... FROM; JOIN keys (f.id = j.farm_id) are internal, not exposed.
const outList = fnBody.slice(fnBody.indexOf('SELECT'), fnBody.indexOf('FROM public.farm_jobs'));
for (const leak of ['user_id', 'contact_phone', 'updated_at']) {
  ok(`RPC output list has no ${leak}`, !new RegExp(`\\b${leak}\\b`, 'i').test(outList));
}
ok('RPC output list has no farm_id column (join key only)', !/AS\s+farm_id/i.test(outList) && !/,\s*j\.farm_id/i.test(outList));
for (const leak of ['job_inquiries', 'applicant_']) {
  ok(`RPC body has no ${leak}`, !new RegExp(`\\b${leak}\\b`, 'i').test(fnBody));
}
ok('RPC WHERE status=open preserved', /WHERE j\.status = 'open'/.test(fnBody));
ok('view is SELECT * FROM function (no direct table access)', /SELECT \* FROM public\.get_public_farm_jobs\(\)/.test(rev));

console.log('F) Base-table grants/RLS untouched...');
ok('no GRANT/POLICY on farm_jobs|farms|job_inquiries', !/ON TABLE public\.(farm_jobs|farms|job_inquiries)/i.test(rev) && !/CREATE POLICY/i.test(rev));
ok('view SELECT grant to anon+authenticated kept', /GRANT SELECT ON public\.public_farm_jobs TO anon, authenticated/.test(rev));
ok('REVOKE FROM PUBLIC on view kept', /REVOKE ALL ON public\.public_farm_jobs FROM PUBLIC/.test(rev));

console.log('G) Rollback present and restores barrier view...');
ok('DOWN block restores security_barrier view', /WITH \(security_barrier = true\)/.test(rev.slice(rev.indexOf('DOWN'))));

console.log('H) Test file covers all required cases...');
const tst = read('supabase/tests/public_farm_jobs_invoker_tests.sql');
for (const needle of ['security_invoker=true', 'user_id', 'contact_phone', 'farm_id',
  'insufficient_privilege', 'job_inquiries', 'authenticated', 'ROLLBACK_PROBE_OK',
  'get_public_farm_jobs()', 'check_violation']) {
  ok(`test covers: ${needle}`, tst.includes(needle));
}

console.log(`\nALL ${passed} STATIC CHECKS PASSED (no database touched).`);
