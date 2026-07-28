CREATE OR REPLACE FUNCTION public.public_startup_hourly(_ids uuid[])
RETURNS TABLE(startup_id uuid, hour_offset integer, received bigint, given bigint, clicks bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH hours AS (SELECT generate_series(0, 23) AS h),
  base AS (
    SELECT s.id AS startup_id, hrs.h AS hour_offset,
      (date_trunc('day', now()) + (hrs.h || ' hours')::interval) AS h_start,
      (date_trunc('day', now()) + ((hrs.h + 1) || ' hours')::interval) AS h_end
    FROM public.startups s CROSS JOIN hours hrs
    WHERE s.id = ANY(_ids) AND s.status = 'approved'
  )
  SELECT b.startup_id, b.hour_offset,
    COALESCE((SELECT count(*) FROM public.impressions i
      WHERE i.shown_startup_id = b.startup_id
        AND i.referrer IS DISTINCT FROM 'dev-simulate'
        AND i.created_at >= b.h_start AND i.created_at < b.h_end), 0),
    COALESCE((SELECT count(*) FROM public.impressions i
      WHERE i.host_startup_id = b.startup_id
        AND i.referrer IS DISTINCT FROM 'dev-simulate'
        AND i.created_at >= b.h_start AND i.created_at < b.h_end), 0),
    COALESCE((SELECT count(*) FROM public.clicks c
      WHERE c.shown_startup_id = b.startup_id
        AND c.created_at >= b.h_start AND c.created_at < b.h_end), 0)
  FROM base b;
$function$;

CREATE OR REPLACE FUNCTION public.public_startup_daily_v2(_ids uuid[])
RETURNS TABLE(startup_id uuid, day_offset integer, received bigint, given bigint, clicks bigint, clicks_given bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH days AS (SELECT generate_series(0, 6) AS day_offset),
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
        AND i.created_at >= b.day_start AND i.created_at < b.day_end), 0),
    COALESCE((SELECT count(*) FROM public.clicks c
      WHERE c.shown_startup_id = b.startup_id
        AND c.created_at >= b.day_start AND c.created_at < b.day_end), 0),
    COALESCE((SELECT count(*) FROM public.clicks c
      WHERE c.host_startup_id = b.startup_id
        AND c.created_at >= b.day_start AND c.created_at < b.day_end), 0)
  FROM base b;
$function$;

REVOKE ALL ON FUNCTION public.public_startup_hourly(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.public_startup_daily_v2(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_startup_hourly(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.public_startup_daily_v2(uuid[]) TO service_role;