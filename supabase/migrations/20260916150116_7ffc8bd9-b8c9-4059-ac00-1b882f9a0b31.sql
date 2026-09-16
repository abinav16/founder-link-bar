CREATE TABLE IF NOT EXISTS public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  country text,
  device text,
  os text,
  browser text,
  referrer text,
  path text,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.site_visits TO service_role;

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages site visits"
  ON public.site_visits FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS site_visits_startup_created_idx
  ON public.site_visits (startup_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.my_site_visit_summary(_startup_id uuid, _days integer DEFAULT 30)
RETURNS TABLE(total bigint, countries jsonb, devices jsonb, top_referrers jsonb)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _since timestamptz := now() - make_interval(days => GREATEST(1, LEAST(365, _days)));
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.startups s
    WHERE s.id = _startup_id AND s.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH v AS (
    SELECT * FROM public.site_visits
    WHERE startup_id = _startup_id AND created_at >= _since
  )
  SELECT
    (SELECT count(*) FROM v),
    COALESCE((SELECT jsonb_agg(x) FROM (
      SELECT country AS key, count(*) AS cnt FROM v WHERE country IS NOT NULL
      GROUP BY country ORDER BY count(*) DESC LIMIT 50
    ) x), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(x) FROM (
      SELECT device AS key, count(*) AS cnt FROM v WHERE device IS NOT NULL
      GROUP BY device ORDER BY count(*) DESC LIMIT 10
    ) x), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(x) FROM (
      SELECT referrer AS key, count(*) AS cnt FROM v WHERE referrer IS NOT NULL
      GROUP BY referrer ORDER BY count(*) DESC LIMIT 10
    ) x), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.my_site_visit_summary(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.my_site_visit_summary(uuid, integer) TO authenticated, service_role;