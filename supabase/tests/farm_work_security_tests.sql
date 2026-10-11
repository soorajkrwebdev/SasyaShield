-- Run with: supabase db query --linked --file supabase/tests/farm_work_security_tests.sql
-- The transaction is rolled back so no test users or Farm Work records persist.
BEGIN;

DO $test$
DECLARE
  farmer_a_id uuid := 'f1000000-0000-4000-8000-000000000001';
  farmer_b_id uuid := 'f2000000-0000-4000-8000-000000000002';
  farm_a_id uuid := 'fa000000-0000-4000-8000-000000000001';
  farm_b_id uuid := 'fb000000-0000-4000-8000-000000000002';
  job_a_id uuid := 'a1000000-0000-4000-8000-000000000001';
  job_b_id uuid := 'b2000000-0000-4000-8000-000000000002';
  inquiry_id uuid;
  created_job_id uuid;
  affected_rows integer;
  visible_rows integer;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id IN (farmer_a_id, farmer_b_id)
  ) OR EXISTS (
    SELECT 1
    FROM public.farms
    WHERE id IN (farm_a_id, farm_b_id)
  ) OR EXISTS (
    SELECT 1
    FROM public.farm_jobs
    WHERE id IN (job_a_id, job_b_id)
  ) THEN
    RAISE EXCEPTION 'Farm Work security test fixture IDs already exist.';
  END IF;

  INSERT INTO auth.users (
    id, aud, role, email, encrypted_password,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES
    (farmer_a_id, 'authenticated', 'authenticated',
      'farm-work-test-a@example.invalid', '', '{}'::jsonb,
      '{"full_name":"Farm Work Test A"}'::jsonb, now(), now()),
    (farmer_b_id, 'authenticated', 'authenticated',
      'farm-work-test-b@example.invalid', '', '{}'::jsonb,
      '{"full_name":"Farm Work Test B"}'::jsonb, now(), now());

  INSERT INTO public.farms (id, user_id, name, location, area)
  VALUES
    (farm_a_id, farmer_a_id, 'Test Farm A', 'Test Location A', 1),
    (farm_b_id, farmer_b_id, 'Test Farm B', 'Test Location B', 1);

  INSERT INTO public.farm_jobs (
    id, user_id, farm_id, title, location, work_type, start_date,
    workers_needed, wage_unit, description, status
  ) VALUES
    (job_a_id, farmer_a_id, farm_a_id, 'Open Test Job', 'Test Location A',
      'Harvesting', current_date, 3, 'day', 'Open test job description', 'open'),
    (job_b_id, farmer_b_id, farm_b_id, 'Closed Test Job', 'Test Location B',
      'Weeding', current_date, 2, 'day', 'Closed test job description', 'cancelled');

  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);

  SELECT count(*) INTO visible_rows
  FROM public.public_farm_jobs
  WHERE id = job_a_id;
  IF visible_rows <> 1 THEN
    RAISE EXCEPTION 'Anon could not browse the open test job.';
  END IF;

  BEGIN
    PERFORM id FROM public.farm_jobs WHERE id = job_a_id;
    RAISE EXCEPTION 'Anon unexpectedly read the base farm_jobs table.';
  EXCEPTION WHEN check_violation OR insufficient_privilege THEN
    NULL;
  END;

  INSERT INTO public.job_inquiries (
    job_id, applicant_name, applicant_phone, applicant_email,
    available_date, workers_count, message
  ) VALUES (
    job_a_id, 'Test Applicant', '+1 (555) 222-3333', NULL,
    current_date, 2, 'Interested in the open test job.'
  );

  BEGIN
    INSERT INTO public.job_inquiries (
      job_id, applicant_name, applicant_phone, available_date,
      workers_count, message
    ) VALUES (
      job_a_id, 'Test Applicant', '1-555-222-3333', current_date,
      1, 'Duplicate inquiry.'
    );
    RAISE EXCEPTION 'A duplicate inquiry was unexpectedly accepted.';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.job_inquiries (
      job_id, applicant_name, applicant_phone, available_date,
      workers_count, message
    ) VALUES (
      job_b_id, 'Test Applicant', '+1 555 444 5555', current_date,
      1, 'Inquiry for a closed job.'
    );
    RAISE EXCEPTION 'An inquiry for a closed job was unexpectedly accepted.';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.job_inquiries (
      job_id, applicant_name, applicant_phone, available_date,
      workers_count, message
    ) VALUES (
      job_a_id, repeat('A', 121), '+1 555 777 8888', current_date,
      1, 'Invalid overlong applicant name.'
    );
    RAISE EXCEPTION 'An inquiry with an overlong name was unexpectedly accepted.';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    PERFORM id FROM public.job_inquiries WHERE id = inquiry_id;
    RAISE EXCEPTION 'Anon unexpectedly read a private inquiry.';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.job_inquiries (
      job_id, applicant_name, applicant_phone, workers_count, message, status
    ) VALUES (
      job_a_id, 'Test Applicant', '+1 555 666 7777', 1,
      'Attempt to set a private status.', 'accepted'
    );
    RAISE EXCEPTION 'Anon unexpectedly set an inquiry status.';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', farmer_a_id::text, true);

  SELECT id INTO inquiry_id
  FROM public.job_inquiries
  WHERE job_id = job_a_id;
  IF inquiry_id IS NULL THEN
    RAISE EXCEPTION 'Farmer A could not retrieve the inquiry for their job.';
  END IF;

  SELECT count(*) INTO visible_rows FROM public.farm_jobs;
  IF visible_rows <> 1 THEN
    RAISE EXCEPTION 'Farmer A did not see exactly their own job.';
  END IF;

  UPDATE public.farm_jobs SET title = 'Updated by Farmer A' WHERE id = job_a_id;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION 'Farmer A could not update their own job.';
  END IF;

  UPDATE public.farm_jobs SET title = 'Unauthorized update' WHERE id = job_b_id;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'Farmer A updated Farmer B job.';
  END IF;

  BEGIN
    UPDATE public.farm_jobs SET user_id = farmer_b_id WHERE id = job_a_id;
    RAISE EXCEPTION 'Farmer A changed the job owner.';
  EXCEPTION WHEN check_violation OR insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    UPDATE public.farm_jobs SET farm_id = farm_b_id WHERE id = job_a_id;
    RAISE EXCEPTION 'Farmer A reassigned the job to Farmer B farm.';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.farm_jobs (
      user_id, farm_id, title, location, work_type, start_date,
      workers_needed, wage_unit, description
    ) VALUES (
      farmer_a_id, farm_b_id, 'Cross-farm insert', 'Test Location',
      'Harvesting', current_date, 1, 'day', 'Must be rejected.'
    );
    RAISE EXCEPTION 'Farmer A created a job for Farmer B farm.';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  INSERT INTO public.farm_jobs (
    user_id, farm_id, title, location, work_type, start_date,
    workers_needed, wage_unit, description
  ) VALUES (
    farmer_a_id, farm_a_id, 'Owned Create Test', 'Test Location A',
    'Planting', current_date, 1, 'day', 'Create test job.'
  ) RETURNING id INTO created_job_id;

  DELETE FROM public.farm_jobs WHERE id = created_job_id;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION 'Farmer A could not delete their own job.';
  END IF;

  SELECT count(*) INTO visible_rows
  FROM public.job_inquiries
  WHERE id = inquiry_id;
  IF visible_rows <> 1 THEN
    RAISE EXCEPTION 'Farmer A could not read an inquiry for their job.';
  END IF;

  UPDATE public.job_inquiries SET status = 'reviewed' WHERE id = inquiry_id;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION 'Farmer A could not update an inquiry for their job.';
  END IF;

  UPDATE public.farm_jobs SET status = 'cancelled' WHERE id = job_a_id;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION 'Farmer A could not close their own job.';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', farmer_b_id::text, true);

  SELECT count(*) INTO visible_rows FROM public.farm_jobs;
  IF visible_rows <> 1 THEN
    RAISE EXCEPTION 'Farmer B did not see exactly their own job.';
  END IF;

  SELECT count(*) INTO visible_rows
  FROM public.job_inquiries
  WHERE id = inquiry_id;
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'Farmer B read Farmer A private inquiry.';
  END IF;

  UPDATE public.job_inquiries SET status = 'declined' WHERE id = inquiry_id;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'Farmer B updated Farmer A private inquiry.';
  END IF;

  DELETE FROM public.farm_jobs WHERE id = job_a_id;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'Farmer B deleted Farmer A job.';
  END IF;
END;
$test$;

ROLLBACK;