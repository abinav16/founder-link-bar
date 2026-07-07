## Review of the security fixes — what still works and what breaks

I audited each recent security change against the actual callers and third-party embed environment. Three real UX problems and two small robustness gaps stand out.

### 1. Welcome email is silently broken for email/password signups (bug)

`src/routes/auth.tsx:192` calls `send-email` with `type: "welcome"` immediately after `supabase.auth.signUp(...)`.

- With email confirmation enabled (the default), the user has **no session** at that moment.
- `send-email` now requires a Bearer token, so this call returns 401.
- The call is wrapped in `.catch(() => {})`, so the failure is silent — new users just never get the welcome email.

Fix: move the welcome email trigger to run after the user actually signs in for the first time (e.g. inside the `onAuthStateChange` `SIGNED_IN` handler, guarded by a "welcomed" flag) — or drop the welcome email entirely if the confirmation email already covers this. Simplest: send it on first `SIGNED_IN` for a user, using their now-active session token.

### 2. Widget heartbeat fails on legitimate installs (bug)

`src/routes/api/public/widget.heartbeat.ts` now requires `Origin`/`Referer` host to match the registered `website_url` host after stripping `www.`. Two real cases this breaks:

- **Subdomain installs.** A startup registered with `https://example.com` that embeds the widget on `https://app.example.com` or `https://blog.example.com` will get 403 on every heartbeat. Admin observability then shows "widget hidden" indefinitely for a compliant install.
- **Strict `Referrer-Policy`.** Sites that set `Referrer-Policy: no-referrer` (or a CSP that strips referrer) send no `Referer` for the `img` request. Same 403, same false-negative in admin.

Fix: match on registered hostname OR any subdomain of it (`origin === expected || origin.endsWith('.' + expected)`), and when the referer header is missing but the request has a valid startup id, allow the write but store an extra flag (or just don't 403 — the endpoint is bookkeeping-only, so a soft downgrade preserves the security intent). Recommended: strict subdomain match + accept-no-referer without failing.

### 3. `verify-install` race on cold session (minor bug)

`src/routes/apply.tsx`, `dashboard.tsx`, and `admin.tsx` now call `supabase.auth.getSession()` right before fetching `/api/public/verify-install`. On a hard refresh, `getSession()` can resolve before the session is fully hydrated, giving `undefined` → 401 → the UI shows a generic "site check failed" instead of the real answer.

Fix: fall back to `supabase.auth.getUser()` (which awaits hydration) when `getSession()` returns no token, and show a specific "Please sign in and retry" message on 401 instead of the generic error.

### 4. Checkout return_url allowlist may be too narrow (edge case)

`supabase/functions/create-dodo-checkout/index.ts` allows `startupbar.co`, `www.startupbar.co`, `founder-link-bar.lovable.app`, and any `*.lovable.app` subdomain. Preview URLs match. But **stable public URLs** like `project--7fd8f0db-1302-42bd-a7c7-8b3953d3a50f.lovable.app` and `project--<id>-dev.lovable.app` are also `.lovable.app`, so they pass. Good.

Gap: if a custom domain other than `startupbar.co` is ever added, checkouts on that domain will 400 with "Invalid return_url" and no user-facing hint. Low priority — flag it in a code comment so future custom-domain work knows to update the allowlist.

### 5. Admin-new-application `startupUrl` escapes to `#` on odd inputs (minor)

Now that `startupUrl` is URL-parsed and downgraded to `"#"` when parsing fails, an applicant who submits `example.com` (no scheme) will get `"#"` in the admin email link. Not a security issue, but the admin loses a working click-through. Fix: try prepending `https://` if the raw string has no scheme before rejecting.

## What is fine (no action needed)

- `send-email` admin-only gate on approved/rejected/warning/removed types — all callers in `admin.tsx` are the admin user.
- `startup-submitted` deriving email from the caller — apply.tsx caller is the authenticated founder.
- `create-dodo-checkout` deriving email from JWT — apply.tsx already uses the authenticated user's email.
- Search_path fix on queue functions — no runtime behavior change.

## Technical details

Files to change:
- `src/routes/auth.tsx` — remove immediate welcome invoke; add first-sign-in welcome via `onAuthStateChange` in the root subscriber (or `auth.tsx`), guarded by a `user_metadata.welcomed` flag or localStorage key.
- `src/routes/api/public/widget.heartbeat.ts` — allow subdomain match; treat missing referer as a soft-pass (log but don't 403); keep the cross-startup spoof defense for cases where a wrong host IS present.
- `src/routes/apply.tsx`, `src/routes/_authenticated/dashboard.tsx`, `src/routes/admin.tsx` — fall back to `getUser()` when `getSession()` yields no token; surface 401 as an explicit "sign in and retry" toast/state.
- `supabase/functions/create-dodo-checkout/index.ts` — add a code comment near `ALLOWED_RETURN_ORIGINS` noting future custom domains must be added here.
- `supabase/functions/send-email/index.ts` — in `admin-new-application`, try `https://` prefix before falling back to `"#"` so plain-domain submissions still produce a clickable link.

No database migration is required for these fixes.
