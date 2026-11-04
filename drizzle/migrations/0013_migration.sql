CREATE TABLE public.snippet_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  startup_id uuid NOT NULL,
  name text NOT NULL,
  website_url text NOT NULL,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX snippet_handoffs_email_created ON public.snippet_handoffs (email, created_at DESC);
CREATE INDEX snippet_handoffs_ip_created ON public.snippet_handoffs (ip_hash, created_at DESC);
ALTER TABLE public.snippet_handoffs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.snippet_handoffs FROM anon, authenticated;
GRANT ALL ON public.snippet_handoffs TO service_role;