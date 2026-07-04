GRANT SELECT ON public.impressions TO anon;
CREATE POLICY "Public can read impressions for network globe"
  ON public.impressions FOR SELECT
  TO anon, authenticated
  USING (true);