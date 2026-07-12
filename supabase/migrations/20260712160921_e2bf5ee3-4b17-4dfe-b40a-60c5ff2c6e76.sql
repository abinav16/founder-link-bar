
ALTER TABLE public.impressions DROP CONSTRAINT IF EXISTS impressions_shown_startup_id_fkey;
ALTER TABLE public.impressions ADD CONSTRAINT impressions_shown_startup_id_fkey
  FOREIGN KEY (shown_startup_id) REFERENCES public.startups(id) ON DELETE SET NULL;

ALTER TABLE public.clicks DROP CONSTRAINT IF EXISTS clicks_shown_startup_id_fkey;
ALTER TABLE public.clicks ADD CONSTRAINT clicks_shown_startup_id_fkey
  FOREIGN KEY (shown_startup_id) REFERENCES public.startups(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.public_network_totals_all()
 RETURNS TABLE(total_impressions bigint, total_clicks bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    (SELECT count(*) FROM public.impressions i
       WHERE i.shown_startup_id IS DISTINCT FROM '0d2db708-f4e9-4b77-bd83-c446826c76b1'::uuid),
    (SELECT count(*) FROM public.clicks c
       WHERE c.shown_startup_id IS DISTINCT FROM '0d2db708-f4e9-4b77-bd83-c446826c76b1'::uuid);
$function$;
