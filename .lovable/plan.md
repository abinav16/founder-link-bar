# Admin Broadcast Emails

Add a "Send Broadcast" panel to `/admin` that lets you write a custom subject + body, pick a recipient segment, and send individually (each with BCC to `danielabinav16@gmail.com`). All emails use the branded StartupBar template shell.

## 1. New email type in `supabase/functions/send-email/index.ts`

Add handler `type === "admin-broadcast"`:
- Input: `{ to: string, subject: string, bodyMarkdown: string, headline?: string }`.
- Guard: refuse if the calling request doesn't come from an authenticated admin (verify via Supabase JWT of caller = `danielabinav16@gmail.com`).
- Render body through existing `shell()` helper so it matches the current branded card design (same header pill, white card, footer). Convert `bodyMarkdown` to safe HTML: escape HTML, then transform:
  - blank lines → paragraph breaks (`<p>` wrapped with existing `p()` style)
  - `**bold**` → `<strong>`
  - `[text](url)` → `<a>` with brand color
  - lines starting with `- ` → `<ul><li>`
- Uses existing `sendEmail()` which already BCCs admin automatically.

## 2. New server function `src/lib/admin-broadcast.functions.ts`

`getBroadcastRecipients({ segment })` with `.middleware([requireSupabaseAuth])`:
- Verify `context.claims.email === 'danielabinav16@gmail.com'` (else throw Forbidden).
- Load `supabaseAdmin` inside handler; use `auth.admin.listUsers()` + `startups` table.
- Segments:
  - `all` — every auth user
  - `no_startup` — users with zero rows in `startups`
  - `has_startup` — users with ≥1 startup (any status)
  - `approved_only` — users with ≥1 approved startup
  - `pending_only` — users with ≥1 pending startup and no approved
  - `rejected_only` — users whose only startups are rejected
- Returns `{ recipients: { email, name }[], count }`.

`sendBroadcast({ segment, subject, headline, bodyMarkdown })` server fn:
- Same admin guard.
- Fetches recipients via the helper above, then loops and calls the `admin-broadcast` email type once per recipient (sequential with small delay to stay under Resend rate limits — ~10/sec).
- Returns `{ sent, failed, errors: [{ email, error }] }`.

## 3. Admin UI additions to `src/routes/admin.tsx`

New "Broadcast" tab (or collapsible panel above the startups table):
- Segment `<Select>` with the 6 options + live recipient count (calls `getBroadcastRecipients` on segment change).
- Subject `<Input>` (required, max 120 chars).
- Optional Headline `<Input>` (renders as the big H1 in the email; defaults to subject).
- Body `<Textarea>` (min 300px, monospace-ish helper text explaining supported markdown: `**bold**`, `[link](url)`, `- bullets`, blank line = new paragraph).
- Live HTML preview panel on the right showing the rendered email inside a scaled iframe using the same shell markup.
- "Send test to me" button → sends only to admin email regardless of segment.
- "Send to N recipients" button with confirm dialog ("This will email N founders. Continue?").
- On send: progress toast, then result toast (`Sent 42 · 0 failed` or shows first few errors).

## 4. No schema changes

All data comes from existing `auth.users` + `startups`. No migrations needed.

## 5. Template design refresh (light touch)

The existing `shell()` in `send-email/index.ts` is already the branded card layout used across all templates. For the broadcast:
- Reuse `shell()` exactly (consistency across the product).
- Headline uses existing H1 style.
- Body paragraphs use existing `p()` helper.
- CTA links use `#0a0a0a` to match brand.

If you want the whole template family restyled beyond that, say so and I'll add a second pass — but the current shell already matches the site theme, so this plan keeps templates visually consistent instead of forking a new design just for broadcasts.

## Technical notes

- Rate limit: 100ms delay between sends → ~600/min, well under Resend's 10 req/s.
- Each send is independent (individual `to`, auto-BCC admin) — recipients never see each other.
- Broadcast server fn runs on the worker; long lists (500+) will approach worker time limits — plan handles up to ~1000 recipients per invocation, which is fine for current scale.
- No logging table added; result toast + email_send_log (already populated by Resend hook) is the audit trail.
