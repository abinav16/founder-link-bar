CREATE TABLE public.snippet_install_checks (
 startup_id uuid PRIMARY KEY REFERENCES public.startups(id) ON DELETE CASCADE,
 detected_at timestamptz,
 checked_at timestamptz NOT NULL DEFAULT now(),
 source_url text
);
GRANT ALL ON public.snippet_install_checks TO service_role;
ALTER TABLE public.snippet_install_checks ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.snippet_install_checks IS 'Service-only static widget snippet evidence for conditional weekly reminders; not a search ranking signal.';