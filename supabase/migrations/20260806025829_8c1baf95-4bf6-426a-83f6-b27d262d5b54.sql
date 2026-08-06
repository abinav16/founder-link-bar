CREATE OR REPLACE FUNCTION public.is_approved_startup(_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.startups WHERE id = _id AND status = 'approved'
  );
$$;

REVOKE ALL ON FUNCTION public.is_approved_startup(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_approved_startup(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_approved_host(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Insert impressions for approved startups" ON public.impressions;
CREATE POLICY "Insert impressions for approved startups"
ON public.impressions FOR INSERT TO anon, authenticated
WITH CHECK (
  public.is_approved_startup(shown_startup_id)
  AND (host_startup_id IS NULL OR public.is_approved_host(host_startup_id))
);

DROP POLICY IF EXISTS "Insert clicks for approved startups" ON public.clicks;
CREATE POLICY "Insert clicks for approved startups"
ON public.clicks FOR INSERT TO anon, authenticated
WITH CHECK (
  public.is_approved_startup(shown_startup_id)
  AND (host_startup_id IS NULL OR public.is_approved_host(host_startup_id))
);