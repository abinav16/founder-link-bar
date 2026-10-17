CREATE TABLE IF NOT EXISTS public.internal_job_tokens (
  name text PRIMARY KEY,
  token text NOT NULL DEFAULT (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.internal_job_tokens FROM anon, authenticated;
GRANT SELECT ON public.internal_job_tokens TO service_role;
ALTER TABLE public.internal_job_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role reads job tokens" ON public.internal_job_tokens
  FOR SELECT TO service_role USING (true);
INSERT INTO public.internal_job_tokens (name) VALUES ('weekly-digest') ON CONFLICT DO NOTHING;

DO $$ BEGIN PERFORM cron.unschedule('weekly-digest'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'weekly-digest',
  '0 9 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://jtkacpsbvceoiulundwl.supabase.co/functions/v1/send-weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-job-token', (SELECT token FROM public.internal_job_tokens WHERE name = 'weekly-digest')
    ),
    body := '{}'::jsonb
  );
  $cron$
);