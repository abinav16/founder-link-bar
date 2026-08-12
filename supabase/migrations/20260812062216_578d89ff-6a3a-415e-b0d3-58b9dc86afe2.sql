CREATE TABLE public.featured_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_index int NOT NULL,
  startup_id uuid REFERENCES public.startups(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  dodo_payment_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX featured_slots_active_slot_idx
  ON public.featured_slots (slot_index) WHERE status = 'active';
CREATE INDEX featured_slots_startup_idx ON public.featured_slots (startup_id);
CREATE INDEX featured_slots_user_idx ON public.featured_slots (user_id);

GRANT SELECT ON public.featured_slots TO authenticated;
GRANT ALL ON public.featured_slots TO service_role;
ALTER TABLE public.featured_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own featured slots"
  ON public.featured_slots FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all featured slots"
  ON public.featured_slots FOR SELECT TO authenticated
  USING (COALESCE((auth.jwt() ->> 'email'), '') = 'danielabinav16@gmail.com');

CREATE TABLE public.featured_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid REFERENCES public.startups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  claim_token text,
  claim_expires_at timestamptz
);

CREATE INDEX featured_waitlist_created_idx ON public.featured_waitlist (created_at);

GRANT SELECT, INSERT, DELETE ON public.featured_waitlist TO authenticated;
GRANT ALL ON public.featured_waitlist TO service_role;
ALTER TABLE public.featured_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own waitlist entries"
  ON public.featured_waitlist FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can join waitlist for own startups"
  ON public.featured_waitlist FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND startup_id IN (SELECT id FROM public.startups WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can leave waitlist"
  ON public.featured_waitlist FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.public_featured_slots()
RETURNS TABLE(
  slot_index int,
  startup_id uuid,
  name text,
  slug text,
  website_url text,
  logo_url text,
  description text,
  founder_name text,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.slot_index, s.id, s.name, s.slug, s.website_url, s.logo_url,
         s.description, s.founder_name, f.expires_at
  FROM public.featured_slots f
  JOIN public.startups s ON s.id = f.startup_id
  WHERE f.status = 'active'
    AND f.expires_at > now()
    AND s.status = 'approved'
  ORDER BY f.slot_index;
$$;

REVOKE ALL ON FUNCTION public.public_featured_slots() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_featured_slots() TO anon, authenticated, service_role;