-- Rebuild per-startup lifetime totals from raw data
TRUNCATE public.startup_stats_totals;
INSERT INTO public.startup_stats_totals (startup_id, impressions_received, impressions_given, clicks_received, clicks_given)
SELECT s.id,
  COALESCE((SELECT count(*) FROM public.impressions i WHERE i.shown_startup_id = s.id AND i.referrer IS DISTINCT FROM 'dev-simulate'),0),
  COALESCE((SELECT count(*) FROM public.impressions i WHERE i.host_startup_id = s.id AND i.referrer IS DISTINCT FROM 'dev-simulate'),0),
  COALESCE((SELECT count(*) FROM public.clicks c WHERE c.shown_startup_id = s.id),0),
  COALESCE((SELECT count(*) FROM public.clicks c WHERE c.host_startup_id = s.id),0)
FROM public.startups s;

-- Rebuild per-startup daily rollups
TRUNCATE public.startup_stats_daily;
INSERT INTO public.startup_stats_daily (startup_id, date, impressions_received, impressions_given, clicks_received, clicks_given)
SELECT startup_id, date, sum(ir), sum(ig), sum(cr), sum(cg) FROM (
  SELECT shown_startup_id AS startup_id, (created_at AT TIME ZONE 'UTC')::date AS date, count(*) ir, 0 ig, 0 cr, 0 cg
  FROM public.impressions WHERE shown_startup_id IS NOT NULL AND referrer IS DISTINCT FROM 'dev-simulate' GROUP BY 1,2
  UNION ALL
  SELECT host_startup_id, (created_at AT TIME ZONE 'UTC')::date, 0, count(*), 0, 0
  FROM public.impressions WHERE host_startup_id IS NOT NULL AND referrer IS DISTINCT FROM 'dev-simulate' GROUP BY 1,2
  UNION ALL
  SELECT shown_startup_id, (created_at AT TIME ZONE 'UTC')::date, 0, 0, count(*), 0
  FROM public.clicks WHERE shown_startup_id IS NOT NULL GROUP BY 1,2
  UNION ALL
  SELECT host_startup_id, (created_at AT TIME ZONE 'UTC')::date, 0, 0, 0, count(*)
  FROM public.clicks WHERE host_startup_id IS NOT NULL GROUP BY 1,2
) x GROUP BY startup_id, date;

-- Rebuild network daily rollups (includes traffic whose startup was removed)
TRUNCATE public.network_stats_daily;
INSERT INTO public.network_stats_daily (date, impressions, clicks)
SELECT date, sum(imp), sum(clk) FROM (
  SELECT (created_at AT TIME ZONE 'UTC')::date AS date, count(*) imp, 0 clk
  FROM public.impressions WHERE referrer IS DISTINCT FROM 'dev-simulate' GROUP BY 1
  UNION ALL
  SELECT (created_at AT TIME ZONE 'UTC')::date, 0, count(*) FROM public.clicks GROUP BY 1
) y GROUP BY date;

-- Network totals must include removed startups' historical traffic
CREATE OR REPLACE FUNCTION public.public_network_totals_all()
RETURNS TABLE(total_impressions bigint, total_clicks bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(n.impressions), 0)::bigint, COALESCE(SUM(n.clicks), 0)::bigint
  FROM public.network_stats_daily n;
$function$;