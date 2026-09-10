CREATE OR REPLACE FUNCTION public.prevent_user_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only applies to authenticated client callers; server/service-role writes
  -- (auth.uid() IS NULL) and admin writes are untouched.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF COALESCE(auth.jwt()->>'email', '') = 'danielabinav16@gmail.com' THEN
    RETURN NEW;
  END IF;

  -- Owner may resubmit their own listing back to 'pending'; any other status
  -- change is reverted.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (NEW.user_id = auth.uid() AND NEW.status = 'pending') THEN
      NEW.status := OLD.status;
    END IF;
  END IF;

  -- Admin-controlled columns can never be changed by a founder.
  NEW.user_id := OLD.user_id;
  NEW.banned := OLD.banned;
  NEW.strike_count := OLD.strike_count;
  NEW.warned_at := OLD.warned_at;
  NEW.warn_expires_at := OLD.warn_expires_at;
  NEW.sponsored := OLD.sponsored;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.slug := OLD.slug;

  -- Founders may only move their edit request between 'pending' and 'none'.
  IF NEW.edit_status IS DISTINCT FROM OLD.edit_status
     AND NEW.edit_status NOT IN ('pending', 'none') THEN
    NEW.edit_status := OLD.edit_status;
  END IF;

  RETURN NEW;
END;
$function$;