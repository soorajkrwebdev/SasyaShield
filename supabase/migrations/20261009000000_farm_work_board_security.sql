-- Farm Work Board: expose only public listing fields and enforce ownership.

CREATE OR REPLACE VIEW public.public_farm_jobs
WITH (security_barrier = true)
AS
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

COMMENT ON VIEW public.public_farm_jobs IS
  'Public projection of open farm jobs; excludes farmer identifiers and contact details.';

REVOKE ALL ON public.public_farm_jobs FROM PUBLIC;
GRANT SELECT ON public.public_farm_jobs TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.farm_work_job_has_valid_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  farm_owner_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT f.user_id
      INTO farm_owner_id
      FROM public.farms AS f
      WHERE f.id = NEW.farm_id;
  ELSIF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.farm_id IS DISTINCT FROM OLD.farm_id THEN
    SELECT f.user_id
      INTO farm_owner_id
      FROM public.farms AS f
      WHERE f.id = NEW.farm_id;
  ELSE
    RETURN NEW;
  END IF;

  IF farm_owner_id IS NULL OR farm_owner_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'The selected farm must belong to the job owner.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.farm_work_job_has_valid_owner() FROM PUBLIC;

DROP TRIGGER IF EXISTS tr_farm_jobs_validate_owner ON public.farm_jobs;
CREATE TRIGGER tr_farm_jobs_validate_owner
  BEFORE INSERT OR UPDATE ON public.farm_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.farm_work_job_has_valid_owner();

DROP POLICY IF EXISTS "Anyone can view open farm jobs" ON public.farm_jobs;
DROP POLICY IF EXISTS "Farmers can insert own jobs" ON public.farm_jobs;
DROP POLICY IF EXISTS "Farmers can update own jobs" ON public.farm_jobs;
DROP POLICY IF EXISTS "Farmers can delete own jobs" ON public.farm_jobs;

CREATE POLICY "Farmers can view own jobs"
  ON public.farm_jobs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Farmers can insert own jobs"
  ON public.farm_jobs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Farmers can update own jobs"
  ON public.farm_jobs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Farmers can delete own jobs"
  ON public.farm_jobs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.farm_work_job_is_open(p_job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.farm_jobs AS j
    WHERE j.id = p_job_id
      AND j.status = 'open'
  );
$$;

REVOKE ALL ON FUNCTION public.farm_work_job_is_open(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.farm_work_job_is_open(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.farm_work_validate_job_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  job_status text;
  normalized_phone text;
BEGIN
  NEW.applicant_name := btrim(NEW.applicant_name);
  NEW.applicant_phone := btrim(NEW.applicant_phone);
  NEW.applicant_email := nullif(btrim(NEW.applicant_email), '');
  NEW.message := btrim(NEW.message);

  IF NEW.applicant_name IS NULL OR char_length(NEW.applicant_name) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Name must be between 1 and 120 characters.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.applicant_phone IS NULL
     OR char_length(NEW.applicant_phone) NOT BETWEEN 7 AND 32
     OR NEW.applicant_phone !~ '^[+0-9(). -]+$' THEN
    RAISE EXCEPTION 'Enter a valid phone number.'
      USING ERRCODE = 'check_violation';
  END IF;

  normalized_phone := regexp_replace(NEW.applicant_phone, '[^0-9]', '', 'g');
  IF char_length(normalized_phone) NOT BETWEEN 7 AND 20 THEN
    RAISE EXCEPTION 'Enter a valid phone number.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.applicant_email IS NOT NULL
     AND (char_length(NEW.applicant_email) > 254
       OR NEW.applicant_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') THEN
    RAISE EXCEPTION 'Enter a valid email address.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.available_date IS NOT NULL AND NEW.available_date < current_date THEN
    RAISE EXCEPTION 'Availability date cannot be in the past.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.workers_count NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Worker count must be between 1 and 50.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.message IS NULL OR char_length(NEW.message) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'Message must be between 1 and 2000 characters.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT j.status
    INTO job_status
    FROM public.farm_jobs AS j
    WHERE j.id = NEW.job_id
    FOR UPDATE;

  IF NOT FOUND OR job_status <> 'open' THEN
    RAISE EXCEPTION 'This job is not open for inquiries.'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.job_id::text || ':' || normalized_phone, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.job_inquiries AS i
    WHERE i.job_id = NEW.job_id
      AND regexp_replace(i.applicant_phone, '[^0-9]', '', 'g') = normalized_phone
      AND i.created_at >= now() - interval '1 hour'
  ) THEN
    RAISE EXCEPTION 'An inquiry for this job was already submitted with this phone number recently.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.farm_work_validate_job_inquiry() FROM PUBLIC;

DROP TRIGGER IF EXISTS tr_job_inquiries_validate_submission ON public.job_inquiries;
CREATE TRIGGER tr_job_inquiries_validate_submission
  BEFORE INSERT ON public.job_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.farm_work_validate_job_inquiry();

CREATE INDEX IF NOT EXISTS idx_job_inquiries_rate_limit
  ON public.job_inquiries (job_id, created_at DESC);

DROP POLICY IF EXISTS "Public can insert job inquiry" ON public.job_inquiries;
DROP POLICY IF EXISTS "Farmers can view inquiries for their jobs" ON public.job_inquiries;
DROP POLICY IF EXISTS "Farmers can update inquiries for their jobs" ON public.job_inquiries;
DROP POLICY IF EXISTS "Farmers can delete inquiries for their jobs" ON public.job_inquiries;

CREATE POLICY "Public can submit inquiries for open jobs"
  ON public.job_inquiries FOR INSERT TO anon, authenticated
  WITH CHECK (public.farm_work_job_is_open(job_id));

CREATE POLICY "Farmers can view inquiries for their jobs"
  ON public.job_inquiries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.farm_jobs AS j
      WHERE j.id = job_inquiries.job_id
        AND j.user_id = auth.uid()
    )
  );

CREATE POLICY "Farmers can update inquiries for their jobs"
  ON public.job_inquiries FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.farm_jobs AS j
      WHERE j.id = job_inquiries.job_id
        AND j.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.farm_jobs AS j
      WHERE j.id = job_inquiries.job_id
        AND j.user_id = auth.uid()
    )
  );

CREATE POLICY "Farmers can delete inquiries for their jobs"
  ON public.job_inquiries FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.farm_jobs AS j
      WHERE j.id = job_inquiries.job_id
        AND j.user_id = auth.uid()
    )
  );

REVOKE ALL ON TABLE public.farm_jobs FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.farm_jobs TO authenticated;

REVOKE ALL ON TABLE public.job_inquiries FROM PUBLIC, anon, authenticated;
GRANT INSERT (job_id, applicant_name, applicant_phone, applicant_email, available_date, workers_count, message)
  ON TABLE public.job_inquiries TO anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.job_inquiries TO authenticated;
GRANT UPDATE (status) ON TABLE public.job_inquiries TO authenticated;