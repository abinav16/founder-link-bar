CREATE OR REPLACE FUNCTION public.dashboard_host_shown_7d(_host uuid)
RETURNS TABLE(startup_id uuid, name text, description text, website_url text, logo_url text, appearance_count bigint, last_shown_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.name,
    s.description,
    s.website_url,
    s.logo_url,
    count(*)::bigint AS appearance_count,
    max(i.created_at) AS last_shown_at
  FROM public.impressions i
  JOIN public.startups s ON s.id = i.shown_startup_id
  WHERE i.host_startup_id = _host
    AND i.created_at >= now() - interval '7 days'
    AND EXISTS (
      SELECT 1
      FROM public.startups owned
      WHERE owned.id = _host
        AND owned.user_id = auth.uid()
    )
  GROUP BY s.id, s.name, s.description, s.website_url, s.logo_url
  ORDER BY max(i.created_at) DESC;
$$;

CREATE OR REPLACE FUNCTION public.dashboard_startup_hosts_7d(_startup uuid)
RETURNS TABLE(host_id uuid, name text, slug text, website_url text, logo_url text, appearance_count bigint, last_shown_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.name,
    s.slug,
    s.website_url,
    s.logo_url,
    count(*)::bigint AS appearance_count,
    max(i.created_at) AS last_shown_at
  FROM public.impressions i
  JOIN public.startups s ON s.id = i.host_startup_id
  WHERE i.shown_startup_id = _startup
    AND i.created_at >= now() - interval '7 days'
    AND EXISTS (
      SELECT 1
      FROM public.startups owned
      WHERE owned.id = _startup
        AND owned.user_id = auth.uid()
    )
  GROUP BY s.id, s.name, s.slug, s.website_url, s.logo_url
  ORDER BY max(i.created_at) DESC;
$$;

REVOKE ALL ON FUNCTION public.dashboard_host_shown_7d(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dashboard_startup_hosts_7d(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_host_shown_7d(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_startup_hosts_7d(uuid) TO authenticated;