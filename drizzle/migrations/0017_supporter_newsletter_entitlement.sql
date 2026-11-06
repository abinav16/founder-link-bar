CREATE TABLE public.supporter_newsletter_entitlements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), startup_id uuid NOT NULL REFERENCES public.startups(id), user_id uuid NOT NULL,
 subscription_id text NOT NULL, payment_id text NOT NULL UNIQUE, amount_cents integer NOT NULL, currency text NOT NULL,
 sponsorship_id uuid REFERENCES public.newsletter_sponsorships(id), created_at timestamptz NOT NULL DEFAULT now(), claimed_at timestamptz,
 UNIQUE(startup_id), CHECK(amount_cents >= 99900), CHECK(currency = 'USD')
);
GRANT SELECT ON public.supporter_newsletter_entitlements TO authenticated;
GRANT ALL ON public.supporter_newsletter_entitlements TO service_role;
ALTER TABLE public.supporter_newsletter_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_read ON public.supporter_newsletter_entitlements FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.grant_supporter_newsletter(_startup_id uuid, _user_id uuid, _subscription_id text, _payment_id text, _amount_cents integer, _currency text, _notification jsonb DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE granted uuid;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF _amount_cents < 99900 OR _currency <> 'USD' OR _payment_id IS NULL OR _subscription_id IS NULL THEN RAISE EXCEPTION 'not a paid annual charge'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.startups WHERE id=_startup_id AND user_id=_user_id AND supporter_subscription_id=_subscription_id AND membership_mode='supporter') THEN RAISE EXCEPTION 'membership mismatch'; END IF;
 INSERT INTO public.supporter_newsletter_entitlements(startup_id,user_id,subscription_id,payment_id,amount_cents,currency)
 VALUES (_startup_id,_user_id,_subscription_id,_payment_id,_amount_cents,_currency) ON CONFLICT DO NOTHING RETURNING id INTO granted;
 IF granted IS NOT NULL AND _notification IS NOT NULL THEN PERFORM public.enqueue_email('transactional_emails', _notification); END IF;
 RETURN granted IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.grant_supporter_newsletter(uuid,uuid,text,text,integer,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_supporter_newsletter(uuid,uuid,text,text,integer,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.checkout_orders_guard_newsletter()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NEW.newsletter_date IS NOT NULL AND NEW.status IN ('pending','paid') THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('newsletter:' || NEW.newsletter_date::text, 0));
  IF EXISTS (SELECT 1 FROM public.newsletter_sponsorships ns WHERE ns.send_date=NEW.newsletter_date AND ns.status NOT IN ('cancelled','failed','refunded') AND ns.dodo_payment_id IS DISTINCT FROM NEW.dodo_payment_id) THEN RAISE EXCEPTION 'newsletter date already booked' USING ERRCODE='23505'; END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.newsletter_guard_checkout_claim()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NEW.send_date IS NOT NULL AND NEW.status NOT IN ('cancelled','failed','refunded') THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('newsletter:' || NEW.send_date::text, 0));
  IF EXISTS (SELECT 1 FROM public.checkout_orders co WHERE co.newsletter_date=NEW.send_date AND (co.status='paid' OR (co.status='pending' AND co.expires_at>now())) AND co.dodo_payment_id IS DISTINCT FROM NEW.dodo_payment_id) THEN RAISE EXCEPTION 'newsletter date already booked' USING ERRCODE='23505'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER newsletter_guard_checkout_claim BEFORE INSERT OR UPDATE ON public.newsletter_sponsorships FOR EACH ROW EXECUTE FUNCTION public.newsletter_guard_checkout_claim();

CREATE OR REPLACE FUNCTION public.claim_supporter_newsletter(_startup_id uuid, _send_date date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE credit public.supporter_newsletter_entitlements; booking uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT * INTO credit FROM public.supporter_newsletter_entitlements WHERE startup_id=_startup_id AND user_id=auth.uid() FOR UPDATE;
 IF credit.id IS NULL THEN RAISE EXCEPTION 'No complimentary spot available'; END IF;
 IF credit.sponsorship_id IS NOT NULL THEN RETURN credit.sponsorship_id; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.startups WHERE id=_startup_id AND user_id=auth.uid() AND membership_mode='supporter' AND supporter_until>now() AND status='approved' AND NOT banned) THEN RAISE EXCEPTION 'An approved active Supporter listing is required'; END IF;
 IF _send_date IS NULL OR _send_date <= (now() AT TIME ZONE 'UTC')::date OR extract(isodow from _send_date) <> 7 THEN RAISE EXCEPTION 'Choose a future Sunday'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('newsletter:' || _send_date::text,0));
 IF EXISTS (SELECT 1 FROM public.checkout_orders WHERE newsletter_date=_send_date AND (status='paid' OR (status='pending' AND expires_at>now()))) THEN RAISE EXCEPTION 'This Sunday is already booked' USING ERRCODE='23505'; END IF;
 INSERT INTO public.newsletter_sponsorships(startup_id,user_id,recipients,price_cents,send_date,status,dodo_payment_id)
 VALUES(_startup_id,auth.uid(),public.public_newsletter_audience(),0,_send_date,'paid',credit.payment_id) RETURNING id INTO booking;
 UPDATE public.supporter_newsletter_entitlements SET sponsorship_id=booking,claimed_at=now() WHERE id=credit.id;
 RETURN booking;
END $$;
REVOKE ALL ON FUNCTION public.claim_supporter_newsletter(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_supporter_newsletter(uuid,date) TO authenticated;
COMMENT ON TABLE public.supporter_newsletter_entitlements IS 'One lifetime complimentary newsletter send per startup after its first verified paid annual Supporter charge; trial activation cannot mint a credit.';