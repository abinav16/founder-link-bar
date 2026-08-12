DROP FUNCTION IF EXISTS public.public_featured_slots();

CREATE FUNCTION public.public_featured_slots()
RETURNS TABLE(
  slot_index int,
  startup_id uuid,
  name text,
  slug text,
  website_url text,
  logo_url text,
  description text,
  founder_name text,
  founder_avatar_url text,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.slot_index, s.id, s.name, s.slug, s.website_url, s.logo_url,
         s.description,
         COALESCE(NULLIF(s.founder_name, ''), p.full_name) AS founder_name,
         COALESCE(NULLIF(s.founder_avatar_url, ''), p.avatar_url) AS founder_avatar_url,
         f.expires_at
  FROM public.featured_slots f
  JOIN public.startups s ON s.id = f.startup_id
  LEFT JOIN public.profiles p ON p.id = s.user_id
  WHERE f.status = 'active'
    AND f.expires_at > now()
    AND s.status = 'approved'
  ORDER BY f.slot_index;
$$;

REVOKE ALL ON FUNCTION public.public_featured_slots() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_featured_slots() TO anon, authenticated, service_role;