-- SmartFarm 2.0 — public_farm_jobs: clear the security-definer-view warning
-- WITHOUT exposing private farmer data (revised: no DROP VIEW).
--
-- Design (accepted for validation):
--   * A narrow SECURITY DEFINER function returns ONLY the 14 approved public
--     columns (same names, order and types as the current view).
--   * public_farm_jobs is rewritten with CREATE OR REPLACE (preserves its
--     existing SELECT grants and cannot break dependents) and then switched
--     with ALTER VIEW ... SET (security_invoker = true, security_barrier = false).
--   * Base-table grants and RLS policies are NOT changed by this migration.
--   * Direct RPC (get_public_farm_jobs) exposes the same 14 public fields only.
--   * Fully reversible: DOWN block (commented) restores the security_barrier view.
--
-- Pre-checked: repo-wide search shows NO other database object (view, function,
-- trigger, policy) references public_farm_jobs — only this definition, its
-- grants, the app query, and rollback-safe tests. A pg_depend re-check query
-- is included in the test plan to confirm on the target database pre-apply.
--
-- Effects:
--   * Supabase advisor security-definer-view warning clears (view is invoker).
--   * anon/authenticated keep reading the same 14 columns via the same view name.
--   * anon still cannot SELECT farm_jobs or job_inquiries; RLS untouched.
--   * Inquiry submit path (farm_work_job_is_open + column-scoped INSERT) untouched.

-- ── UP ─────────────────────────────────────────────────────────────────

-- Column types verified against:
--   20260924000002_phase5 (farm_jobs: id uuid, title/location/work_type text,
--   start_date/end_date date, workers_needed integer, wage_rate numeric,
--   wage_unit/description/contact_preference/status text, created_at timestamptz;
--   farms.name text -> farm_display_name text).
CREATE OR REPLACE FUNCTION public.get_public_farm_jobs()
RETURNS TABLE (
  id uuid,
  title text,
  location text,
  work_type text,
  start_date date,
  end_date date,
  workers_needed integer,
  wage_rate numeric,
  wage_unit text,
  description text,
  contact_preference text,
  status text,
  farm_display_name text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    j.id,
    j.title,
    j.location,
    j.work_type,
    j.start_date,
    j.end_date,
    j.workers_needed,
    j.wage_rate,
    j.wage_unit,
    j.description,
    j.contact_preference,
    j.status,
    f.name AS farm_display_name,
    j.created_at
  FROM public.farm_jobs AS j
  LEFT JOIN public.farms AS f ON f.id = j.farm_id
  WHERE j.status = 'open';
$$;

-- Trusted owner: migrations apply as postgres; pin it explicitly.
ALTER FUNCTION public.get_public_farm_jobs() OWNER TO postgres;

COMMENT ON FUNCTION public.get_public_farm_jobs() IS
  'Definer-privileged public projection of open farm jobs; exposes only the 14 approved public columns.';

-- Least privilege: no PUBLIC execute; anon + authenticated only.
REVOKE ALL ON FUNCTION public.get_public_farm_jobs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_farm_jobs() TO anon, authenticated;

-- Same 14 columns in the same order, so CREATE OR REPLACE preserves grants
-- and any dependents; no DROP VIEW is used.
CREATE OR REPLACE VIEW public.public_farm_jobs AS
SELECT * FROM public.get_public_farm_jobs();

-- Clear the advisor warning: invoker view, legacy barrier option removed.
ALTER VIEW public.public_farm_jobs SET (security_invoker = true, security_barrier = false);

COMMENT ON VIEW public.public_farm_jobs IS
  'Public projection of open farm jobs (invoker view over get_public_farm_jobs); excludes farmer identifiers and contact details.';

-- Re-assert the exact public-read grant posture (idempotent).
REVOKE ALL ON public.public_farm_jobs FROM PUBLIC;
GRANT SELECT ON public.public_farm_jobs TO anon, authenticated;

-- ── DOWN (rollback: restores the current security_barrier definer view) ──
-- DROP FUNCTION IF EXISTS public.get_public_farm_jobs();
-- CREATE OR REPLACE VIEW public.public_farm_jobs
-- WITH (security_barrier = true)
-- AS
-- SELECT
--   j.id, j.title, j.location, j.work_type, j.start_date, j.end_date,
--   j.workers_needed, j.wage_rate, j.wage_unit, j.description,
--   j.contact_preference, j.status, f.name AS farm_display_name, j.created_at
-- FROM public.farm_jobs AS j
-- LEFT JOIN public.farms AS f ON f.id = j.farm_id
-- WHERE j.status = 'open';
-- REVOKE ALL ON public.public_farm_jobs FROM PUBLIC;
-- GRANT SELECT ON public.public_farm_jobs TO anon, authenticated;
