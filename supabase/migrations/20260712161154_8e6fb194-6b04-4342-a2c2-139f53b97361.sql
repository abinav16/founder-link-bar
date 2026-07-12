CREATE OR REPLACE FUNCTION public.public_network_totals_all()
 RETURNS TABLE(total_impressions bigint, total_clicks bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    (SELECT count(*) FROM public.impressions),
    (SELECT count(*) FROM public.clicks);
$function$;