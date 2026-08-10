-- Restore table privileges (RLS policies unchanged and still enforced)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.startups TO authenticated;
GRANT SELECT ON public.startups TO anon;
GRANT ALL ON public.startups TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT ON public.impressions TO authenticated;
GRANT SELECT, INSERT ON public.impressions TO anon;
GRANT ALL ON public.impressions TO service_role;

GRANT SELECT, INSERT ON public.clicks TO authenticated;
GRANT INSERT ON public.clicks TO anon;
GRANT ALL ON public.clicks TO service_role;

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

GRANT SELECT ON public.application_events TO authenticated;
GRANT ALL ON public.application_events TO service_role;

GRANT ALL ON public.email_send_log TO service_role;
GRANT ALL ON public.email_send_state TO service_role;
GRANT ALL ON public.email_unsubscribe_tokens TO service_role;
GRANT ALL ON public.suppressed_emails TO service_role;