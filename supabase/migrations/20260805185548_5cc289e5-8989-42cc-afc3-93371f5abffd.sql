DROP POLICY IF EXISTS "Insert impressions for approved startups" ON public.impressions;
CREATE POLICY "Insert impressions for approved startups"
ON public.impressions FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.startups s WHERE s.id = impressions.shown_startup_id AND s.status = 'approved')
  AND (
    impressions.host_startup_id IS NULL
    OR EXISTS (SELECT 1 FROM public.startups h WHERE h.id = impressions.host_startup_id AND h.status = 'approved' AND h.banned = false)
  )
);

DROP POLICY IF EXISTS "Insert clicks for approved startups" ON public.clicks;
CREATE POLICY "Insert clicks for approved startups"
ON public.clicks FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.startups s WHERE s.id = clicks.shown_startup_id AND s.status = 'approved')
  AND (
    clicks.host_startup_id IS NULL
    OR EXISTS (SELECT 1 FROM public.startups h WHERE h.id = clicks.host_startup_id AND h.status = 'approved' AND h.banned = false)
  )
);