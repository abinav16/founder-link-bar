-- Fix 1: Prevent users from escalating status via UPDATE
CREATE OR REPLACE FUNCTION public.prevent_user_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When the call has an authenticated user (auth.uid() is set), forbid status changes.
  -- Admin/service operations go through edge functions using the service role,
  -- where auth.uid() is NULL and the change is allowed.
  IF auth.uid() IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS startups_prevent_user_status_change ON public.startups;
CREATE TRIGGER startups_prevent_user_status_change
BEFORE UPDATE ON public.startups
FOR EACH ROW
EXECUTE FUNCTION public.prevent_user_status_change();

-- Fix 2: Stop exposing owner user_id to anonymous public readers via column-level grants
REVOKE SELECT ON public.startups FROM anon;
GRANT SELECT (id, name, description, website_url, status, created_at, updated_at)
  ON public.startups TO anon;