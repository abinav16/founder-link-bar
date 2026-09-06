-- Rewrite: per-startup lifetime totals
CREATE OR REPLACE FUNCTION public.public_startup_totals(_ids uuid[])
RETURNS TABLE(startup_id uuid, impressions bigint, clicks bigint, impressions_given bigint, clicks_given bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    s.id,
    COALESCE(t.impressions_received, 0),
    COALESCE(t.clicks_received, 0),
    COALESCE(t.impressions_given, 0),
    COALESCE(t.clicks_given, 0)
  FROM public.startups s
  LEFT JOIN public.startup_stats_totals t ON t.startup_id = s.id
  WHERE s.id = ANY(_ids) AND s.status = 'approved';
$$;

-- Rewrite: last 7 days from daily rollups
CREATE OR REPLACE FUNCTION public.public_startup_daily_v2(_ids uuid[])
RETURNS TABLE(startup_id uuid, day_offset integer, received bigint, given bigint, clicks bigint, clicks_given bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH days AS (SELECT generate_series(0, 6) AS day_offset)
  SELECT
    s.id,
    d.day_offset,
    COALESCE(SUM(sd.impressions_received), 0),
    COALESCE(SUM(sd.impressions_given), 0),
    COALESCE(SUM(sd.clicks_received), 0),
    COALESCE(SUM(sd.clicks_given), 0)
  FROM public.startups s
  CROSS JOIN days d
  LEFT JOIN public.startup_stats_daily sd
    ON sd.startup_id = s.id
   AND sd.date = (now() AT TIME ZONE 'UTC')::date - d.day_offset
  WHERE s.id = ANY(_ids) AND s.status = 'approved'
  GROUP BY s.id, d.day_offset;
$$;

-- Rewrite: last 12 months from daily rollups
CREATE OR REPLACE FUNCTION public.public_startup_monthly(_ids uuid[])
RETURNS TABLE(startup_id uuid, month_offset integer, received bigint, given bigint, clicks bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH d AS (SELECT date_trunc('month', now()) - interval '11 months' AS ms),
  imp AS (
    SELECT sd.startup_id AS sid,
      ((extract(year FROM now())::int * 12 + extract(month FROM now())::int)
        - (extract(year FROM sd.date)::int * 12 + extract(month FROM sd.date)::int)) AS mo,
      SUM(sd.impressions_received) AS c
    FROM public.startup_stats_daily sd, d
    WHERE sd.date >= d.ms
      AND sd.startup_id = ANY(_ids)
    GROUP BY 1, 2
  ),
  giv AS (
    SELECT sd.startup_id AS sid,
      ((extract(year FROM now())::int * 12 + extract(month FROM now())::int)
        - (extract(year FROM sd.date)::int * 12 + extract(month FROM sd.date)::int)) AS mo,
      SUM(sd.impressions_given) AS c
    FROM public.startup_stats_daily sd, d
    WHERE sd.date >= d.ms
      AND sd.startup_id = ANY(_ids)
    GROUP BY 1, 2
  ),
  clk AS (
    SELECT sd.startup_id AS sid,
      ((extract(year FROM now())::int * 12 + extract(month FROM now())::int)
        - (extract(year FROM sd.date)::int * 12 + extract(month FROM sd.date)::int)) AS mo,
      SUM(sd.clicks_received) AS c
    FROM public.startup_stats_daily sd, d
    WHERE sd.date >= d.ms
      AND sd.startup_id = ANY(_ids)
    GROUP BY 1, 2
  )
  SELECT s.id, m.mo,
    COALESCE(imp.c, 0), COALESCE(giv.c, 0), COALESCE(clk.c, 0)
  FROM public.startups s
  CROSS JOIN generate_series(0, 11) AS m(mo)
  LEFT JOIN imp ON imp.sid = s.id AND imp.mo = m.mo
  LEFT JOIN giv ON giv.sid = s.id AND giv.mo = m.mo
  LEFT JOIN clk ON clk.sid = s.id AND clk.mo = m.mo
  WHERE s.id = ANY(_ids) AND s.status = 'approved';
$$;

-- Rewrite: 24h now uses today + yesterday daily rollups (close enough for "recently active" sorting)
CREATE OR REPLACE FUNCTION public.public_startup_24h(_ids uuid[])
RETURNS TABLE(startup_id uuid, impressions_24h bigint, clicks_24h bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    s.id,
    COALESCE(SUM(sd.impressions_received) FILTER (WHERE sd.date IN ((now() AT TIME ZONE 'UTC')::date, (now() AT TIME ZONE 'UTC')::date - 1)), 0),
    COALESCE(SUM(sd.clicks_received) FILTER (WHERE sd.date IN ((now() AT TIME ZONE 'UTC')::date, (now() AT TIME ZONE 'UTC')::date - 1)), 0)
  FROM public.startups s
  LEFT JOIN public.startup_stats_daily sd ON sd.startup_id = s.id
  WHERE s.id = ANY(_ids) AND s.status = 'approved'
  GROUP BY s.id;
$$;

-- Rewrite: network today/yesterday from daily rollups
CREATE OR REPLACE FUNCTION public.public_network_activity()
RETURNS TABLE(today_impressions bigint, today_clicks bigint, yesterday_impressions bigint, yesterday_clicks bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE((SELECT impressions FROM public.network_stats_daily WHERE date = (now() AT TIME ZONE 'UTC')::date), 0),
    COALESCE((SELECT clicks FROM public.network_stats_daily WHERE date = (now() AT TIME ZONE 'UTC')::date), 0),
    COALESCE((SELECT impressions FROM public.network_stats_daily WHERE date = (now() AT TIME ZONE 'UTC')::date - 1), 0),
    COALESCE((SELECT clicks FROM public.network_stats_daily WHERE date = (now() AT TIME ZONE 'UTC')::date - 1), 0);
$$;

-- Rewrite: all-time network totals from startup totals
CREATE OR REPLACE FUNCTION public.public_network_totals_all()
RETURNS TABLE(total_impressions bigint, total_clicks bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(SUM(t.impressions_received), 0),
    COALESCE(SUM(t.clicks_received), 0)
  FROM public.startup_stats_totals t;
$$;

-- Rewrite: widget weighting from daily rollups (last 7 days)
CREATE OR REPLACE FUNCTION public.widget_pick_weights()
RETURNS TABLE(startup_id uuid, weight double precision)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH given AS (
    SELECT s.id, COALESCE(SUM(sd.impressions_given), 0)::double precision AS g
    FROM public.startups s
    LEFT JOIN public.startup_stats_daily sd
      ON sd.startup_id = s.id
     AND sd.date > (now() AT TIME ZONE 'UTC')::date - interval '7 days'
    WHERE s.status = 'approved'
    GROUP BY s.id
  ),
  avg_g AS (
    SELECT GREATEST(AVG(g), 1.0) AS a FROM given
  )
  SELECT given.id,
         LEAST(4.0, GREATEST(1.0, 1.0 + (given.g / avg_g.a)))
  FROM given, avg_g;
$$;

-- Rewrite: rank from totals table
CREATE OR REPLACE FUNCTION public.get_startup_rank(_startup_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH me AS (
    SELECT COALESCE(impressions_received, 0) AS my_count
    FROM public.startup_stats_totals
    WHERE startup_id = _startup_id
  )
  SELECT (SELECT COUNT(*) FROM public.startup_stats_totals t, me
          WHERE t.impressions_received > me.my_count)::int + 1;
$$;

-- New: dashboard summary (stats, rank, 7-day chart)
CREATE OR REPLACE FUNCTION public.public_startup_dashboard_summary(_startup_id uuid)
RETURNS TABLE(impressions bigint, clicks bigint, rank integer, daily_impressions bigint[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(t.impressions_received, 0),
    COALESCE(t.clicks_received, 0),
    (SELECT COUNT(*)::int + 1
     FROM public.startup_stats_totals t2
     WHERE t2.impressions_received > COALESCE(t.impressions_received, 0)),
    ARRAY(
      SELECT COALESCE(SUM(sd.impressions_received), 0)
      FROM generate_series(6, 0, -1) AS days_ago(d)
      LEFT JOIN public.startup_stats_daily sd
        ON sd.startup_id = _startup_id
       AND sd.date = (now() AT TIME ZONE 'UTC')::date - days_ago.d
      GROUP BY days_ago.d
      ORDER BY days_ago.d
    )
  FROM public.startup_stats_totals t
  WHERE t.startup_id = _startup_id;
$$;

-- New: range data with pre-bucketed chart points
CREATE OR REPLACE FUNCTION public.public_startup_range_data(_startup_id uuid, _range text)
RETURNS TABLE(impressions bigint, clicks bigint, chart_data bigint[], labels text[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH today_raw AS (
    SELECT extract(hour FROM created_at)::int AS h, COUNT(*) AS c
    FROM public.impressions
    WHERE shown_startup_id = _startup_id
      AND referrer IS DISTINCT FROM 'dev-simulate'
      AND created_at >= date_trunc('day', now())
    GROUP BY h
  )
  SELECT
    CASE
      WHEN _range = '24h' THEN
        COALESCE((SELECT SUM(c) FROM today_raw), 0)
      WHEN _range = '7d' THEN
        COALESCE((SELECT SUM(impressions_received) FROM public.startup_stats_daily
                  WHERE startup_id = _startup_id AND date > (now() AT TIME ZONE 'UTC')::date - 7), 0)
      WHEN _range = '30d' THEN
        COALESCE((SELECT SUM(impressions_received) FROM public.startup_stats_daily
                  WHERE startup_id = _startup_id AND date > (now() AT TIME ZONE 'UTC')::date - 30), 0)
      ELSE
        COALESCE((SELECT impressions_received FROM public.startup_stats_totals WHERE startup_id = _startup_id), 0)
    END,
    CASE
      WHEN _range = '24h' THEN
        COALESCE((SELECT COUNT(*) FROM public.clicks
                  WHERE shown_startup_id = _startup_id AND created_at >= now() - interval '24 hours'), 0)
      WHEN _range = '7d' THEN
        COALESCE((SELECT SUM(clicks_received) FROM public.startup_stats_daily
                  WHERE startup_id = _startup_id AND date > (now() AT TIME ZONE 'UTC')::date - 7), 0)
      WHEN _range = '30d' THEN
        COALESCE((SELECT SUM(clicks_received) FROM public.startup_stats_daily
                  WHERE startup_id = _startup_id AND date > (now() AT TIME ZONE 'UTC')::date - 30), 0)
      ELSE
        COALESCE((SELECT clicks_received FROM public.startup_stats_totals WHERE startup_id = _startup_id), 0)
    END,
    CASE
      WHEN _range = '24h' THEN
        (SELECT ARRAY(
          SELECT COALESCE(SUM(c), 0)
          FROM generate_series(0, 11) AS slot(s)
          LEFT JOIN today_raw ON today_raw.h >= slot.s * 2 AND today_raw.h < (slot.s + 1) * 2
          GROUP BY slot.s
          ORDER BY slot.s
        ))
      WHEN _range = '7d' THEN
        (SELECT ARRAY(
          SELECT COALESCE(SUM(impressions_received), 0)
          FROM generate_series(6, 0, -1) AS day_ago(d)
          LEFT JOIN public.startup_stats_daily sd
            ON sd.startup_id = _startup_id
           AND sd.date = (now() AT TIME ZONE 'UTC')::date - day_ago.d
          GROUP BY day_ago.d
          ORDER BY day_ago.d
        ))
      WHEN _range = '30d' THEN
        (SELECT ARRAY(
          SELECT COALESCE(SUM(impressions_received), 0)
          FROM generate_series(29, 0, -1) AS day_ago(d)
          LEFT JOIN public.startup_stats_daily sd
            ON sd.startup_id = _startup_id
           AND sd.date = (now() AT TIME ZONE 'UTC')::date - day_ago.d
          GROUP BY day_ago.d
          ORDER BY day_ago.d
        ))
      ELSE
        (SELECT ARRAY(
          SELECT COALESCE(SUM(impressions_received), 0)
          FROM generate_series(11, 0, -1) AS month_ago(m)
          LEFT JOIN public.startup_stats_daily sd
            ON sd.startup_id = _startup_id
           AND sd.date >= date_trunc('month', now()) - (month_ago.m || ' months')::interval
           AND sd.date < date_trunc('month', now()) - ((month_ago.m - 1) || ' months')::interval
          GROUP BY month_ago.m
          ORDER BY month_ago.m
        ))
    END,
    CASE
      WHEN _range = '24h' THEN
        (SELECT ARRAY(
          SELECT CASE WHEN slot.s % 3 = 0 THEN to_char(date_trunc('day', now()) + (slot.s * 2 || ' hours')::interval, 'HH24:00') ELSE '' END
          FROM generate_series(0, 11) AS slot(s)
          ORDER BY slot.s
        ))
      WHEN _range = '7d' THEN
        ARRAY['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
      WHEN _range = '30d' THEN
        (SELECT ARRAY(
          SELECT CASE WHEN day_ago.d % 5 = 0 OR day_ago.d = 29 THEN to_char((now() AT TIME ZONE 'UTC')::date - day_ago.d, 'DD') ELSE '' END
          FROM generate_series(29, 0, -1) AS day_ago(d)
          ORDER BY day_ago.d
        ))
      ELSE
        (SELECT ARRAY(
          SELECT to_char(date_trunc('month', now()) - (month_ago.m || ' months')::interval, 'Mon')
          FROM generate_series(11, 0, -1) AS month_ago(m)
          ORDER BY month_ago.m
        ))
    END;
$$;

-- New: traffic breakdown aggregated server-side
CREATE OR REPLACE FUNCTION public.public_startup_traffic_breakdown(_startup_id uuid)
RETURNS TABLE(countries jsonb, devices jsonb, top_referrers jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('country', country, 'count', cnt) ORDER BY cnt DESC)
      FROM (
        SELECT COALESCE(country, 'Unknown') AS country, COUNT(*) AS cnt
        FROM public.impressions
        WHERE shown_startup_id = _startup_id AND referrer IS DISTINCT FROM 'dev-simulate'
        GROUP BY country
        ORDER BY cnt DESC
        LIMIT 5
      ) sub
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('device', device, 'count', cnt) ORDER BY cnt DESC)
      FROM (
        SELECT COALESCE(device, 'unknown') AS device, COUNT(*) AS cnt
        FROM public.impressions
        WHERE shown_startup_id = _startup_id AND referrer IS DISTINCT FROM 'dev-simulate'
        GROUP BY device
        ORDER BY cnt DESC
      ) sub
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'website_url', s.website_url, 'impressions', cnt) ORDER BY cnt DESC)
      FROM (
        SELECT i.host_startup_id AS sid, COUNT(*) AS cnt
        FROM public.impressions i
        WHERE i.shown_startup_id = _startup_id
          AND i.host_startup_id IS NOT NULL
          AND i.referrer IS DISTINCT FROM 'dev-simulate'
          AND i.created_at >= now() - interval '24 hours'
        GROUP BY i.host_startup_id
        ORDER BY cnt DESC
        LIMIT 5
      ) sub
      JOIN public.startups s ON s.id = sub.sid
    ), '[]'::jsonb);
$$;