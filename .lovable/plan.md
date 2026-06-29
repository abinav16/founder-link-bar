## Three separate problems, three fixes

### 1. Rejection / warning / removal emails look "classic"

In `supabase/functions/send-email/index.ts`, only `startup-approved` uses the branded shell (neutral background, StartupBar pill badge, white card, refined typography, footer). The other three types — `startup-rejected`, `startup-warning`, `startup-removed-no-widget` — still use raw `<p>` tags.

**Fix:** Rewrite the HTML for all three using the same shell as `startup-approved`, keeping per-type copy. Also fix two stale URLs in the warning/removal copy that point to `startupbar.dev` (should be `startupbar.co`) and the wrong widget snippet.

### 2. No admin email when a startup is submitted

This is the real bug — not a domain issue. `src/routes/apply.tsx` calls `send-email` with two types:

- `startup-submitted` (founder confirmation)
- `admin-new-application` (admin notification)

Neither of these types exists in `send-email/index.ts`. The function hits the final `else` and returns `400 Unknown email type`, so nothing is sent — and because the call is fire-and-forget (`.catch(() => {})`), the failure is silent. The BCC mechanism never runs because the send never happens.

**Fix:** Add two handlers in `send-email/index.ts`:
- `startup-submitted` → branded "We received your application for {name}" email to the founder, explaining the 24h review window.
- `admin-new-application` → branded email to `danielabinav16@gmail.com` (sent as `to:`, not BCC) with startup name, website, one-liner, applicant email, and a link to `/admin`. This handler reads `data.startupName`, `data.startupUrl`, `data.description`, `data.applicantEmail` directly — it does not look up a startup row (the apply flow doesn't pass `startupId` for these two types).

Refactor the top of the function so the startup/user lookup only runs for the founder-targeted types, not for the admin notification.

### 3. Signup confirmation emails not arriving for users

This is a separate system from `send-email`. Signup/confirmation/password-reset emails are sent by the auth layer, not by your edge function. Right now this project has **no email domain configured**, so Lovable's managed auth-email pipeline is not active. Auth emails are either falling back to Lovable's default (low-volume, often filtered) or not being sent at all depending on auth config.

**Fix:** Set up a proper sender domain and Lovable's managed auth-email templates so signup/confirmation/reset emails actually deliver from `@startupbar.co`. Because this requires DNS work on your domain, I'll surface the setup dialog as part of the implementation — you'll click through it once, then auth emails will route through the same verified pipeline as the rest of your branded mail. No code changes needed in your auth flow.

While we're there, I'll also brand the six auth templates (signup confirm, magic link, password recovery, invite, email change, reauthentication) to match the StartupBar look — same pill badge, white card, footer — so users get a consistent experience from the very first email.

## Out of scope

- `send-weekly-digest` already has its own branded shell — no changes.
- No changes to send-flow logic, the BCC mechanism, or any other route/file.
- No changes to Supabase auth settings (auto-confirm, signup toggle, etc.) — only the email delivery path.

## Verify

1. Submit a test startup → confirm founder gets a branded "we received it" email AND `danielabinav16@gmail.com` gets the admin notification.
2. Reject a test startup → confirm the rejection email is now branded.
3. After DNS verifies for the email domain, sign up a new test user → confirm the confirmation email arrives and is branded.
