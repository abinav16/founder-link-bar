CREATE TABLE public.startup_vouches (
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  founder_user_id uuid NOT NULL,
  founder_startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  tag text NOT NULL DEFAULT 'vouch' CHECK (tag IN ('vouch','clean_ux','lightning_fast','great_concept')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (startup_id, founder_user_id)
);
GRANT SELECT ON public.startup_vouches TO authenticated;
GRANT ALL ON public.startup_vouches TO service_role;
ALTER TABLE public.startup_vouches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders read their own vouches" ON public.startup_vouches FOR SELECT TO authenticated USING (founder_user_id = auth.uid());
CREATE INDEX startup_vouches_founder_startup_idx ON public.startup_vouches(founder_startup_id);

CREATE FUNCTION public.profile_vouch_access(_startup_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object(
 'eligible', EXISTS(SELECT 1 FROM public.startups WHERE user_id=auth.uid() AND status='approved' AND banned=false) AND EXISTS(SELECT 1 FROM public.startups WHERE id=_startup_id AND status='approved' AND banned=false AND user_id IS DISTINCT FROM auth.uid()),
 'tag', (SELECT tag FROM public.startup_vouches WHERE startup_id=_startup_id AND founder_user_id=auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.profile_vouch_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profile_vouch_access(uuid) TO authenticated, service_role;

CREATE FUNCTION public.set_startup_vouch(_startup_id uuid, _tag text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _founder_startup uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to vouch'; END IF;
 IF _tag IS NULL THEN
   DELETE FROM public.startup_vouches WHERE startup_id=_startup_id AND founder_user_id=auth.uid();
   RETURN;
 END IF;
 IF _tag NOT IN ('vouch','clean_ux','lightning_fast','great_concept') THEN RAISE EXCEPTION 'Invalid vouch tag'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.startups WHERE id=_startup_id AND status='approved' AND banned=false AND user_id IS DISTINCT FROM auth.uid()) THEN RAISE EXCEPTION 'You cannot vouch for your own or unavailable startup'; END IF;
 SELECT id INTO _founder_startup FROM public.startups WHERE user_id=auth.uid() AND status='approved' AND banned=false ORDER BY created_at,id LIMIT 1;
 IF _founder_startup IS NULL THEN RAISE EXCEPTION 'An approved startup is required to vouch'; END IF;
 INSERT INTO public.startup_vouches(startup_id,founder_user_id,founder_startup_id,tag) VALUES(_startup_id,auth.uid(),_founder_startup,_tag)
 ON CONFLICT(startup_id,founder_user_id) DO UPDATE SET tag=EXCLUDED.tag, founder_startup_id=EXCLUDED.founder_startup_id;
END;
$$;
REVOKE ALL ON FUNCTION public.set_startup_vouch(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_startup_vouch(uuid,text) TO authenticated, service_role;

CREATE FUNCTION public.public_startup_profile_insights(_startup_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 WITH target AS (SELECT * FROM public.startups WHERE id=_startup_id AND status='approved' AND banned=false),
 days AS (SELECT generate_series(0,13) AS day_offset),
 daily AS (SELECT d.day_offset, ((now() AT TIME ZONE 'UTC')::date-d.day_offset)::text AS date, COALESCE(sd.impressions_received,0) AS impressions, COALESCE(sd.clicks_received,0) AS clicks FROM target t CROSS JOIN days d LEFT JOIN public.startup_stats_daily sd ON sd.startup_id=t.id AND sd.date=(now() AT TIME ZONE 'UTC')::date-d.day_offset),
 vouches AS (SELECT v.tag,v.created_at,f.name,f.slug,f.website_url,f.logo_url,COALESCE(NULLIF(p.full_name,''),NULLIF(f.founder_name,''),f.name || ' founder') AS founder_name FROM target t JOIN public.startup_vouches v ON v.startup_id=t.id JOIN public.startups f ON f.id=v.founder_startup_id AND f.user_id=v.founder_user_id AND f.status='approved' AND f.banned=false LEFT JOIN public.profiles p ON p.id=v.founder_user_id),
 related AS (SELECT s.id,s.slug,s.name,s.description,s.website_url,s.logo_url FROM target t JOIN public.startups s ON s.id<>t.id AND s.status='approved' AND s.banned=false AND s.user_id IS DISTINCT FROM t.user_id AND s.website_url NOT ILIKE '%startupbar.co%' ORDER BY ts_rank_cd(to_tsvector('english',s.description),plainto_tsquery('english',t.description)) DESC,s.created_at DESC,s.id LIMIT 3)
 SELECT jsonb_build_object('daily',COALESCE((SELECT jsonb_agg(to_jsonb(daily) ORDER BY day_offset DESC) FROM daily),'[]'::jsonb),'vouchCount',(SELECT count(*) FROM vouches),'vouchTags',COALESCE((SELECT jsonb_object_agg(tag,n) FROM (SELECT tag,count(*) n FROM vouches GROUP BY tag) counts),'{}'::jsonb),'vouches',COALESCE((SELECT jsonb_agg(to_jsonb(v) ORDER BY v.created_at DESC) FROM (SELECT * FROM vouches ORDER BY created_at DESC LIMIT 8) v),'[]'::jsonb),'related',COALESCE((SELECT jsonb_agg(to_jsonb(related)) FROM related),'[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.public_startup_profile_insights(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_startup_profile_insights(uuid) TO anon, authenticated, service_role;