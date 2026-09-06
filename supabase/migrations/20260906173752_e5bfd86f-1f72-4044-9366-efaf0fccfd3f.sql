-- Rollup tables for fast dashboard/leaderboard/network reads
CREATE TABLE IF NOT EXISTS public.startup_stats_totals (
  startup_id uuid PRIMARY KEY REFERENCES public.startups(id) ON DELETE CASCADE,
  impressions_received bigint NOT NULL DEFAULT 0,
  impressions_given bigint NOT NULL DEFAULT 0,
  clicks_received bigint NOT NULL DEFAULT 0,
  clicks_given bigint NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.startup_stats_daily (
  startup_id uuid REFERENCES public.startups(id) ON DELETE CASCADE,
  date date NOT NULL,
  impressions_received bigint NOT NULL DEFAULT 0,
  impressions_given bigint NOT NULL DEFAULT 0,
  clicks_received bigint NOT NULL DEFAULT 0,
  clicks_given bigint NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (startup_id, date)
);

CREATE TABLE IF NOT EXISTS public.network_stats_daily (
  date date PRIMARY KEY,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Grants and RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.startup_stats_totals TO authenticated;
GRANT ALL ON public.startup_stats_totals TO service_role;
ALTER TABLE public.startup_stats_totals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own startup totals" ON public.startup_stats_totals FOR SELECT TO authenticated USING (startup_id IN (SELECT id FROM public.startups WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.startup_stats_daily TO authenticated;
GRANT ALL ON public.startup_stats_daily TO service_role;
ALTER TABLE public.startup_stats_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own startup daily stats" ON public.startup_stats_daily FOR SELECT TO authenticated USING (startup_id IN (SELECT id FROM public.startups WHERE user_id = auth.uid()));

GRANT SELECT ON public.network_stats_daily TO authenticated;
GRANT ALL ON public.network_stats_daily TO service_role;
ALTER TABLE public.network_stats_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read network daily" ON public.network_stats_daily FOR SELECT TO authenticated USING (true);

-- Extra index for remaining time-range referrer queries
CREATE INDEX IF NOT EXISTS idx_impressions_referrer_created ON public.impressions (referrer, created_at);

-- Backfill lifetime totals
INSERT INTO public.startup_stats_totals (startup_id, impressions_received, impressions_given, clicks_received, clicks_given)
SELECT
  s.id,
  COALESCE(ir.cnt, 0),
  COALESCE(ig.cnt, 0),
  COALESCE(cr.cnt, 0),
  COALESCE(cg.cnt, 0)
FROM public.startups s
LEFT JOIN (SELECT shown_startup_id, COUNT(*) AS cnt FROM public.impressions WHERE referrer IS DISTINCT FROM 'dev-simulate' AND shown_startup_id IS NOT NULL GROUP BY shown_startup_id) ir ON ir.shown_startup_id = s.id
LEFT JOIN (SELECT host_startup_id, COUNT(*) AS cnt FROM public.impressions WHERE referrer IS DISTINCT FROM 'dev-simulate' AND host_startup_id IS NOT NULL GROUP BY host_startup_id) ig ON ig.host_startup_id = s.id
LEFT JOIN (SELECT shown_startup_id, COUNT(*) AS cnt FROM public.clicks WHERE shown_startup_id IS NOT NULL GROUP BY shown_startup_id) cr ON cr.shown_startup_id = s.id
LEFT JOIN (SELECT host_startup_id, COUNT(*) AS cnt FROM public.clicks WHERE host_startup_id IS NOT NULL GROUP BY host_startup_id) cg ON cg.host_startup_id = s.id
WHERE s.status = 'approved'
ON CONFLICT (startup_id) DO UPDATE SET
  impressions_received = EXCLUDED.impressions_received,
  impressions_given = EXCLUDED.impressions_given,
  clicks_received = EXCLUDED.clicks_received,
  clicks_given = EXCLUDED.clicks_given,
  updated_at = now();

-- Backfill daily impressions received
INSERT INTO public.startup_stats_daily (startup_id, date, impressions_received)
SELECT shown_startup_id, (created_at AT TIME ZONE 'UTC')::date, COUNT(*)
FROM public.impressions
WHERE referrer IS DISTINCT FROM 'dev-simulate' AND shown_startup_id IS NOT NULL
GROUP BY shown_startup_id, (created_at AT TIME ZONE 'UTC')::date
ON CONFLICT (startup_id, date) DO UPDATE SET impressions_received = EXCLUDED.impressions_received;

-- Backfill daily impressions given
INSERT INTO public.startup_stats_daily (startup_id, date, impressions_given)
SELECT host_startup_id, (created_at AT TIME ZONE 'UTC')::date, COUNT(*)
FROM public.impressions
WHERE referrer IS DISTINCT FROM 'dev-simulate' AND host_startup_id IS NOT NULL
GROUP BY host_startup_id, (created_at AT TIME ZONE 'UTC')::date
ON CONFLICT (startup_id, date) DO UPDATE SET impressions_given = EXCLUDED.impressions_given;

-- Backfill daily clicks received
INSERT INTO public.startup_stats_daily (startup_id, date, clicks_received)
SELECT shown_startup_id, (created_at AT TIME ZONE 'UTC')::date, COUNT(*)
FROM public.clicks
WHERE shown_startup_id IS NOT NULL
GROUP BY shown_startup_id, (created_at AT TIME ZONE 'UTC')::date
ON CONFLICT (startup_id, date) DO UPDATE SET clicks_received = EXCLUDED.clicks_received;

-- Backfill daily clicks given
INSERT INTO public.startup_stats_daily (startup_id, date, clicks_given)
SELECT host_startup_id, (created_at AT TIME ZONE 'UTC')::date, COUNT(*)
FROM public.clicks
WHERE host_startup_id IS NOT NULL
GROUP BY host_startup_id, (created_at AT TIME ZONE 'UTC')::date
ON CONFLICT (startup_id, date) DO UPDATE SET clicks_given = EXCLUDED.clicks_given;

-- Backfill network daily
INSERT INTO public.network_stats_daily (date, impressions)
SELECT (created_at AT TIME ZONE 'UTC')::date, COUNT(*)
FROM public.impressions
WHERE referrer IS DISTINCT FROM 'dev-simulate'
GROUP BY (created_at AT TIME ZONE 'UTC')::date
ON CONFLICT (date) DO UPDATE SET impressions = EXCLUDED.impressions;

INSERT INTO public.network_stats_daily (date, clicks)
SELECT (created_at AT TIME ZONE 'UTC')::date, COUNT(*)
FROM public.clicks
GROUP BY (created_at AT TIME ZONE 'UTC')::date
ON CONFLICT (date) DO UPDATE SET clicks = EXCLUDED.clicks;

-- Trigger function: impressions
CREATE OR REPLACE FUNCTION public.increment_impression_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.referrer IS DISTINCT FROM 'dev-simulate' THEN
    INSERT INTO public.network_stats_daily (date, impressions)
    VALUES ((now() AT TIME ZONE 'UTC')::date, 1)
    ON CONFLICT (date) DO UPDATE SET
      impressions = public.network_stats_daily.impressions + 1,
      updated_at = now();

    IF NEW.shown_startup_id IS NOT NULL THEN
      INSERT INTO public.startup_stats_totals (startup_id, impressions_received)
      VALUES (NEW.shown_startup_id, 1)
      ON CONFLICT (startup_id) DO UPDATE SET
        impressions_received = public.startup_stats_totals.impressions_received + 1,
        updated_at = now();

      INSERT INTO public.startup_stats_daily (startup_id, date, impressions_received)
      VALUES (NEW.shown_startup_id, (now() AT TIME ZONE 'UTC')::date, 1)
      ON CONFLICT (startup_id, date) DO UPDATE SET
        impressions_received = public.startup_stats_daily.impressions_received + 1,
        updated_at = now();
    END IF;

    IF NEW.host_startup_id IS NOT NULL THEN
      INSERT INTO public.startup_stats_totals (startup_id, impressions_given)
      VALUES (NEW.host_startup_id, 1)
      ON CONFLICT (startup_id) DO UPDATE SET
        impressions_given = public.startup_stats_totals.impressions_given + 1,
        updated_at = now();

      INSERT INTO public.startup_stats_daily (startup_id, date, impressions_given)
      VALUES (NEW.host_startup_id, (now() AT TIME ZONE 'UTC')::date, 1)
      ON CONFLICT (startup_id, date) DO UPDATE SET
        impressions_given = public.startup_stats_daily.impressions_given + 1,
        updated_at = now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_impressions_stats ON public.impressions;
CREATE TRIGGER trg_impressions_stats
AFTER INSERT ON public.impressions
FOR EACH ROW
EXECUTE FUNCTION public.increment_impression_stats();

-- Trigger function: clicks
CREATE OR REPLACE FUNCTION public.increment_click_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.network_stats_daily (date, clicks)
  VALUES ((now() AT TIME ZONE 'UTC')::date, 1)
  ON CONFLICT (date) DO UPDATE SET
    clicks = public.network_stats_daily.clicks + 1,
    updated_at = now();

  IF NEW.shown_startup_id IS NOT NULL THEN
    INSERT INTO public.startup_stats_totals (startup_id, clicks_received)
    VALUES (NEW.shown_startup_id, 1)
    ON CONFLICT (startup_id) DO UPDATE SET
      clicks_received = public.startup_stats_totals.clicks_received + 1,
      updated_at = now();

    INSERT INTO public.startup_stats_daily (startup_id, date, clicks_received)
    VALUES (NEW.shown_startup_id, (now() AT TIME ZONE 'UTC')::date, 1)
    ON CONFLICT (startup_id, date) DO UPDATE SET
      clicks_received = public.startup_stats_daily.clicks_received + 1,
      updated_at = now();
  END IF;

  IF NEW.host_startup_id IS NOT NULL THEN
    INSERT INTO public.startup_stats_totals (startup_id, clicks_given)
    VALUES (NEW.host_startup_id, 1)
    ON CONFLICT (startup_id) DO UPDATE SET
      clicks_given = public.startup_stats_totals.clicks_given + 1,
      updated_at = now();

    INSERT INTO public.startup_stats_daily (startup_id, date, clicks_given)
    VALUES (NEW.host_startup_id, (now() AT TIME ZONE 'UTC')::date, 1)
    ON CONFLICT (startup_id, date) DO UPDATE SET
      clicks_given = public.startup_stats_daily.clicks_given + 1,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clicks_stats ON public.clicks;
CREATE TRIGGER trg_clicks_stats
AFTER INSERT ON public.clicks
FOR EACH ROW
EXECUTE FUNCTION public.increment_click_stats();