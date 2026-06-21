
CREATE TYPE public.startup_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.startups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  description TEXT NOT NULL,
  status public.startup_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX startups_status_idx ON public.startups(status);

GRANT SELECT, INSERT, UPDATE ON public.startups TO authenticated;
GRANT SELECT ON public.startups TO anon;
GRANT ALL ON public.startups TO service_role;

ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved startups are publicly readable"
  ON public.startups FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Users can read their own startup"
  ON public.startups FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own startup"
  ON public.startups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own startup"
  ON public.startups FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.impressions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shown_startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  host_startup_id UUID REFERENCES public.startups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX impressions_shown_idx ON public.impressions(shown_startup_id);
CREATE INDEX impressions_host_idx ON public.impressions(host_startup_id);

GRANT SELECT, INSERT ON public.impressions TO anon, authenticated;
GRANT ALL ON public.impressions TO service_role;
ALTER TABLE public.impressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert impressions"
  ON public.impressions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "Users can read impressions for their startup"
  ON public.impressions FOR SELECT
  TO authenticated
  USING (shown_startup_id IN (SELECT id FROM public.startups WHERE user_id = auth.uid()));

CREATE TABLE public.clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shown_startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  host_startup_id UUID REFERENCES public.startups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX clicks_shown_idx ON public.clicks(shown_startup_id);

GRANT SELECT, INSERT ON public.clicks TO anon, authenticated;
GRANT ALL ON public.clicks TO service_role;
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert clicks"
  ON public.clicks FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "Users can read clicks for their startup"
  ON public.clicks FOR SELECT
  TO authenticated
  USING (shown_startup_id IN (SELECT id FROM public.startups WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_startups_updated_at
  BEFORE UPDATE ON public.startups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
