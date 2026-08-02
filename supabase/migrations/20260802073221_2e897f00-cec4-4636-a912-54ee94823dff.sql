CREATE OR REPLACE FUNCTION public.admin_founder_info(_user_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, email text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'email', '') <> 'danielabinav16@gmail.com' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT
      u.id,
      COALESCE(NULLIF(p.full_name, ''), u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')::text,
      COALESCE(NULLIF(p.avatar_url, ''), u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')::text,
      u.email::text
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = ANY(_user_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_founder_info(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_founder_info(uuid[]) TO authenticated;