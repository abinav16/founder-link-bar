## Two issues

### 1. "Refused to connect" isn't detected → blank iframe stays blank
When a site sends `X-Frame-Options: DENY` or a frame-ancestors CSP, the browser shows its own "refused to connect" page inside the iframe. That is **not** a network error, so `onError` never fires, and because it's cross-origin we can't read `contentDocument` either — our current detector only catches the "empty same-origin doc" case, so we never flip to the Microlink fallback.

**Fix:** switch to a proactive server-side probe instead of client detection.

- Add a lightweight server function `probeIframeEmbed({ url })` that does a `HEAD` (fallback `GET`) to the site and inspects:
  - `x-frame-options` → `deny` / `sameorigin` = blocked
  - `content-security-policy` → any `frame-ancestors` that doesn't include `*` or our origin = blocked
  - non-2xx / network failure = blocked
- Call it from the `startup.$slug` loader in parallel with `getStartupPage`, cache the result on the `startups.iframe_blocked` column (write-through), and pass it to `<StartupEmbed initialBlocked>`.
- In `StartupEmbed`, when `initialBlocked` is true render the Microlink screenshot immediately with an "Open site ↗" CTA — no flash of broken iframe.
- Also add a client-side safety net: if the iframe hasn't fired `load` within 3.5s, assume blocked and swap to the screenshot (covers slow/hanging cases like the current one).
- Improve the fallback UI: nicer empty-state framing, "This site can't be embedded — here's a live snapshot" copy, plus a prominent "Open themarketcontext.com" button.

### 2. Founder details are missing from the page
The founder block only renders when `founder_name`, `founder_quote`, or `founder_avatar_url` exists. For themarketcontext.com none are filled in, so the whole block disappears — that's why "founder details" look missing.

**Fix (presentation only, no forced signup):**
- Always render a "Founder" section on the profile page.
- When the founder hasn't filled anything in Account settings, show a soft placeholder card:
  - Neutral avatar circle with the startup's initial
  - "Founder of {startup name}" as the primary line
  - Muted italic line: *"The founder hasn't shared their story yet."*
  - If the current viewer owns this startup → small "Add your story" button linking to `/account` (founder fields section).
- When partial data exists (e.g. quote but no avatar), render whatever is present with the same layout — no empty gaps.
- Also surface a "Missing founder details" nudge on the owner's `/dashboard` so they know to fill it in.

### Files touched
- `src/lib/startup-page.functions.ts` — add `probeIframeEmbed` server fn, call in loader, persist `iframe_blocked`.
- `src/components/StartupEmbed.tsx` — respect `initialBlocked`, add load-timeout fallback, polish blocked-state UI.
- `src/routes/startup.$slug.tsx` — always render founder section with placeholder + owner CTA; wire probe result into embed.
- `src/routes/_authenticated/dashboard.tsx` — small "Complete your founder profile" nudge when fields are empty.

No DB migration needed — `iframe_blocked`, `founder_name`, `founder_quote`, `founder_avatar_url` already exist.
