CREATE OR REPLACE FUNCTION public.public_founder_info_bulk(_user_ids uuid[])
 RETURNS TABLE(user_id uuid, full_name text, avatar_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    u.id,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')::text,
    COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')::text
  FROM auth.users u
  WHERE u.id = ANY(_user_ids);
$function$;

REVOKE ALL ON FUNCTION public.public_founder_info_bulk(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_founder_info_bulk(uuid[]) TO anon, authenticated, service_role;