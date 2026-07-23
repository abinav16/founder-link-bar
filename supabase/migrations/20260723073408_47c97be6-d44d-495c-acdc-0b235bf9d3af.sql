
-- Add per-startup detail page columns
ALTER TABLE public.startups
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS founder_name text,
  ADD COLUMN IF NOT EXISTS founder_quote text,
  ADD COLUMN IF NOT EXISTS founder_avatar_url text,
  ADD COLUMN IF NOT EXISTS iframe_blocked boolean;

-- Backfill slugs from name; ensure uniqueness with suffix
DO $$
DECLARE
  r record;
  base text;
  cand text;
  n int;
BEGIN
  FOR r IN SELECT id, name FROM public.startups WHERE slug IS NULL LOOP
    base := lower(regexp_replace(regexp_replace(coalesce(r.name,'startup'), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'));
    IF base = '' THEN base := 'startup'; END IF;
    cand := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM public.startups WHERE slug = cand) LOOP
      n := n + 1;
      cand := base || '-' || n;
    END LOOP;
    UPDATE public.startups SET slug = cand WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.startups ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS startups_slug_key ON public.startups(slug);

-- RPC: top referring startups over last 24h for a given startup
CREATE OR REPLACE FUNCTION public.public_startup_referrers(_startup_id uuid)
RETURNS TABLE(startup_id uuid, name text, slug text, logo_url text, website_url text, cnt bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.name, s.slug, s.logo_url, s.website_url, count(*)::bigint AS cnt
  FROM public.impressions i
  JOIN public.startups s ON s.id = i.host_startup_id
  WHERE i.shown_startup_id = _startup_id
    AND i.referrer IS DISTINCT FROM 'dev-simulate'
    AND i.created_at >= now() - interval '24 hours'
    AND s.status = 'approved'
    AND s.id <> _startup_id
  GROUP BY s.id, s.name, s.slug, s.logo_url, s.website_url
  ORDER BY cnt DESC
  LIMIT 3;
$$;

-- RPC: recent landings count for a startup in last 5 minutes (live pulse)
CREATE OR REPLACE FUNCTION public.public_startup_pulse(_startup_id uuid)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT count(*)::bigint FROM public.clicks
  WHERE shown_startup_id = _startup_id
    AND created_at >= now() - interval '5 minutes';
$$;

GRANT EXECUTE ON FUNCTION public.public_startup_referrers(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_startup_pulse(uuid) TO anon, authenticated, service_role;
