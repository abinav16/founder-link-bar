REVOKE ALL ON public.signup_tracking_keys,public.signup_referrals,public.signup_conversions FROM anon,authenticated;
REVOKE ALL ON public.signup_tracking_settings FROM anon,authenticated;
GRANT SELECT ON public.signup_tracking_settings TO authenticated;
GRANT ALL ON public.signup_tracking_settings,public.signup_tracking_keys,public.signup_referrals,public.signup_conversions TO service_role;