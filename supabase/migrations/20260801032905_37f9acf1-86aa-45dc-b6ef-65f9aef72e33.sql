CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  avatar_url text,
  twitter_handle text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill from existing auth metadata
INSERT INTO public.profiles (id, full_name, avatar_url, twitter_handle)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
       COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'),
       COALESCE(u.raw_user_meta_data->>'twitter_handle', u.raw_user_meta_data->>'twitter')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.public_founder_info(_user_id uuid)
 RETURNS TABLE(full_name text, avatar_url text, twitter_handle text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(NULLIF(p.full_name, ''), u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')::text,
    COALESCE(NULLIF(p.avatar_url, ''), u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')::text,
    COALESCE(NULLIF(p.twitter_handle, ''), u.raw_user_meta_data->>'twitter_handle', u.raw_user_meta_data->>'twitter')::text
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = _user_id
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.public_founder_info_bulk(_user_ids uuid[])
 RETURNS TABLE(user_id uuid, full_name text, avatar_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    u.id,
    COALESCE(NULLIF(p.full_name, ''), u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')::text,
    COALESCE(NULLIF(p.avatar_url, ''), u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')::text
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = ANY(_user_ids);
$function$;

CREATE OR REPLACE FUNCTION public.get_my_profile()
 RETURNS TABLE(full_name text, avatar_url text, twitter_handle text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(NULLIF(p.full_name, ''), u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')::text,
    COALESCE(NULLIF(p.avatar_url, ''), u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')::text,
    COALESCE(NULLIF(p.twitter_handle, ''), u.raw_user_meta_data->>'twitter_handle', u.raw_user_meta_data->>'twitter')::text
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = auth.uid()
  LIMIT 1;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;