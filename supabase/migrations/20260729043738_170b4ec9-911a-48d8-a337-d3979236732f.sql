CREATE OR REPLACE FUNCTION public.public_startup_monthly(_ids uuid[])
RETURNS TABLE(startup_id uuid, month_offset integer, received bigint, given bigint, clicks bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH months AS (SELECT generate_series(0, 11) AS month_offset),
  base AS (
    SELECT s.id AS sid, m.month_offset,
      (date_trunc('month', now()) - (m.month_offset || ' months')::interval) AS m_start,
      (date_trunc('month', now()) - ((m.month_offset - 1) || ' months')::interval) AS m_end
    FROM public.startups s CROSS JOIN months m
    WHERE s.id = ANY(_ids) AND s.status = 'approved'
  )
  SELECT b.sid, b.month_offset,
    COALESCE((SELECT count(*) FROM public.impressions i
      WHERE i.shown_startup_id = b.sid
        AND i.referrer IS DISTINCT FROM 'dev-simulate'
        AND i.created_at >= b.m_start AND i.created_at < b.m_end), 0),
    COALESCE((SELECT count(*) FROM public.impressions i
      WHERE i.host_startup_id = b.sid
        AND i.referrer IS DISTINCT FROM 'dev-simulate'
        AND i.created_at >= b.m_start AND i.created_at < b.m_end), 0),
    COALESCE((SELECT count(*) FROM public.clicks c
      WHERE c.shown_startup_id = b.sid
        AND c.created_at >= b.m_start AND c.created_at < b.m_end), 0)
  FROM base b;
$$;

REVOKE ALL ON FUNCTION public.public_startup_monthly(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_startup_monthly(uuid[]) TO anon, authenticated, service_role;