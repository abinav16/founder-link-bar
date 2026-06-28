GRANT SELECT ON public.impressions TO anon;
GRANT SELECT ON public.clicks TO anon;

CREATE POLICY "Anyone can read impressions"
  ON public.impressions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can read clicks"
  ON public.clicks FOR SELECT
  TO anon
  USING (true);