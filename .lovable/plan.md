## Root cause (high confidence)

Resend's default rate limit is **2 requests/second**. The broadcast loop in `supabase/functions/send-email/index.ts` currently sleeps only 120ms between sends (~8/sec), so most sends after the first couple hit `429 Too Many Requests` and are recorded as failures. 13/41 failing on a first burst matches this pattern exactly.

Secondary issue: per-recipient errors are only bundled into the response JSON (first 10) and never `console.error`'d, so nothing showed up in edge-function logs, and the admin UI toast just says "13 failed" with no detail.

## Fix

### 1. `supabase/functions/send-email/index.ts` — broadcast loop only
- Slow the base pacing from `120ms` to `550ms` (safely under Resend's 2 req/s).
- On a `429` response from Resend, respect the `Retry-After` header (fallback 1s), wait, and **retry that recipient once** before counting it as failed.
- On any non-2xx from Resend, still catch and record — but also `console.error` the recipient + status + short message so future issues show up in edge logs.
- Keep the existing `errors` return shape; bump the returned sample from 10 → 25 so the admin UI can see more detail.

To make retries possible, `sendEmail()` needs to surface the HTTP status. Smallest change: keep `sendEmail` as-is for other callers, and inline a small `sendOne(recipient)` helper inside the broadcast branch that does the fetch, handles 429 retry, and throws with `{status, message}` on final failure.

### 2. `src/routes/admin.tsx` — BroadcastPanel result toast/summary
- When the send response comes back, if `failed > 0`, show a small expandable list of failed recipients + their error messages (from the `errors` array the function returns), not just the count. Keep the success toast unchanged.

## What this does NOT change

- No template changes, no recipient-segmentation changes, no schema changes.
- Regular one-off emails (approved/rejected/warning/submitted/etc.) are untouched — they go through the same `sendEmail()` and aren't affected by rate limits because they're single sends.

## Expected outcome

Next broadcast of ~41 recipients takes ~25s instead of ~5s, and should show **0 failed** (or, if any address genuinely bounces / is suppressed, the admin panel will show exactly which one and why).
