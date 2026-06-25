ALTER TABLE public.startups
  ADD COLUMN IF NOT EXISTS warned_at timestamptz,
  ADD COLUMN IF NOT EXISTS warn_expires_at timestamptz;