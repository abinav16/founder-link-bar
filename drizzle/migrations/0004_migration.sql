CREATE OR REPLACE FUNCTION public.digest_impression_counts(_since timestamp with time zone)
 RETURNS TABLE(shown_startup_id uuid, cnt bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT startup_id, sum(impressions_received)::bigint
  FROM startup_stats_daily
  WHERE date >= (_since AT TIME ZONE 'UTC')::date
  GROUP BY startup_id;
$$;