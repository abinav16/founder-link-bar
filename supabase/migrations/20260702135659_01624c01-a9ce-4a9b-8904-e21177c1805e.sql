-- Fast leaderboard rank lookup for a single startup.
-- Replaces a client-side "SELECT shown_startup_id FROM impressions" full-table
-- scan + in-memory rank calculation in the dashboard loader.
CREATE OR REPLACE FUNCTION public.get_startup_rank(_startup_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH counts AS (
    SELECT shown_startup_id, COUNT(*)::int AS c
    FROM public.impressions
    GROUP BY shown_startup_id
  ),
  me AS (
    SELECT COALESCE((SELECT c FROM counts WHERE shown_startup_id = _startup_id), 0) AS my_count
  )
  SELECT (SELECT COUNT(*) FROM counts, me WHERE counts.c > me.my_count)::int + 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_startup_rank(uuid) TO authenticated, service_role;
