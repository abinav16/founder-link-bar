ALTER TABLE public.ad_campaigns ADD COLUMN weeks integer NOT NULL DEFAULT 1 CHECK (weeks BETWEEN 1 AND 52), ADD COLUMN starts_at timestamptz, ADD COLUMN expires_at timestamptz;
ALTER TABLE public.ad_campaigns DROP CONSTRAINT ad_campaigns_budget_cents_check;
ALTER TABLE public.ad_campaigns ADD CONSTRAINT ad_campaigns_budget_cents_check CHECK (budget_cents >= 4900 AND budget_cents <= 5000000);
COMMENT ON COLUMN public.ad_campaigns.cpm_cents IS 'DEPRECATED: weekly sponsorships do not charge per impression';
COMMENT ON COLUMN public.ad_campaigns.spent_cents IS 'DEPRECATED: retained for compatibility, weekly sponsorship views do not debit spend';
CREATE UNIQUE INDEX ad_campaigns_payment_unique ON public.ad_campaigns(dodo_payment_id) WHERE dodo_payment_id IS NOT NULL;
ALTER TABLE public.ad_campaigns ADD CONSTRAINT ad_campaign_dates_check CHECK (expires_at IS NULL OR (starts_at IS NOT NULL AND expires_at = starts_at + weeks * interval '7 days'));

CREATE OR REPLACE FUNCTION public.confirm_weekly_banner_payment(_id uuid, _payment_id text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.ad_campaigns;
BEGIN
 SELECT * INTO c FROM public.ad_campaigns WHERE id = _id FOR UPDATE;
 IF NOT FOUND THEN RETURN 'failed'; END IF;
 IF c.dodo_payment_id IS NOT NULL AND c.dodo_payment_id <> _payment_id THEN RETURN 'failed'; END IF;
 IF c.paid_at IS NOT NULL THEN RETURN c.status; END IF;
 IF c.status <> 'pending_payment' THEN RETURN 'failed'; END IF;
 UPDATE public.ad_campaigns SET paid_at = now(), dodo_payment_id = _payment_id, status = 'in_review' WHERE id = _id;
 RETURN 'in_review';
END; $$;
REVOKE ALL ON FUNCTION public.confirm_weekly_banner_payment(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_weekly_banner_payment(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_review_ad(_id uuid, _approve boolean, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.ad_campaigns;
BEGIN
 IF COALESCE(auth.jwt() ->> 'email', '') <> 'danielabinav16@gmail.com' THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT * INTO c FROM public.ad_campaigns WHERE id = _id FOR UPDATE;
 IF NOT FOUND OR c.paid_at IS NULL OR c.status NOT IN ('in_review','running') THEN RETURN; END IF;
 IF _approve AND c.status = 'running' THEN RETURN; END IF;
 UPDATE public.ad_campaigns SET status = CASE WHEN _approve THEN 'running' ELSE 'rejected' END,
 approved_at = CASE WHEN _approve THEN now() ELSE approved_at END,
 starts_at = CASE WHEN _approve THEN now() ELSE starts_at END,
 expires_at = CASE WHEN _approve THEN now() + weeks * interval '7 days' ELSE expires_at END,
 rejection_reason = CASE WHEN _approve THEN NULL ELSE left(coalesce(_reason,''),500) END
 WHERE id = _id;
END; $$;
REVOKE ALL ON FUNCTION public.admin_review_ad(uuid,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_ad(uuid,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.public_pick_weekly_banners(_count integer DEFAULT 3)
RETURNS TABLE (id uuid, advertiser_name text, headline text, destination_url text, desktop_image_url text, mobile_image_url text, expires_at timestamptz)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
 SELECT c.id,c.advertiser_name,c.headline,c.destination_url,c.desktop_image_url,c.mobile_image_url,c.expires_at
 FROM public.ad_campaigns c WHERE c.status = 'running' AND c.paid_at IS NOT NULL AND c.approved_at IS NOT NULL AND c.starts_at <= now() AND c.expires_at > now()
 ORDER BY random() LIMIT least(greatest(_count,1),10);
$$;
REVOKE ALL ON FUNCTION public.public_pick_weekly_banners(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_pick_weekly_banners(integer) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.public_pick_banners(_count integer DEFAULT 3)
RETURNS TABLE (id uuid, advertiser_name text, headline text, destination_url text, desktop_image_url text, mobile_image_url text)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
 SELECT c.id,c.advertiser_name,c.headline,c.destination_url,c.desktop_image_url,c.mobile_image_url FROM public.public_pick_weekly_banners(_count) c;
$$;
CREATE OR REPLACE FUNCTION public.record_ad_event(_campaign uuid, _kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF _kind = 'view' THEN
 UPDATE public.ad_campaigns SET impressions = impressions + 1 WHERE id = _campaign AND status = 'running' AND starts_at <= now() AND expires_at > now();
 ELSIF _kind = 'click' THEN
 UPDATE public.ad_campaigns SET clicks = clicks + 1 WHERE id = _campaign AND status = 'running' AND starts_at <= now() AND expires_at > now();
 END IF;
END; $$;
REVOKE ALL ON FUNCTION public.record_ad_event(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_ad_event(uuid,text) TO service_role;