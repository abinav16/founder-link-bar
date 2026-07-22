
CREATE TABLE IF NOT EXISTS public.application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid,
  startup_name text NOT NULL,
  website_url text,
  applicant_email text,
  applicant_user_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('submitted','deleted','resubmitted','approved','rejected')),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS application_events_created_at_idx ON public.application_events (created_at DESC);
CREATE INDEX IF NOT EXISTS application_events_event_type_idx ON public.application_events (event_type);

GRANT SELECT ON public.application_events TO authenticated;
GRANT ALL ON public.application_events TO service_role;

ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view application events" ON public.application_events;
CREATE POLICY "Admin can view application events"
  ON public.application_events
  FOR SELECT
  TO authenticated
  USING (COALESCE(auth.jwt() ->> 'email', '') = 'danielabinav16@gmail.com');

-- Trigger function: log INSERT / UPDATE / DELETE on public.startups
CREATE OR REPLACE FUNCTION public.log_application_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
  _uid uuid;
  _event text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _uid := NEW.user_id;
    SELECT email INTO _email FROM auth.users WHERE id = _uid;
    INSERT INTO public.application_events (startup_id, startup_name, website_url, applicant_email, applicant_user_id, event_type, metadata)
    VALUES (NEW.id, NEW.name, NEW.website_url, _email, _uid, 'submitted',
            jsonb_build_object('description', NEW.description, 'status', NEW.status));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      _uid := NEW.user_id;
      SELECT email INTO _email FROM auth.users WHERE id = _uid;
      IF NEW.status = 'approved' THEN _event := 'approved';
      ELSIF NEW.status = 'rejected' THEN _event := 'rejected';
      ELSIF NEW.status = 'pending' AND OLD.status = 'rejected' THEN _event := 'resubmitted';
      ELSE _event := NULL;
      END IF;
      IF _event IS NOT NULL THEN
        INSERT INTO public.application_events (startup_id, startup_name, website_url, applicant_email, applicant_user_id, event_type, metadata)
        VALUES (NEW.id, NEW.name, NEW.website_url, _email, _uid, _event,
                jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'rejection_reason', NEW.rejection_reason));
      END IF;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    _uid := OLD.user_id;
    SELECT email INTO _email FROM auth.users WHERE id = _uid;
    INSERT INTO public.application_events (startup_id, startup_name, website_url, applicant_email, applicant_user_id, event_type, metadata)
    VALUES (OLD.id, OLD.name, OLD.website_url, _email, _uid, 'deleted',
            jsonb_build_object('description', OLD.description, 'last_status', OLD.status, 'created_at', OLD.created_at));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_startups_log_event_ins ON public.startups;
DROP TRIGGER IF EXISTS trg_startups_log_event_upd ON public.startups;
DROP TRIGGER IF EXISTS trg_startups_log_event_del ON public.startups;

CREATE TRIGGER trg_startups_log_event_ins
  AFTER INSERT ON public.startups
  FOR EACH ROW EXECUTE FUNCTION public.log_application_event();

CREATE TRIGGER trg_startups_log_event_upd
  AFTER UPDATE ON public.startups
  FOR EACH ROW EXECUTE FUNCTION public.log_application_event();

CREATE TRIGGER trg_startups_log_event_del
  AFTER DELETE ON public.startups
  FOR EACH ROW EXECUTE FUNCTION public.log_application_event();
