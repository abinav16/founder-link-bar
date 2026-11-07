DROP FUNCTION IF EXISTS public.public_featured_slots();

CREATE FUNCTION public.public_featured_slots()
 RETURNS TABLE(slot_index integer, startup_id uuid, name text, slug text, website_url text, logo_url text, description text, founder_name text, founder_avatar_url text, twitter_handle text, expires_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH legacy AS (
    SELECT f.slot_index, f.startup_id, f.expires_at
    FROM public.featured_slots f
    JOIN public.startups s ON s.id = f.startup_id
    WHERE f.status = 'active' AND f.expires_at > now() AND s.status = 'approved'
  ),
  boosts AS (
    SELECT b.startup_id, min(b.created_at) AS first_at
    FROM public.click_boosts b
    JOIN public.startups s ON s.id = b.startup_id
    WHERE b.status IN ('paid', 'active')
      AND b.clicks_delivered < b.clicks_purchased
      AND s.status = 'approved'
      AND b.startup_id NOT IN (SELECT l.startup_id FROM legacy l)
    GROUP BY b.startup_id
  ),
  free_slots AS (
    SELECT g AS slot_index, row_number() OVER (ORDER BY g) AS rn
    FROM generate_series(1, 8) g
    WHERE g NOT IN (SELECT l.slot_index FROM legacy l)
  ),
  ranked AS (
    SELECT bo.startup_id, row_number() OVER (ORDER BY bo.first_at) AS rn FROM boosts bo
  ),
  combined AS (
    SELECT l.slot_index, l.startup_id, l.expires_at FROM legacy l
    UNION ALL
    SELECT fs.slot_index::int, r.startup_id, NULL::timestamptz
    FROM ranked r JOIN free_slots fs ON fs.rn = r.rn
  )
  SELECT c.slot_index, s.id, s.name, s.slug, s.website_url, s.logo_url,
         s.description,
         COALESCE(NULLIF(s.founder_name, ''), p.full_name),
         COALESCE(NULLIF(s.founder_avatar_url, ''), p.avatar_url),
         NULLIF(TRIM(p.twitter_handle), ''),
         c.expires_at
  FROM combined c
  JOIN public.startups s ON s.id = c.startup_id
  LEFT JOIN public.profiles p ON p.id = s.user_id
  ORDER BY c.slot_index;
$function$;

REVOKE ALL ON FUNCTION public.public_featured_slots() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_featured_slots() TO anon, authenticated, service_role;