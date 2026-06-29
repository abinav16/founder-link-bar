CREATE OR REPLACE FUNCTION public.prevent_user_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
    -- Admin can change to anything
    IF COALESCE(auth.jwt()->>'email', '') = 'danielabinav16@gmail.com' THEN
      RETURN NEW;
    END IF;
    -- Owner can resubmit their own startup back to 'pending' (review queue)
    IF NEW.user_id = auth.uid() AND NEW.status = 'pending' THEN
      RETURN NEW;
    END IF;
    -- Otherwise block the status change
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$function$;

-- Also resubmit the affected startup so it shows up in admin pending
UPDATE public.startups
  SET status = 'pending'
  WHERE id = '0d2db708-f4e9-4b77-bd83-c446826c76b1';