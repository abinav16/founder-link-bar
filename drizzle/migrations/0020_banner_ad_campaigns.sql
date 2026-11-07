CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  advertiser_name text NOT NULL,
  headline text NOT NULL DEFAULT '',
  destination_url text NOT NULL,
  desktop_image_url text NOT NULL,
  mobile_image_url text NOT NULL,
  budget_cents integer NOT NULL CHECK (budget_cents >= 5000 AND budget_cents <= 5000000),
  cpm_cents integer NOT NULL DEFAULT 1500,
  spent_cents numeric NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','in_review','running','paused','rejected','finished')),
  rejection_reason text,
  dodo_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  approved_at timestamptz
);
CREATE INDEX ad_campaigns_running_idx ON public.ad_campaigns (status) WHERE status = 'running';
GRANT SELECT ON public.ad_campaigns TO authenticated;
GRANT ALL ON public.ad_campaigns TO service_role;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own campaigns" ON public.ad_campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.public_pick_banners(_count integer DEFAULT 3)
RETURNS TABLE (id uuid, advertiser_name text, headline text, destination_url text, desktop_image_url text, mobile_image_url text)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.advertiser_name, c.headline, c.destination_url, c.desktop_image_url, c.mobile_image_url
  FROM public.ad_campaigns c
  WHERE c.status = 'running' AND c.spent_cents < c.budget_cents
  ORDER BY -ln(greatest(random(), 1e-9)) / greatest(c.budget_cents - c.spent_cents, 1)
  LIMIT least(greatest(_count, 1), 10);
$$;
GRANT EXECUTE ON FUNCTION public.public_pick_banners(integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_ad_event(_campaign uuid, _kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _kind = 'view' THEN
    UPDATE public.ad_campaigns
      SET impressions = impressions + 1,
          spent_cents = spent_cents + cpm_cents / 1000.0,
          status = CASE WHEN spent_cents + cpm_cents / 1000.0 >= budget_cents THEN 'finished' ELSE status END
      WHERE id = _campaign AND status = 'running';
  ELSIF _kind = 'click' THEN
    UPDATE public.ad_campaigns SET clicks = clicks + 1 WHERE id = _campaign AND status IN ('running','finished');
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.record_ad_event(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_ad_event(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_ad_campaigns()
RETURNS SETOF public.ad_campaigns LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'email', '') <> 'danielabinav16@gmail.com' THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.ad_campaigns WHERE status <> 'pending_payment' ORDER BY created_at DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_ad_campaigns() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_ad(_id uuid, _approve boolean, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'email', '') <> 'danielabinav16@gmail.com' THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.ad_campaigns
    SET status = CASE WHEN _approve THEN 'running' ELSE 'rejected' END,
        approved_at = CASE WHEN _approve THEN now() ELSE approved_at END,
        rejection_reason = CASE WHEN _approve THEN NULL ELSE left(coalesce(_reason,''), 500) END
    WHERE id = _id AND status IN ('in_review','paused','running');
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_review_ad(uuid, boolean, text) TO authenticated;

CREATE POLICY "Ad banner uploads by owner" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ad-banners' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Ad banners public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'ad-banners');