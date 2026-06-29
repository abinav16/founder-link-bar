ALTER TABLE public.startups ADD COLUMN logo_url TEXT;

GRANT SELECT, INSERT, UPDATE ON public.startups TO authenticated;
GRANT ALL ON public.startups TO service_role;