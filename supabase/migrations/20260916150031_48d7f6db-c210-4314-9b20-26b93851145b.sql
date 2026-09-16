ALTER TABLE public.startups
  ADD COLUMN IF NOT EXISTS membership_mode text NOT NULL DEFAULT 'widget',
  ADD COLUMN IF NOT EXISTS supporter_until timestamptz,
  ADD COLUMN IF NOT EXISTS supporter_subscription_id text,
  ADD COLUMN IF NOT EXISTS supporter_cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tracking_last_seen_at timestamptz;

GRANT SELECT (membership_mode, supporter_until) ON public.startups TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_supporter(_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.startups s
    WHERE s.id = _id
      AND s.membership_mode = 'supporter'
      AND s.supporter_until IS NOT NULL
      AND s.supporter_until > now()
  );
$$;

REVOKE ALL ON FUNCTION public.is_supporter(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_supporter(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.widget_pick_weights()
RETURNS TABLE(startup_id uuid, weight double precision)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH given AS (
    SELECT s.id,
           (s.membership_mode = 'supporter'
             AND s.supporter_until IS NOT NULL
             AND s.supporter_until > now()) AS supporter,
           COALESCE(SUM(sd.impressions_given), 0)::double precision AS g
    FROM public.startups s
    LEFT JOIN public.startup_stats_daily sd
      ON sd.startup_id = s.id
     AND sd.date > (now() AT TIME ZONE 'UTC')::date - interval '7 days'
    WHERE s.status = 'approved'
    GROUP BY s.id, s.membership_mode, s.supporter_until
  ),
  avg_g AS (
    SELECT GREATEST(AVG(g) FILTER (WHERE NOT supporter), 1.0) AS a FROM given
  )
  SELECT given.id,
         CASE WHEN given.supporter THEN 2.0
              ELSE LEAST(4.0, GREATEST(1.0, 1.0 + (given.g / avg_g.a)))
         END
  FROM given, avg_g;
$function$;