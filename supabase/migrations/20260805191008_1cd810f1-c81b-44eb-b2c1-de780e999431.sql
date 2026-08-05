CREATE OR REPLACE FUNCTION public.is_approved_host(_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.startups
    WHERE id = _id AND status = 'approved' AND banned = false
  );
$$;

REVOKE ALL ON FUNCTION public.is_approved_host(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_approved_host(uuid) TO anon, authenticated, service_role;