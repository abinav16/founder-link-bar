CREATE OR REPLACE FUNCTION public.public_host_recent_shown(_host uuid, _limit integer DEFAULT 8)
RETURNS TABLE(startup_id uuid, name text, description text, website_url text, logo_url text, last_shown_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH recent AS (
    SELECT i.shown_startup_id, max(i.created_at) AS last_shown_at
    FROM public.impressions i
    WHERE i.host_startup_id = _host
      AND i.created_at > now() - interval '7 days'
      AND i.shown_startup_id IS NOT NULL
    GROUP BY i.shown_startup_id
    ORDER BY max(i.created_at) DESC
    LIMIT LEAST(GREATEST(COALESCE(_limit, 8), 1), 20)
  )
  SELECT s.id, s.name, s.description, s.website_url, s.logo_url, r.last_shown_at
  FROM recent r
  JOIN public.startups s ON s.id = r.shown_startup_id
  ORDER BY r.last_shown_at DESC
$$;

CREATE OR REPLACE FUNCTION public.public_startup_recent_hosts(_startup uuid, _limit integer DEFAULT 8)
RETURNS TABLE(host_id uuid, name text, slug text, website_url text, logo_url text, last_shown_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH recent AS (
    SELECT i.host_startup_id, max(i.created_at) AS last_shown_at
    FROM public.impressions i
    WHERE i.shown_startup_id = _startup
      AND i.created_at > now() - interval '7 days'
      AND i.host_startup_id IS NOT NULL
    GROUP BY i.host_startup_id
    ORDER BY max(i.created_at) DESC
    LIMIT LEAST(GREATEST(COALESCE(_limit, 8), 1), 20)
  )
  SELECT s.id, s.name, s.slug, s.website_url, s.logo_url, r.last_shown_at
  FROM recent r
  JOIN public.startups s ON s.id = r.host_startup_id
  ORDER BY r.last_shown_at DESC
$$;

REVOKE ALL ON FUNCTION public.public_host_recent_shown(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_startup_recent_hosts(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_host_recent_shown(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_startup_recent_hosts(uuid, integer) TO authenticated;