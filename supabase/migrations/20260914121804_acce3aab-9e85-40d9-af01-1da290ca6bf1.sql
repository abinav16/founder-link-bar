DROP FUNCTION IF EXISTS public.public_featured_slots();

CREATE FUNCTION public.public_featured_slots()
 RETURNS TABLE(slot_index integer, startup_id uuid, name text, slug text, website_url text, logo_url text, description text, founder_name text, founder_avatar_url text, twitter_handle text, expires_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT f.slot_index, s.id, s.name, s.slug, s.website_url, s.logo_url,
         s.description,
         COALESCE(NULLIF(s.founder_name, ''), p.full_name) AS founder_name,
         COALESCE(NULLIF(s.founder_avatar_url, ''), p.avatar_url) AS founder_avatar_url,
         NULLIF(TRIM(p.twitter_handle), '') AS twitter_handle,
         f.expires_at
  FROM public.featured_slots f
  JOIN public.startups s ON s.id = f.startup_id
  LEFT JOIN public.profiles p ON p.id = s.user_id
  WHERE f.status = 'active'
    AND f.expires_at > now()
    AND s.status = 'approved'
  ORDER BY f.slot_index;
$function$;