ALTER TABLE public.startups
  ADD COLUMN IF NOT EXISTS pending_name text,
  ADD COLUMN IF NOT EXISTS pending_description text,
  ADD COLUMN IF NOT EXISTS edit_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS edit_submitted_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;

UPDATE public.profiles SET welcome_email_sent_at = COALESCE(welcome_email_sent_at, created_at);