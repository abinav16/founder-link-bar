ALTER TABLE public.application_drafts ADD COLUMN IF NOT EXISTS checkout_plan jsonb;

CREATE TABLE public.click_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  clicks_purchased integer NOT NULL,
  clicks_delivered integer NOT NULL DEFAULT 0,
  price_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  dodo_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  completed_at timestamptz
);
GRANT SELECT ON public.click_boosts TO authenticated;
GRANT ALL ON public.click_boosts TO service_role;
ALTER TABLE public.click_boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their click boosts" ON public.click_boosts FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.newsletter_sponsorships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  recipients integer NOT NULL,
  price_cents integer NOT NULL,
  send_date date,
  status text NOT NULL DEFAULT 'pending',
  dodo_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.newsletter_sponsorships TO authenticated;
GRANT ALL ON public.newsletter_sponsorships TO service_role;
ALTER TABLE public.newsletter_sponsorships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their newsletter sponsorships" ON public.newsletter_sponsorships FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.public_newsletter_audience()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(DISTINCT s.user_id)::int FROM public.startups s
  WHERE s.status = 'approved' AND NOT s.banned
$$;
GRANT EXECUTE ON FUNCTION public.public_newsletter_audience() TO anon, authenticated;