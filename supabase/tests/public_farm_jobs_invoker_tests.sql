-- SmartFarm 2.0 — public_farm_jobs invoker-wrapper tests (rollback-safe).
-- Run ONLY on scratch DB (see scripts/validate-public-farm-jobs.mjs).
-- Whole file is one txn ending in ROLLBACK. Part 1 of 2.
BEGIN;
DO $test$
DECLARE
  farmer_a_id uuid := 'f1000000-0000-4000-8000-000000000001';
  farmer_b_id uuid := 'f2000000-0000-4000-8000-000000000002';
  farm_a_id   uuid := 'fa000000-0000-4000-8000-000000000001';
  farm_b_id   uuid := 'fb000000-0000-4000-8000-000000000002';
  job_a_id    uuid := 'a1000000-0000-4000-8000-000000000001';
  job_b_id    uuid := 'b2000000-0000-4000-8000-000000000002';
  inquiry_id  uuid;
  visible_rows integer;
  col_names text;
  fn_owner text;
  fn_secdef text;
  fn_path text[];
  view_opts text[];
  dep_count integer;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id IN (farmer_a_id, farmer_b_id))
     OR EXISTS (SELECT 1 FROM public.farms WHERE id IN (farm_a_id, farm_b_id))
     OR EXISTS (SELECT 1 FROM public.farm_jobs WHERE id IN (job_a_id, job_b_id)) THEN
    RAISE EXCEPTION 'Invoker test fixture IDs already exist.';
  END IF;
  SELECT count(*) INTO dep_count
  FROM pg_depend d JOIN pg_rewrite r ON r.oid = d.objid JOIN pg_class c ON c.oid = r.ev_class
  WHERE d.refclassid = 'pg_class'::regclass
    AND d.refobjid = 'public.public_farm_jobs'::regclass
    AND d.deptype = 'n' AND c.relkind IN ('v', 'm');
  IF dep_count > 0 THEN
    RAISE EXCEPTION 'Unexpected dependents on public_farm_jobs: %', dep_count;
  END IF;
  RAISE NOTICE 'PASS: no dependent views/materialized views';
  INSERT INTO auth.users (id, aud, role, email, encrypted_password,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (farmer_a_id, 'authenticated', 'authenticated', 'invoker-test-a@example.invalid', '', '{}'::jsonb,
     '{"full_name":"Invoker Test A"}'::jsonb, now(), now()),
    (farmer_b_id, 'authenticated', 'authenticated', 'invoker-test-b@example.invalid', '', '{}'::jsonb,
     '{"full_name":"Invoker Test B"}'::jsonb, now(), now());
  INSERT INTO public.farms (id, user_id, name, location, area)
  VALUES
    (farm_a_id, farmer_a_id, 'Invoker Farm A', 'Invoker Location A', 1),
    (farm_b_id, farmer_b_id, 'Invoker Farm B', 'Invoker Location B', 1);
  INSERT INTO public.farm_jobs (
    id, user_id, farm_id, title, location, work_type, start_date,
    workers_needed, wage_unit, description, contact_phone, status
  ) VALUES
    (job_a_id, farmer_a_id, farm_a_id, 'Invoker Open Job', 'Invoker Location A',
     'Harvesting', current_date, 3, 'day', 'Open invoker test job', '+91-90000-00001', 'open'),
    (job_b_id, farmer_b_id, farm_b_id, 'Invoker Closed Job', 'Invoker Location B',
     'Weeding', current_date, 2, 'day', 'Closed invoker test job', '+91-90000-00002', 'cancelled');
  SELECT reloptions INTO view_opts FROM pg_class WHERE oid = 'public.public_farm_jobs'::regclass;
  IF view_opts IS NULL OR NOT ('security_invoker=true' = ANY (view_opts::text[])) THEN
    RAISE EXCEPTION 'View is not security_invoker. reloptions=%', view_opts;
  END IF;
  IF 'security_barrier=true' = ANY (COALESCE(view_opts, '{}')::text[]) THEN
    RAISE EXCEPTION 'Legacy security_barrier still set.';
  END IF;
  RAISE NOTICE 'PASS: view is security_invoker without security_barrier';
  SELECT string_agg(a.attname, ',' ORDER BY a.attnum) INTO col_names
  FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
  WHERE c.oid = 'public.public_farm_jobs'::regclass AND a.attnum > 0 AND NOT a.attisdropped;
  IF col_names <> 'id,title,location,work_type,start_date,end_date,workers_needed,wage_rate,wage_unit,description,contact_preference,status,farm_display_name,created_at' THEN
    RAISE EXCEPTION 'View exposes wrong columns: %', col_names;
  END IF;
  RAISE NOTICE 'PASS: view exposes exactly the 14 approved columns';
  SELECT u.usename, (p.prosecdef)::text, p.proconfig INTO fn_owner, fn_secdef, fn_path
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_user u ON u.usesysid = p.proowner
  WHERE n.nspname = 'public' AND p.proname = 'get_public_farm_jobs';
  IF fn_owner <> 'postgres' THEN RAISE EXCEPTION 'Function owner %, not postgres', fn_owner; END IF;
  IF fn_secdef <> 'true' THEN RAISE EXCEPTION 'Function is not SECURITY DEFINER'; END IF;
  RAISE NOTICE 'PASS: function is postgres-owned SECURITY DEFINER';
  IF EXISTS (
    SELECT 1 FROM information_schema.role_routine_grants
    WHERE routine_schema = 'public' AND routine_name = 'get_public_farm_jobs'
      AND grantee NOT IN ('anon', 'authenticated', 'postgres')
  ) THEN
    RAISE EXCEPTION 'Function EXECUTE grants too broad.';
  END IF;
  RAISE NOTICE 'PASS: function EXECUTE limited to anon + authenticated';
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
  SELECT count(*) INTO visible_rows FROM public.public_farm_jobs WHERE id = job_a_id;
  IF visible_rows <> 1 THEN RAISE EXCEPTION 'Anon could not read open job via view.'; END IF;
  SELECT count(*) INTO visible_rows FROM public.public_farm_jobs WHERE id = job_b_id;
  IF visible_rows <> 0 THEN RAISE EXCEPTION 'Anon saw non-open job via view.'; END IF;
  SELECT count(*) INTO visible_rows FROM public.get_public_farm_jobs() WHERE id = job_a_id;
  IF visible_rows <> 1 THEN RAISE EXCEPTION 'Anon could not call RPC.'; END IF;
  RAISE NOTICE 'PASS: anon reads open job via view and RPC';
  BEGIN
    PERFORM user_id FROM public.public_farm_jobs WHERE id = job_a_id;
    RAISE EXCEPTION 'View leaked user_id.';
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
  BEGIN
    PERFORM contact_phone FROM public.public_farm_jobs WHERE id = job_a_id;
    RAISE EXCEPTION 'View leaked contact_phone.';
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
  BEGIN
    PERFORM farm_id FROM public.get_public_farm_jobs() WHERE id = job_a_id;
    RAISE EXCEPTION 'RPC leaked farm_id.';
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
  BEGIN
    PERFORM contact_phone FROM public.get_public_farm_jobs() WHERE id = job_a_id;
    RAISE EXCEPTION 'RPC leaked contact_phone.';
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
  RAISE NOTICE 'PASS: private fields rejected on view and RPC';
  BEGIN
    PERFORM id FROM public.farm_jobs WHERE id = job_a_id;
    RAISE EXCEPTION 'Anon read base farm_jobs.';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM id FROM public.job_inquiries LIMIT 1;
    RAISE EXCEPTION 'Anon read job_inquiries.';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  SELECT count(*) INTO visible_rows FROM public.farms;
  IF visible_rows <> 0 THEN RAISE EXCEPTION 'Anon saw farms rows.'; END IF;
  RAISE NOTICE 'PASS: anon denied on farm_jobs/job_inquiries, 0 farms rows';
  INSERT INTO public.job_inquiries (job_id, applicant_name, applicant_phone, available_date, workers_count, message)
  VALUES (job_a_id, 'Invoker Applicant', '+1 (555) 111-2222', current_date, 1, 'Interested.')
  RETURNING id INTO inquiry_id;
  BEGIN
    INSERT INTO public.job_inquiries (job_id, applicant_name, applicant_phone, available_date, workers_count, message)
    VALUES (job_b_id, 'Invoker Applicant', '+1 555 333 4444', current_date, 1, 'Closed job.');
    RAISE EXCEPTION 'Anon inquiry on closed job accepted.';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.job_inquiries (job_id, applicant_name, applicant_phone, workers_count, message, status)
    VALUES (job_a_id, 'Invoker Applicant', '+1 555 555 6666', 1, 'Status smuggle.', 'accepted');
    RAISE EXCEPTION 'Anon set inquiry status.';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM id FROM public.job_inquiries WHERE id = inquiry_id;
    RAISE EXCEPTION 'Anon read back an inquiry.';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS: inquiry rules preserved';
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', farmer_a_id::text, true);
  SELECT count(*) INTO visible_rows FROM public.public_farm_jobs WHERE id = job_a_id;
  IF visible_rows <> 1 THEN RAISE EXCEPTION 'Farmer A lost public view access.'; END IF;
  SELECT count(*) INTO visible_rows FROM public.farm_jobs;
  IF visible_rows <> 1 THEN RAISE EXCEPTION 'Farmer A sees wrong farm_jobs count.'; END IF;
  SELECT count(*) INTO visible_rows FROM public.job_inquiries WHERE id = inquiry_id;
  IF visible_rows <> 1 THEN RAISE EXCEPTION 'Farmer A cannot read own inquiry.'; END IF;
  PERFORM set_config('request.jwt.claim.sub', farmer_b_id::text, true);
  SELECT count(*) INTO visible_rows FROM public.job_inquiries WHERE id = inquiry_id;
  IF visible_rows <> 0 THEN RAISE EXCEPTION 'Farmer B read Farmer A inquiry.'; END IF;
  UPDATE public.job_inquiries SET status = 'declined' WHERE id = inquiry_id;
  GET DIAGNOSTICS visible_rows = ROW_COUNT;
  IF visible_rows <> 0 THEN RAISE EXCEPTION 'Farmer B updated Farmer A inquiry.'; END IF;
  RAISE NOTICE 'PASS: authenticated isolation preserved';
  DROP FUNCTION IF EXISTS public.get_public_farm_jobs();
  CREATE OR REPLACE VIEW public.public_farm_jobs
  WITH (security_barrier = true)
  AS SELECT j.id, j.title, j.location, j.work_type, j.start_date, j.end_date,
            j.workers_needed, j.wage_rate, j.wage_unit, j.description,
            j.contact_preference, j.status, f.name AS farm_display_name, j.created_at
     FROM public.farm_jobs AS j
     LEFT JOIN public.farms AS f ON f.id = j.farm_id
     WHERE j.status = 'open';
  SELECT reloptions INTO view_opts FROM pg_class WHERE oid = 'public.public_farm_jobs'::regclass;
  IF NOT ('security_barrier=true' = ANY (view_opts::text[])) THEN
    RAISE EXCEPTION 'DOWN-shape restore failed.';
  END IF;
  RAISE EXCEPTION 'ROLLBACK_PROBE_OK: reversible (expected control-flow exception)';
END;
$test$;
ROLLBACK;
