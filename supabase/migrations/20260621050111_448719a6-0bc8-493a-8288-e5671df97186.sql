
DROP POLICY "Anyone can insert impressions" ON public.impressions;
CREATE POLICY "Insert impressions for approved startups"
  ON public.impressions FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.startups s WHERE s.id = shown_startup_id AND s.status = 'approved'));

DROP POLICY "Anyone can insert clicks" ON public.clicks;
CREATE POLICY "Insert clicks for approved startups"
  ON public.clicks FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.startups s WHERE s.id = shown_startup_id AND s.status = 'approved'));
