
CREATE OR REPLACE FUNCTION public.digest_impression_counts(_since timestamptz)
RETURNS TABLE(shown_startup_id uuid, cnt bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT shown_startup_id, count(*)::bigint
  FROM impressions
  WHERE created_at >= _since
  GROUP BY shown_startup_id
$$;

CREATE OR REPLACE FUNCTION public.digest_impression_count_for(_startup uuid, _since timestamptz, _until timestamptz)
RETURNS bigint
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::bigint FROM impressions
  WHERE shown_startup_id = _startup AND created_at >= _since AND created_at < _until
$$;

GRANT EXECUTE ON FUNCTION public.digest_impression_counts(timestamptz) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.digest_impression_count_for(uuid, timestamptz, timestamptz) TO anon, authenticated, service_role;
