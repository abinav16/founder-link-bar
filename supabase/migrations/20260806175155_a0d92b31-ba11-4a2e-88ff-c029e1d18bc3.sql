CREATE INDEX IF NOT EXISTS impressions_shown_created_idx ON public.impressions (shown_startup_id, created_at);
CREATE INDEX IF NOT EXISTS impressions_host_created_idx ON public.impressions (host_startup_id, created_at);
CREATE INDEX IF NOT EXISTS clicks_shown_created_idx ON public.clicks (shown_startup_id, created_at);

CREATE OR REPLACE FUNCTION public.public_startup_hourly(_ids uuid[])
RETURNS TABLE(startup_id uuid, hour_offset integer, received bigint, given bigint, clicks bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH d AS (SELECT date_trunc('day', now()) AS ds),
  imp AS (
    SELECT i.shown_startup_id AS sid, extract(hour FROM i.created_at)::int AS h, count(*) AS c
    FROM public.impressions i, d
    WHERE i.created_at >= d.ds AND i.referrer IS DISTINCT FROM 'dev-simulate'
      AND i.shown_startup_id = ANY(_ids)
    GROUP BY 1,2
  ),
  giv AS (
    SELECT i.host_startup_id AS sid, extract(hour FROM i.created_at)::int AS h, count(*) AS c
    FROM public.impressions i, d
    WHERE i.created_at >= d.ds AND i.referrer IS DISTINCT FROM 'dev-simulate'
      AND i.host_startup_id = ANY(_ids)
    GROUP BY 1,2
  ),
  clk AS (
    SELECT c2.shown_startup_id AS sid, extract(hour FROM c2.created_at)::int AS h, count(*) AS c
    FROM public.clicks c2, d
    WHERE c2.created_at >= d.ds AND c2.shown_startup_id = ANY(_ids)
    GROUP BY 1,2
  )
  SELECT s.id, hrs.h,
    COALESCE(imp.c, 0), COALESCE(giv.c, 0), COALESCE(clk.c, 0)
  FROM public.startups s
  CROSS JOIN generate_series(0,23) AS hrs(h)
  LEFT JOIN imp ON imp.sid = s.id AND imp.h = hrs.h
  LEFT JOIN giv ON giv.sid = s.id AND giv.h = hrs.h
  LEFT JOIN clk ON clk.sid = s.id AND clk.h = hrs.h
  WHERE s.id = ANY(_ids) AND s.status = 'approved';
$function$;

CREATE OR REPLACE FUNCTION public.public_startup_monthly(_ids uuid[])
RETURNS TABLE(startup_id uuid, month_offset integer, received bigint, given bigint, clicks bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH d AS (SELECT date_trunc('month', now()) - interval '11 months' AS ms),
  imp AS (
    SELECT i.shown_startup_id AS sid,
      (extract(year FROM now())::int * 12 + extract(month FROM now())::int)
        - (extract(year FROM i.created_at)::int * 12 + extract(month FROM i.created_at)::int) AS mo,
      count(*) AS c
    FROM public.impressions i, d
    WHERE i.created_at >= d.ms AND i.referrer IS DISTINCT FROM 'dev-simulate'
      AND i.shown_startup_id = ANY(_ids)
    GROUP BY 1,2
  ),
  giv AS (
    SELECT i.host_startup_id AS sid,
      (extract(year FROM now())::int * 12 + extract(month FROM now())::int)
        - (extract(year FROM i.created_at)::int * 12 + extract(month FROM i.created_at)::int) AS mo,
      count(*) AS c
    FROM public.impressions i, d
    WHERE i.created_at >= d.ms AND i.referrer IS DISTINCT FROM 'dev-simulate'
      AND i.host_startup_id = ANY(_ids)
    GROUP BY 1,2
  ),
  clk AS (
    SELECT c2.shown_startup_id AS sid,
      (extract(year FROM now())::int * 12 + extract(month FROM now())::int)
        - (extract(year FROM c2.created_at)::int * 12 + extract(month FROM c2.created_at)::int) AS mo,
      count(*) AS c
    FROM public.clicks c2, d
    WHERE c2.created_at >= d.ms AND c2.shown_startup_id = ANY(_ids)
    GROUP BY 1,2
  )
  SELECT s.id, m.mo,
    COALESCE(imp.c, 0), COALESCE(giv.c, 0), COALESCE(clk.c, 0)
  FROM public.startups s
  CROSS JOIN generate_series(0,11) AS m(mo)
  LEFT JOIN imp ON imp.sid = s.id AND imp.mo = m.mo
  LEFT JOIN giv ON giv.sid = s.id AND giv.mo = m.mo
  LEFT JOIN clk ON clk.sid = s.id AND clk.mo = m.mo
  WHERE s.id = ANY(_ids) AND s.status = 'approved';
$function$;