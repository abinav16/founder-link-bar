CREATE OR REPLACE FUNCTION public.record_signup_conversion(_token_hash text,_startup_id uuid,_confirmation text,_event_hash text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.signup_referrals; c public.signup_conversions; inserted_id uuid;
BEGIN
 IF _confirmation NOT IN ('browser','server') THEN RAISE EXCEPTION 'Invalid confirmation'; END IF;
 SELECT * INTO r FROM public.signup_referrals WHERE token_hash=_token_hash AND startup_id=_startup_id FOR UPDATE;
 IF NOT FOUND OR r.created_at>now() OR r.expires_at<now() THEN RETURN jsonb_build_object('accepted',false,'reason','expired_or_missing'); END IF;
 IF NOT EXISTS (SELECT 1 FROM public.signup_tracking_settings t JOIN public.startups s ON s.id=t.startup_id WHERE t.startup_id=_startup_id AND t.enabled AND s.status='approved' AND NOT s.banned) THEN RETURN jsonb_build_object('accepted',false,'reason','disabled'); END IF;
 IF _confirmation='server' AND (_event_hash IS NULL OR _event_hash !~ '^[a-f0-9]{64}$') THEN RAISE EXCEPTION 'Hashed event id required'; END IF;
 SELECT * INTO c FROM public.signup_conversions WHERE referral_id=r.id;
 IF FOUND THEN
   IF _confirmation='server' AND c.confirmation='browser' THEN
     BEGIN
       UPDATE public.signup_conversions SET confirmation='server',event_hash=_event_hash,created_at=now() WHERE id=c.id;
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
COMMENT ON TABLE public.signup_conversions IS 'Anonymous partner-reported attribution. Browser reports are not verified accounts; server confirmations are signed partner assertions, not independently audited.';