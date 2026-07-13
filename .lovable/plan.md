
## Goal

Add a compliant one-click unsubscribe to the admin broadcast emails (the "Signed up · no startup yet" style nudges) without touching account/transactional mail.

## Which emails get an unsubscribe link

**Marketing / opt-out-able** (link + suppression enforced):
- `admin-broadcast` (all recipient segments)
- Weekly digest (`send-weekly-digest`)

**Transactional / always sent** (no link, suppression ignored):
- `welcome`, `startup-submitted`
- `startup-approved`, `startup-rejected`
- `startup-warning`, `startup-removed-no-widget`
- `admin-new-application` (admin-only)
- Auth emails (password reset, confirm, etc.)

## Data model

Reuse the existing `suppressed_emails` table (already checked by app-email infra) with a scoped `reason`:
- `reason = 'unsubscribed_marketing'` → skip marketing sends only
- Existing bounce/complaint rows keep blocking everything (unchanged)

No new table needed. All existing users are effectively "subscribed by default" because absence of a row = subscribed.

## Token flow (one-click)

1. When a broadcast/digest is about to send to `recipient@x.com`, look up or insert a row in `email_unsubscribe_tokens` (email + random token, no expiry).
2. Append a footer to the HTML:
   > You're receiving updates from StartupBar. [Unsubscribe](https://startupbar.co/u/{token})
   Plus `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers on the Resend request for Gmail/Apple one-click.
3. New public page `src/routes/u.$token.tsx`:
   - GET validates token → shows "Unsubscribe {email}?" with one confirm button (already-unsubscribed state supported)
   - POST inserts `suppressed_emails(email, reason='unsubscribed_marketing')` (idempotent) → shows "You've been unsubscribed. Important account emails will still be sent."
   - Includes a "Resubscribe" action that deletes the marketing-suppression row.
4. New public server route `src/routes/api/public/unsubscribe.ts` handles the GET validate / POST unsubscribe / POST resubscribe JSON calls used by the page. Signature-verified by token only; no auth required (email clients hit it unauthenticated).

## Server changes in `supabase/functions/send-email/index.ts`

- In the `admin-broadcast` recipient loop:
  - Query `suppressed_emails` for `reason IN ('bounce','complaint','unsubscribed_marketing')` and skip those recipients (return them in the response as `skipped` for admin visibility).
  - For each remaining recipient, upsert an `email_unsubscribe_tokens` row and inject `{{unsubscribe_url}}` into the shell footer.
  - Add `List-Unsubscribe` / `List-Unsubscribe-Post` headers on the Resend POST.
- In `admin-broadcast-recipients` (count preview): return `{ count, unsubscribed, sample }` so the admin panel shows how many will actually get it.
- Leave all transactional branches untouched — they keep sending regardless of suppression.

## Weekly digest

Update `supabase/functions/send-weekly-digest/index.ts` the same way: skip `unsubscribed_marketing` addresses, add the token footer + List-Unsubscribe headers.

## Admin UI (`src/routes/admin.tsx` broadcast composer)

- Show "will send to N · M unsubscribed" from the updated recipients response.
- Add a small "Unsubscribed emails" section below the composer listing `suppressed_emails` where `reason='unsubscribed_marketing'`, with a "Resubscribe" button per row (admin can undo on request).
- No change to segments — the six existing recipient segments stay as-is.

## Migration

One migration:
1. Add `suppressed_emails.reason` check-friendly comment (no schema change; it's already text).
2. No new tables. Grants unchanged.

## Files touched

- `supabase/functions/send-email/index.ts` — suppression filter + token footer + List-Unsubscribe headers on broadcasts only
- `supabase/functions/send-weekly-digest/index.ts` — same treatment
- `src/routes/api/public/unsubscribe.ts` (new) — validate/unsubscribe/resubscribe JSON API
- `src/routes/u.$token.tsx` (new) — branded confirm/success page
- `src/routes/admin.tsx` — show unsubscribed count + management list

## Not doing

- No preference center (single toggle, per your answer).
- No bulk "mark all subscribed" migration — everyone is already treated as subscribed by default via absence of a suppression row.
- No changes to auth email templates.
