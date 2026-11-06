CREATE TABLE public.checkout_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  startup_id uuid NOT NULL,
  listing_cents integer NOT NULL DEFAULT 0,
  clicks integer,
  clicks_cents integer NOT NULL DEFAULT 0,
  newsletter_date date,
  newsletter_recipients integer,
  newsletter_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','fulfilled','failed','expired')),
  dodo_payment_id text UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  fulfilled_at timestamptz,
  CONSTRAINT checkout_orders_sunday CHECK (newsletter_date IS NULL OR EXTRACT(ISODOW FROM newsletter_date) = 7)
);
GRANT SELECT ON public.checkout_orders TO authenticated;
GRANT ALL ON public.checkout_orders TO service_role;
ALTER TABLE public.checkout_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their checkout orders" ON public.checkout_orders FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE UNIQUE INDEX checkout_orders_one_claim_per_sunday ON public.checkout_orders (newsletter_date) WHERE newsletter_date IS NOT NULL AND status IN ('pending','paid');

CREATE OR REPLACE FUNCTION public.checkout_orders_guard_newsletter() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.newsletter_date IS NOT NULL AND NEW.status = 'pending' AND EXISTS (
    SELECT 1 FROM public.newsletter_sponsorships ns WHERE ns.send_date = NEW.newsletter_date AND ns.status NOT IN ('cancelled','failed','refunded')
  ) THEN
    RAISE EXCEPTION 'newsletter date already booked' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER checkout_orders_guard_newsletter BEFORE INSERT ON public.checkout_orders FOR EACH ROW EXECUTE FUNCTION public.checkout_orders_guard_newsletter();

CREATE OR REPLACE FUNCTION public.public_newsletter_booked_dates() RETURNS TABLE(send_date date) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT DISTINCT d FROM (
    SELECT ns.send_date AS d FROM public.newsletter_sponsorships ns
      WHERE ns.send_date IS NOT NULL AND ns.status NOT IN ('cancelled','failed','refunded')
    UNION
    SELECT co.newsletter_date FROM public.checkout_orders co
      WHERE co.newsletter_date IS NOT NULL AND (co.status = 'paid' OR (co.status = 'pending' AND co.expires_at > now()))
  ) x WHERE d >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date ORDER BY d;
$$;

CREATE OR REPLACE FUNCTION public.fulfil_checkout_orders(_startup_id uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE o record; n integer := 0; owner uuid;
BEGIN
  SELECT s.user_id INTO owner FROM public.startups s WHERE s.id = _startup_id;
  IF owner IS NULL THEN RETURN 0; END IF;
  IF coalesce(auth.role(), '') <> 'service_role' AND owner IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOR o IN SELECT * FROM public.checkout_orders WHERE startup_id = _startup_id AND user_id = owner AND status = 'paid' FOR UPDATE LOOP
    UPDATE public.checkout_orders SET status = 'fulfilled', fulfilled_at = now() WHERE id = o.id;
    IF o.clicks IS NOT NULL AND o.clicks > 0 THEN
      INSERT INTO public.click_boosts (startup_id, user_id, clicks_purchased, price_cents, status, dodo_payment_id)
      VALUES (_startup_id, owner, o.clicks, o.clicks_cents, 'paid', o.dodo_payment_id);
    END IF;
    IF o.newsletter_date IS NOT NULL THEN
      INSERT INTO public.newsletter_sponsorships (startup_id, user_id, recipients, price_cents, send_date, status, dodo_payment_id)
      VALUES (_startup_id, owner, coalesce(o.newsletter_recipients, 0), o.newsletter_cents, o.newsletter_date, 'paid', o.dodo_payment_id);
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.fulfil_checkout_orders(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulfil_checkout_orders(uuid) TO authenticated, service_role;