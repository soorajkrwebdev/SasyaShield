-- Notification generation: automatically generate notifications for high-value events
-- 1. Job Inquiries: Notify the farmer when an applicant submits an inquiry for their farm job.
-- 2. Pest Follow-up: Notify the farmer when a pesticide application has a scheduled follow_up_date.

-- Helper function to generate a notification for a new job inquiry
CREATE OR REPLACE FUNCTION public.handle_new_job_inquiry_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  job_owner_id uuid;
  job_title_text text;
BEGIN
  -- Look up the farmer who owns the farm job
  SELECT j.user_id, j.title
    INTO job_owner_id, job_title_text
    FROM public.farm_jobs AS j
    WHERE j.id = NEW.job_id;

  IF job_owner_id IS NOT NULL THEN
    -- Avoid duplicates if the inquiry insertion is retried
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE related_record_id = NEW.id
        AND related_record_type = 'job_inquiries'
    ) THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        related_record_id,
        related_record_type,
        is_read,
        created_at
      ) VALUES (
        job_owner_id,
        'job_inquiry',
        'New Worker Inquiry for ' || COALESCE(job_title_text, 'Farm Job'),
        'New worker inquiry received (' || COALESCE(NEW.workers_count, 1) || ' worker(s)) from ' || COALESCE(NEW.applicant_name, 'an applicant') || '. Check Inquiries in Farm Work Board to view contact details.',
        NEW.id,
        'job_inquiries',
        false,
        now()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_inquiry_notification ON public.job_inquiries;
CREATE TRIGGER trg_job_inquiry_notification
  AFTER INSERT ON public.job_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_job_inquiry_notification();


-- Helper function to generate a notification for scheduled pesticide application follow-ups
CREATE OR REPLACE FUNCTION public.handle_pesticide_follow_up_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Only generate when a follow_up_date is set
  IF NEW.follow_up_date IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE related_record_id = NEW.id
        AND related_record_type = 'pesticide_applications'
    ) THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        related_record_id,
        related_record_type,
        scheduled_time,
        is_read,
        created_at
      ) VALUES (
        NEW.user_id,
        'pest_follow_up',
        'Follow-up Due: ' || COALESCE(NEW.product_name, 'Treatment'),
        'Scheduled post-application scouting for ' || COALESCE(NEW.product_name, 'pesticide application') || ' on ' || NEW.follow_up_date || '.',
        NEW.id,
        'pesticide_applications',
        NEW.follow_up_date::timestamptz,
        false,
        now()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pesticide_follow_up_notification ON public.pesticide_applications;
CREATE TRIGGER trg_pesticide_follow_up_notification
  AFTER INSERT ON public.pesticide_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_pesticide_follow_up_notification();
