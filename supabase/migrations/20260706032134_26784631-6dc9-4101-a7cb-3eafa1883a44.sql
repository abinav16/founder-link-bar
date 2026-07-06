CREATE OR REPLACE FUNCTION public.public_network_totals_all()
RETURNS TABLE(total_impressions bigint, total_clicks bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (SELECT count(*) FROM public.impressions i
       WHERE i.shown_startup_id IN (SELECT id FROM public.startups)),
    (SELECT count(*) FROM public.clicks c
       WHERE c.shown_startup_id IN (SELECT id FROM public.startups));
$$;

GRANT EXECUTE ON FUNCTION public.public_network_totals_all() TO anon, authenticated;