DO $migration$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.public_startup_dashboard_summary(uuid)'::regprocedure) INTO definition;
  definition := replace(definition, 'ORDER BY days_ago.d', 'ORDER BY days_ago.d DESC');
  EXECUTE definition;

  SELECT pg_get_functiondef('public.public_startup_range_data(uuid,text)'::regprocedure) INTO definition;
  definition := replace(definition, 'ORDER BY day_ago.d', 'ORDER BY day_ago.d DESC');
  definition := replace(definition, 'ORDER BY month_ago.m', 'ORDER BY month_ago.m DESC');
  definition := replace(definition, $old$WITH today_raw AS (
    SELECT extract(hour FROM created_at)::int AS h, COUNT(*) AS c
    FROM public.impressions
    WHERE shown_startup_id = _startup_id
      AND referrer IS DISTINCT FROM 'dev-simulate'
      AND created_at >= date_trunc('day', now())
    GROUP BY h
  )$old$, $new$WITH today_raw AS (
    SELECT floor(extract(epoch FROM (created_at - (now() - interval '24 hours'))) / 7200)::int AS h, COUNT(*) AS c
    FROM public.impressions
    WHERE shown_startup_id = _startup_id
      AND referrer IS DISTINCT FROM 'dev-simulate'
      AND created_at >= now() - interval '24 hours'
      AND created_at < now()
    GROUP BY h
  )$new$);
  IF definition LIKE '%created_at >= date_trunc(''day'', now())%' THEN
    RAISE EXCEPTION 'Rolling-window replacement failed';
  END IF;
  definition := replace(definition, 'created_at >= now() - interval ''24 hours''), 0)', 'created_at >= now() - interval ''24 hours'' AND created_at < now()), 0)');
  definition := replace(definition, 'today_raw.h >= slot.s * 2 AND today_raw.h < (slot.s + 1) * 2', 'today_raw.h = slot.s');
  definition := replace(definition, $old$to_char(now() - ((11 - slot.s) * 2 || ' hours')::interval, 'HH24:00')$old$, $new$to_char((now() - interval '24 hours' + slot.s * interval '2 hours') AT TIME ZONE 'UTC', 'HH24:MI')$new$);
  EXECUTE definition;
END;
$migration$;