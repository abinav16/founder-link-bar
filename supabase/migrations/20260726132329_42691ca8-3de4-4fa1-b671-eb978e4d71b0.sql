DROP POLICY IF EXISTS "Approved startups are publicly readable" ON public.startups;

REVOKE SELECT ON public.startups FROM anon;
REVOKE SELECT ON public.startups FROM authenticated;

GRANT SELECT (
  id, user_id, name, website_url, description, status,
  created_at, updated_at, logo_url, slug,
  founder_name, founder_quote, founder_avatar_url, iframe_blocked
) ON public.startups TO anon;

GRANT SELECT (
  id, user_id, name, website_url, description, status,
  created_at, updated_at, logo_url, slug,
  founder_name, founder_quote, founder_avatar_url, iframe_blocked
) ON public.startups TO authenticated;

GRANT ALL ON public.startups TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_startups()
RETURNS SETOF public.startups
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT * FROM public.startups
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC;
$fn$;

REVOKE ALL ON FUNCTION public.get_my_startups() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_startups() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_startups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_startups() TO service_role;

CREATE OR REPLACE FUNCTION public.admin_all_startups()
RETURNS SETOF public.startups
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  IF COALESCE(auth.jwt() ->> 'email', '') <> 'danielabinav16@gmail.com' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT * FROM public.startups ORDER BY created_at DESC;
END;
$fn$;

REVOKE ALL ON FUNCTION public.admin_all_startups() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_all_startups() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_all_startups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_all_startups() TO service_role;