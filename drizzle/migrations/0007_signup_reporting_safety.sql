ALTER TABLE public.signup_tracking_settings ADD COLUMN first_verified_email_at timestamptz;
CREATE OR REPLACE FUNCTION public.claim_weekly_digest(_email text,_test boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE claimed uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('startupbar-weekly-digest'));
 IF EXISTS (SELECT 1 FROM public.suppressed_emails WHERE lower(email)=lower(_email)) THEN RETURN NULL; END IF;
 IF NOT _test AND EXISTS (SELECT 1 FROM public.email_send_log WHERE lower(recipient_email)=lower(_email) AND template_name='weekly-digest' AND status IN ('pending','sent') AND created_at>=now()-interval '6.5 days') THEN RETURN NULL; END IF;
 IF (SELECT count(*) FROM public.email_send_log WHERE template_name='weekly-digest' AND status IN ('pending','sent') AND created_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')>=50 THEN RETURN NULL; END IF;
 INSERT INTO public.email_send_log(template_name,recipient_email,status,metadata) VALUES('weekly-digest',lower(_email),'pending',jsonb_build_object('test',_test)) RETURNING id INTO claimed;
 RETURN claimed;
END $$;
REVOKE ALL ON FUNCTION public.claim_weekly_digest(text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_weekly_digest(text,boolean) TO service_role;
CREATE OR REPLACE FUNCTION public.purge_signup_attribution() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 DELETE FROM public.signup_conversions WHERE created_at<now()-interval '365 days';
 DELETE FROM public.signup_referrals r WHERE r.created_at<now()-interval '90 days' AND NOT EXISTS(SELECT 1 FROM public.signup_conversions c WHERE c.referral_id=r.id);
END $$;
REVOKE ALL ON FUNCTION public.purge_signup_attribution() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.purge_signup_attribution() TO service_role;
SELECT cron.schedule('purge-signup-attribution','30 3 * * *','SELECT public.purge_signup_attribution()');