
CREATE OR REPLACE FUNCTION public.public_founder_info(_user_id uuid)
RETURNS TABLE (full_name text, avatar_url text, twitter_handle text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')::text AS full_name,
    COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')::text AS avatar_url,
    COALESCE(u.raw_user_meta_data->>'twitter_handle', u.raw_user_meta_data->>'twitter')::text AS twitter_handle
  FROM auth.users u
  WHERE u.id = _user_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.public_founder_info(uuid) TO anon, authenticated;
