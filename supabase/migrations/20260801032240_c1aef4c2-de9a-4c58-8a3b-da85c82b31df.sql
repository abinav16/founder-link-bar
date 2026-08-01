CREATE OR REPLACE FUNCTION public.public_startup_24h(_ids uuid[])
 RETURNS TABLE(startup_id uuid, impressions_24h bigint, clicks_24h bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id,
    COALESCE((SELECT count(*) FROM public.impressions i
      WHERE i.shown_startup_id = s.id
        AND i.referrer IS DISTINCT FROM 'dev-simulate'
        AND i.created_at >= now() - interval '24 hours'), 0),
    COALESCE((SELECT count(*) FROM public.clicks c
      WHERE c.shown_startup_id = s.id
        AND c.created_at >= now() - interval '24 hours'), 0)
  FROM public.startups s
  WHERE s.id = ANY(_ids) AND s.status = 'approved';
$function$;