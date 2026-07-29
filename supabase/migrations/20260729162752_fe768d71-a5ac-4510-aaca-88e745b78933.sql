CREATE OR REPLACE FUNCTION public.widget_pick_weights()
RETURNS TABLE(startup_id uuid, weight double precision)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH given AS (
    SELECT s.id,
      COALESCE((SELECT count(*) FROM public.impressions i
        WHERE i.host_startup_id = s.id
          AND i.referrer IS DISTINCT FROM 'dev-simulate'
          AND i.created_at >= now() - interval '7 days'), 0)::double precision AS g
    FROM public.startups s
    WHERE s.status = 'approved'
  ),
  avg_g AS (
    SELECT GREATEST(AVG(g), 1.0) AS a FROM given
  )
  SELECT given.id,
         LEAST(4.0, GREATEST(1.0, 1.0 + 1.0 * (given.g / avg_g.a)))
  FROM given, avg_g;
$$;

REVOKE ALL ON FUNCTION public.widget_pick_weights() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.widget_pick_weights() TO anon, authenticated, service_role;