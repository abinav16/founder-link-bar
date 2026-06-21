CREATE OR REPLACE FUNCTION public.prevent_user_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF COALESCE(auth.jwt()->>'email', '') <> 'danielabinav16@gmail.com' THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

UPDATE public.startups SET status = 'approved' WHERE id = 'a1ab12c8-6f2f-4d43-8361-df5aed9a93f7';