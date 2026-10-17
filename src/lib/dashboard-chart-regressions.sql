-- Run against Cloud using a read-only query. Every passed column must be true.
WITH target AS (
  SELECT startup_id AS id FROM public.startup_stats_totals
  ORDER BY impressions_received DESC LIMIT 3
), ranges AS (
  SELECT t.id, k.range, r.* FROM target t
  CROSS JOIN (VALUES ('7d'), ('30d'), ('all')) k(range)
  CROSS JOIN LATERAL public.public_startup_range_data(t.id, k.range) r
)
SELECT id, range,
  chart_data = ARRAY(
    SELECT COALESCE(SUM(sd.impressions_received), 0)
    FROM generate_series(CASE range WHEN '7d' THEN 6 WHEN '30d' THEN 29 ELSE 11 END, 0, -1) offset_ago(d)
    LEFT JOIN public.startup_stats_daily sd ON sd.startup_id = id AND
      CASE WHEN range = 'all' THEN
        sd.date >= date_trunc('month', now()) - d * interval '1 month'
        AND sd.date < date_trunc('month', now()) - (d - 1) * interval '1 month'
      ELSE sd.date = (now() AT TIME ZONE 'UTC')::date - d END
    GROUP BY d ORDER BY d DESC
  ) AS chronology_passed
FROM ranges;

SELECT r.impressions = (
  SELECT count(*) FROM public.impressions i
  WHERE i.shown_startup_id = t.startup_id
    AND i.referrer IS DISTINCT FROM 'dev-simulate'
    AND i.created_at >= now() - interval '24 hours' AND i.created_at < now()
) AS rolling_24h_passed,
r.chart_data = ARRAY(
  SELECT count(i.id) FROM generate_series(0, 11) slot(s)
  LEFT JOIN public.impressions i ON i.shown_startup_id = t.startup_id
    AND i.referrer IS DISTINCT FROM 'dev-simulate'
    AND i.created_at >= now() - interval '24 hours' + s * interval '2 hours'
    AND i.created_at < now() - interval '24 hours' + (s + 1) * interval '2 hours'
  GROUP BY s ORDER BY s
) AS rolling_buckets_passed
FROM (SELECT startup_id FROM public.startup_stats_totals ORDER BY impressions_received DESC LIMIT 3) t
CROSS JOIN LATERAL public.public_startup_range_data(t.startup_id, '24h') r;