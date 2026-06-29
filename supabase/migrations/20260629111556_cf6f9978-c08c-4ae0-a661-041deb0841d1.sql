GRANT SELECT ON public.startups TO anon;
DROP POLICY IF EXISTS "Anyone can view approved startups" ON public.startups;
CREATE POLICY "Anyone can view approved startups"
  ON public.startups FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');