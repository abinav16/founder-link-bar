CREATE TABLE public.application_drafts (
  user_id uuid NOT NULL,
  startup_id uuid NOT NULL,
  name text NOT NULL,
  website_url text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text,
  placement text,
  mode text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, startup_id)
);
GRANT SELECT, INSERT, UPDATE ON public.application_drafts TO authenticated;
GRANT ALL ON public.application_drafts TO service_role;
ALTER TABLE public.application_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own drafts select" ON public.application_drafts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own drafts insert" ON public.application_drafts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own drafts update" ON public.application_drafts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.admin_application_drafts()
RETURNS TABLE(user_id uuid, startup_id uuid, name text, website_url text, description text, category text, placement text, email text, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'email', '') <> 'danielabinav16@gmail.com' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT d.user_id, d.startup_id, d.name, d.website_url, d.description, d.category, d.placement, u.email::text, d.updated_at
    FROM public.application_drafts d
    LEFT JOIN auth.users u ON u.id = d.user_id
    WHERE d.submitted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.startups s WHERE s.id = d.startup_id)
    ORDER BY d.updated_at DESC;
END $$;