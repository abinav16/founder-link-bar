
-- Aggregate RPCs for public leaderboard / network pages
CREATE OR REPLACE FUNCTION public.public_startup_totals(_ids uuid[])
RETURNS TABLE(startup_id uuid, impressions bigint, clicks bigint, impressions_given bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id,
    COALESCE((SELECT count(*) FROM public.impressions i WHERE i.shown_startup_id = s.id), 0),
    COALESCE((SELECT count(*) FROM public.clicks c WHERE c.shown_startup_id = s.id), 0),
    COALESCE((SELECT count(*) FROM public.impressions i WHERE i.host_startup_id = s.id), 0)
  FROM public.startups s
  WHERE s.id = ANY(_ids) AND s.status = 'approved';
$$;

CREATE OR REPLACE FUNCTION public.public_startup_daily(_ids uuid[])
RETURNS TABLE(startup_id uuid, day_offset int, received bigint, given bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH days AS (
    SELECT generate_series(0, 6) AS day_offset
  ),
  base AS (
    SELECT s.id AS startup_id, d.day_offset,
      (date_trunc('day', now()) - (d.day_offset || ' days')::interval) AS day_start,
      (date_trunc('day', now()) - ((d.day_offset - 1) || ' days')::interval) AS day_end
    FROM public.startups s CROSS JOIN days d
    WHERE s.id = ANY(_ids) AND s.status = 'approved'
  )
  SELECT b.startup_id, b.day_offset,
    COALESCE((SELECT count(*) FROM public.impressions i
      WHERE i.shown_startup_id = b.startup_id
        AND i.created_at >= b.day_start AND i.created_at < b.day_end), 0),
    COALESCE((SELECT count(*) FROM public.impressions i
      WHERE i.host_startup_id = b.startup_id
        AND i.created_at >= b.day_start AND i.created_at < b.day_end), 0)
  FROM base b;
$$;

CREATE OR REPLACE FUNCTION public.public_startup_24h(_ids uuid[])
RETURNS TABLE(startup_id uuid, impressions_24h bigint, clicks_24h bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id,
    COALESCE((SELECT count(*) FROM public.impressions i
      WHERE i.shown_startup_id = s.id AND i.created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')), 0),
    COALESCE((SELECT count(*) FROM public.clicks c
      WHERE c.shown_startup_id = s.id AND c.created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')), 0)
  FROM public.startups s
  WHERE s.id = ANY(_ids) AND s.status = 'approved';
$$;

CREATE OR REPLACE FUNCTION public.public_network_totals(_ids uuid[])
RETURNS TABLE(total_impressions bigint, total_clicks bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.impressions WHERE shown_startup_id = ANY(_ids)),
    (SELECT count(*) FROM public.clicks WHERE shown_startup_id = ANY(_ids));
$$;

CREATE OR REPLACE FUNCTION public.public_network_activity()
RETURNS TABLE(today_impressions bigint, today_clicks bigint, yesterday_impressions bigint, yesterday_clicks bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH bounds AS (
    SELECT date_trunc('day', now() AT TIME ZONE 'UTC') AS today_start,
           date_trunc('day', now() AT TIME ZONE 'UTC') - interval '1 day' AS yest_start
  )
  SELECT
    (SELECT count(*) FROM public.impressions, bounds WHERE created_at >= today_start),
    (SELECT count(*) FROM public.clicks, bounds WHERE created_at >= today_start),
    (SELECT count(*) FROM public.impressions, bounds WHERE created_at >= yest_start AND created_at < today_start),
    (SELECT count(*) FROM public.clicks, bounds WHERE created_at >= yest_start AND created_at < today_start);
$$;

REVOKE ALL ON FUNCTION public.public_startup_totals(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_startup_daily(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_startup_24h(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_network_totals(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_network_activity() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.public_startup_totals(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_startup_daily(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_startup_24h(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_network_totals(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_network_activity() TO anon, authenticated;

-- Remove the wide-open anon SELECT policies; owner-scoped policy remains
DROP POLICY IF EXISTS "Anyone can read clicks" ON public.clicks;
DROP POLICY IF EXISTS "Anyone can read impressions" ON public.impressions;
