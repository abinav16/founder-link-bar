ALTER TABLE public.application_events DROP CONSTRAINT IF EXISTS application_events_event_type_check;
ALTER TABLE public.application_events ADD CONSTRAINT application_events_event_type_check
  CHECK (event_type = ANY (ARRAY['submitted','deleted','resubmitted','approved','rejected','apply_opened','apply_step']));