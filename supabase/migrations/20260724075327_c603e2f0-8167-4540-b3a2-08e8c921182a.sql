
-- 1) Revoke EXECUTE from anon/authenticated on server-only SECURITY DEFINER functions.
-- These are called only from trusted server contexts (edge functions, cron, triggers).
REVOKE EXECUTE ON FUNCTION public.digest_impression_counts(timestamptz) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.digest_impression_count_for(uuid, timestamptz, timestamptz) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_orphan_payments(integer) FROM anon, PUBLIC;

-- 2) Drop the broad public SELECT policy on avatars that permits listing.
-- Public buckets still serve files via direct URLs (RLS is bypassed for public bucket downloads),
-- so avatars remain viewable — but list() calls can no longer enumerate contents.
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
