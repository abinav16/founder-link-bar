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
          SELECT to_char(now() - ((11 - slot.s) * 2 || ' hours')::interval, 'HH24:00')
          FROM generate_series(0, 11) AS slot(s)
          ORDER BY slot.s
        ))
      WHEN _range = '7d' THEN
        (SELECT ARRAY(
          SELECT to_char((now() AT TIME ZONE 'UTC')::date - day_ago.d, 'Dy')
          FROM generate_series(6, 0, -1) AS day_ago(d)
          ORDER BY day_ago.d
        ))
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