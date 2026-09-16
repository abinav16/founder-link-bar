CREATE OR REPLACE FUNCTION public.prevent_user_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF COALESCE(auth.jwt()->>'email', '') = 'danielabinav16@gmail.com' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (NEW.user_id = auth.uid() AND NEW.status = 'pending') THEN
      NEW.status := OLD.status;
    END IF;
  END IF;

  NEW.user_id := OLD.user_id;
  NEW.banned := OLD.banned;
  NEW.strike_count := OLD.strike_count;
  NEW.warned_at := OLD.warned_at;
  NEW.warn_expires_at := OLD.warn_expires_at;
  NEW.sponsored := OLD.sponsored;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.slug := OLD.slug;

  -- Paid membership columns are controlled by the payment backend only.
  -- Owners may only downgrade themselves to the free widget mode.
  IF NEW.membership_mode IS DISTINCT FROM OLD.membership_mode
     AND NOT (NEW.user_id = auth.uid() AND NEW.membership_mode = 'widget') THEN
    NEW.membership_mode := OLD.membership_mode;
  END IF;
  NEW.supporter_until := OLD.supporter_until;
  NEW.supporter_subscription_id := OLD.supporter_subscription_id;
  NEW.supporter_cancel_at_period_end := OLD.supporter_cancel_at_period_end;
  NEW.tracking_last_seen_at := OLD.tracking_last_seen_at;

  IF NEW.edit_status IS DISTINCT FROM OLD.edit_status
     AND NEW.edit_status NOT IN ('pending', 'none') THEN
    NEW.edit_status := OLD.edit_status;
  END IF;

  RETURN NEW;
END;
$function$;