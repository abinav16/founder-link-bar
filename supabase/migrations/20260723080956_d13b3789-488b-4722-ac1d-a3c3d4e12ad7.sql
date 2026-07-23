DROP FUNCTION IF EXISTS public.public_startup_totals(uuid[]);

CREATE OR REPLACE FUNCTION public.public_startup_totals(_ids uuid[])
 RETURNS TABLE(startup_id uuid, impressions bigint, clicks bigint, impressions_given bigint, clicks_given bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id,
    COALESCE((SELECT count(*) FROM public.impressions i WHERE i.shown_startup_id = s.id AND i.referrer IS DISTINCT FROM 'dev-simulate'), 0),
    COALESCE((SELECT count(*) FROM public.clicks c WHERE c.shown_startup_id = s.id), 0),
    COALESCE((SELECT count(*) FROM public.impressions i WHERE i.host_startup_id = s.id AND i.referrer IS DISTINCT FROM 'dev-simulate'), 0),
    COALESCE((SELECT count(*) FROM public.clicks c WHERE c.host_startup_id = s.id), 0)
  FROM public.startups s
  WHERE s.id = ANY(_ids) AND s.status = 'approved';
$function$