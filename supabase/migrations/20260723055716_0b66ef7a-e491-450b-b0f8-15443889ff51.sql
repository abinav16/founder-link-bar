CREATE INDEX IF NOT EXISTS idx_impressions_referrer ON public.impressions (referrer);

CREATE OR REPLACE FUNCTION public.public_startup_totals(_ids uuid[])
RETURNS TABLE(startup_id uuid, impressions bigint, clicks bigint, impressions_given bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id,
    COALESCE((SELECT count(*) FROM public.impressions i WHERE i.shown_startup_id = s.id AND i.referrer IS DISTINCT FROM 'dev-simulate'), 0),
    COALESCE((SELECT count(*) FROM public.clicks c WHERE c.shown_startup_id = s.id), 0),
    COALESCE((SELECT count(*) FROM public.impressions i WHERE i.host_startup_id = s.id AND i.referrer IS DISTINCT FROM 'dev-simulate'), 0)
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
        AND i.referrer IS DISTINCT FROM 'dev-simulate'
        AND i.created_at >= b.day_start AND i.created_at < b.day_end), 0),
    COALESCE((SELECT count(*) FROM public.impressions i
      WHERE i.host_startup_id = b.startup_id
        AND i.referrer IS DISTINCT FROM 'dev-simulate'
        AND i.created_at >= b.day_start AND i.created_at < b.day_end), 0)
  FROM base b;
$$;

CREATE OR REPLACE FUNCTION public.public_startup_24h(_ids uuid[])
RETURNS TABLE(startup_id uuid, impressions_24h bigint, clicks_24h bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id,
    COALESCE((SELECT count(*) FROM public.impressions i
      WHERE i.shown_startup_id = s.id
        AND i.referrer IS DISTINCT FROM 'dev-simulate'
        AND i.created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')), 0),
    COALESCE((SELECT count(*) FROM public.clicks c
      WHERE c.shown_startup_id = s.id
        AND c.created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')), 0)
  FROM public.startups s
  WHERE s.id = ANY(_ids) AND s.status = 'approved';
$$;

CREATE OR REPLACE FUNCTION public.public_network_totals(_ids uuid[])
RETURNS TABLE(total_impressions bigint, total_clicks bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.impressions WHERE shown_startup_id = ANY(_ids) AND referrer IS DISTINCT FROM 'dev-simulate'),
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
    (SELECT count(*) FROM public.impressions, bounds WHERE created_at >= today_start AND referrer IS DISTINCT FROM 'dev-simulate'),
    (SELECT count(*) FROM public.clicks, bounds WHERE created_at >= today_start),
    (SELECT count(*) FROM public.impressions, bounds WHERE created_at >= yest_start AND created_at < today_start AND referrer IS DISTINCT FROM 'dev-simulate'),
    (SELECT count(*) FROM public.clicks, bounds WHERE created_at >= yest_start AND created_at < today_start);
$$;

CREATE OR REPLACE FUNCTION public.public_network_totals_all()
RETURNS TABLE(total_impressions bigint, total_clicks bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.impressions WHERE referrer IS DISTINCT FROM 'dev-simulate'),
    (SELECT count(*) FROM public.clicks);
$$;

CREATE OR REPLACE FUNCTION public.get_startup_rank(_startup_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH counts AS (
    SELECT shown_startup_id, COUNT(*)::int AS c
    FROM public.impressions
    WHERE referrer IS DISTINCT FROM 'dev-simulate'
    GROUP BY shown_startup_id
  ),
  me AS (
    SELECT COALESCE((SELECT c FROM counts WHERE shown_startup_id = _startup_id), 0) AS my_count
  )
  SELECT (SELECT COUNT(*) FROM counts, me WHERE counts.c > me.my_count)::int + 1;
$$;

CREATE OR REPLACE FUNCTION public.digest_impression_counts(_since timestamp with time zone)
RETURNS TABLE(shown_startup_id uuid, cnt bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT shown_startup_id, count(*)::bigint
  FROM impressions
  WHERE created_at >= _since AND referrer IS DISTINCT FROM 'dev-simulate'
  GROUP BY shown_startup_id;
$$;

CREATE OR REPLACE FUNCTION public.digest_impression_count_for(_startup uuid, _since timestamp with time zone, _until timestamp with time zone)
RETURNS bigint
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT count(*)::bigint FROM impressions
  WHERE shown_startup_id = _startup AND created_at >= _since AND created_at < _until AND referrer IS DISTINCT FROM 'dev-simulate';
$$;