CREATE TABLE public.signup_tracking_settings (
 startup_id uuid PRIMARY KEY REFERENCES public.startups(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT false,
 success_path text,
 configured_at timestamptz NOT NULL DEFAULT now(),
 last_browser_report_at timestamptz,
 last_server_report_at timestamptz,
 last_test_at timestamptz,
 CHECK (success_path IS NULL OR (length(success_path) BETWEEN 2 AND 200 AND left(success_path,1) = '/' AND position('?' in success_path)=0 AND position('#' in success_path)=0 AND success_path NOT IN ('/','/login','/signin','/signup','/register','/dashboard')))
);
GRANT SELECT ON public.signup_tracking_settings TO authenticated;
GRANT ALL ON public.signup_tracking_settings TO service_role;
ALTER TABLE public.signup_tracking_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tracking_owner_read ON public.signup_tracking_settings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.startups s WHERE s.id=startup_id AND s.user_id=auth.uid()));
CREATE TABLE public.signup_tracking_keys (
 startup_id uuid PRIMARY KEY REFERENCES public.startups(id) ON DELETE CASCADE,
 secret text NOT NULL,
 rotated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.signup_tracking_keys TO service_role;
ALTER TABLE public.signup_tracking_keys ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.signup_referrals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 token_hash text NOT NULL UNIQUE,
 startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
 host_startup_id uuid REFERENCES public.startups(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
 is_test boolean NOT NULL DEFAULT false,
 CHECK (length(token_hash)=64)
);
GRANT ALL ON public.signup_referrals TO service_role;
ALTER TABLE public.signup_referrals ENABLE ROW LEVEL SECURITY;
CREATE INDEX signup_referrals_startup_date ON public.signup_referrals(startup_id,created_at);
CREATE TABLE public.signup_conversions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 referral_id uuid NOT NULL UNIQUE REFERENCES public.signup_referrals(id) ON DELETE CASCADE,
 startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
 event_hash text,
 confirmation text NOT NULL CHECK (confirmation IN ('browser','server')),
 created_at timestamptz NOT NULL DEFAULT now(),
 is_test boolean NOT NULL DEFAULT false
);
GRANT ALL ON public.signup_conversions TO service_role;
ALTER TABLE public.signup_conversions ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX signup_conversion_event_dedupe ON public.signup_conversions(startup_id,event_hash) WHERE event_hash IS NOT NULL;
CREATE INDEX signup_conversions_startup_date ON public.signup_conversions(startup_id,created_at);
CREATE OR REPLACE FUNCTION public.signup_tracking_public(_startup_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('enabled',t.enabled,'success_path',t.success_path,'website_url',s.website_url) FROM public.signup_tracking_settings t JOIN public.startups s ON s.id=t.startup_id WHERE t.startup_id=_startup_id AND t.enabled AND s.status='approved' AND NOT s.banned
$$;
REVOKE ALL ON FUNCTION public.signup_tracking_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.signup_tracking_public(uuid) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.record_signup_conversion(_token_hash text,_startup_id uuid,_confirmation text,_event_hash text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.signup_referrals; c public.signup_conversions; inserted_id uuid;
BEGIN
 IF _confirmation NOT IN ('browser','server') THEN RAISE EXCEPTION 'Invalid confirmation'; END IF;
 SELECT * INTO r FROM public.signup_referrals WHERE token_hash=_token_hash AND startup_id=_startup_id FOR UPDATE;
 IF NOT FOUND OR r.created_at>now() OR r.expires_at<now() THEN RETURN jsonb_build_object('accepted',false,'reason','expired_or_missing'); END IF;
 IF NOT EXISTS (SELECT 1 FROM public.signup_tracking_settings t JOIN public.startups s ON s.id=t.startup_id WHERE t.startup_id=_startup_id AND t.enabled AND s.status='approved' AND NOT s.banned) THEN RETURN jsonb_build_object('accepted',false,'reason','disabled'); END IF;
 IF _confirmation='server' AND _event_hash IS NULL THEN RAISE EXCEPTION 'Event id required'; END IF;
 SELECT * INTO c FROM public.signup_conversions WHERE referral_id=r.id;
 IF FOUND THEN
   IF _confirmation='server' AND c.confirmation='browser' THEN
     BEGIN
       UPDATE public.signup_conversions SET confirmation='server',event_hash=_event_hash WHERE id=c.id;
     EXCEPTION WHEN unique_violation THEN RETURN jsonb_build_object('accepted',false,'reason','duplicate_event'); END;
   END IF;
 ELSE
   INSERT INTO public.signup_conversions(referral_id,startup_id,event_hash,confirmation,is_test) VALUES(r.id,r.startup_id,_event_hash,_confirmation,r.is_test) ON CONFLICT DO NOTHING RETURNING id INTO inserted_id;
   IF inserted_id IS NULL THEN RETURN jsonb_build_object('accepted',false,'reason','duplicate_event'); END IF;
 END IF;
 UPDATE public.signup_tracking_settings SET last_browser_report_at=CASE WHEN _confirmation='browser' AND NOT r.is_test THEN now() ELSE last_browser_report_at END,last_server_report_at=CASE WHEN _confirmation='server' AND NOT r.is_test THEN now() ELSE last_server_report_at END,last_test_at=CASE WHEN r.is_test THEN now() ELSE last_test_at END WHERE startup_id=_startup_id;
 RETURN jsonb_build_object('accepted',true,'test',r.is_test);
END $$;
REVOKE ALL ON FUNCTION public.record_signup_conversion(text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_signup_conversion(text,uuid,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.my_signup_summary(_startup_id uuid,_since timestamptz DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.startups WHERE id=_startup_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT jsonb_build_object('settings',(SELECT to_jsonb(t) FROM public.signup_tracking_settings t WHERE t.startup_id=_startup_id),'verified',(SELECT count(*) FROM public.signup_conversions WHERE startup_id=_startup_id AND confirmation='server' AND NOT is_test AND (_since IS NULL OR created_at>=_since)),'reported',(SELECT count(*) FROM public.signup_conversions WHERE startup_id=_startup_id AND confirmation='browser' AND NOT is_test AND (_since IS NULL OR created_at>=_since)),'referrals',(SELECT count(*) FROM public.signup_referrals WHERE startup_id=_startup_id AND NOT is_test AND (_since IS NULL OR created_at>=_since)),'cohort_verified',(SELECT count(*) FROM public.signup_conversions c JOIN public.signup_referrals r ON r.id=c.referral_id WHERE c.startup_id=_startup_id AND c.confirmation='server' AND NOT c.is_test AND (_since IS NULL OR r.created_at>=_since)),'hosts',(SELECT coalesce(jsonb_agg(h),'[]'::jsonb) FROM (SELECT s.name,count(*) FILTER(WHERE c.confirmation='server') AS verified,count(*) FILTER(WHERE c.confirmation='browser') AS reported FROM public.signup_conversions c JOIN public.signup_referrals r ON r.id=c.referral_id LEFT JOIN public.startups s ON s.id=r.host_startup_id WHERE c.startup_id=_startup_id AND NOT c.is_test AND (_since IS NULL OR c.created_at>=_since) GROUP BY s.name ORDER BY count(*) DESC LIMIT 10) h)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.my_signup_summary(uuid,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_signup_summary(uuid,timestamptz) TO authenticated;
CREATE OR REPLACE FUNCTION public.digest_signup_summary(_startup_id uuid,_since timestamptz,_until timestamptz) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('enabled',coalesce((SELECT enabled FROM public.signup_tracking_settings WHERE startup_id=_startup_id),false),'verified',(SELECT count(*) FROM public.signup_conversions WHERE startup_id=_startup_id AND confirmation='server' AND NOT is_test AND created_at>=_since AND created_at<_until),'reported',(SELECT count(*) FROM public.signup_conversions WHERE startup_id=_startup_id AND confirmation='browser' AND NOT is_test AND created_at>=_since AND created_at<_until))
$$;
REVOKE ALL ON FUNCTION public.digest_signup_summary(uuid,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.digest_signup_summary(uuid,timestamptz,timestamptz) TO service_role;