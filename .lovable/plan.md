## Goal
Upgrade Step 2 of `/apply` so founders catch install issues themselves before submitting, add clear guidance for theme, padding, and common gotchas. Same page, richer verification + docs, cleaner design. No business-logic changes.

## What changes

### 1. Verification results — surface CSP and other failure modes
`verify-install` already returns `{ installed, cspBlocked, error }`. Update `checkInstallation()` and the result panel in `src/routes/apply.tsx` to render distinct states with actionable fix text:

- **Live** (`installed && !cspBlocked`) — green, "Script detected and running." Unlocks submit.
- **Blocked by CSP** (`installed && cspBlocked`) — red, explains their `Content-Security-Policy` disallows `startupbar.co`, shows the exact directives to add with a copy button:
  ```
  script-src https://startupbar.co;
  frame-src  https://startupbar.co;
  ```
  Blocks submit until re-verified.
- **Not detected** (`!installed`) — amber, existing "paste it in `<head>` and try again" copy, plus a "common causes" list (script in `<body>`, CDN cache, wrong domain typed, SPA route not yet hit).
- **Unreachable / error** — neutral, shows returned error.

Note: the "hidden by CSS" (`suspicious`) branch is intentionally NOT surfaced — the flag stays in the API for admin use only.

Submit button gate changes from `verifyStatus === "found"` to `"live"` AND not CSP-blocked.

### 2. New "How to install" guidance block
Below the embed code, a compact accordion (native `<details>`/`<summary>`, no new deps) with three sections:

- **Where to paste it** — `<head>` recommended, works in `<body>`. Framework snippets: Next.js (`app/layout.tsx`), Astro (`Layout.astro`), WordPress (header.php or a header-scripts plugin), Webflow (Project Settings → Custom Code → Head), Framer (Site Settings → Custom Code), plain HTML.
- **Theme (light / dark)** — the widget auto-detects the host site's theme via `prefers-color-scheme` and the `.dark` class on `<html>`. To force a theme, add `data-theme="dark"` or `data-theme="light"` on the script tag. Shows the modified snippet with a copy button.
- **Keep your header from hiding behind the bar** — the widget is 36px tall and pinned to the top. The loader already tries to shift `fixed`/`sticky` headers automatically, but if your header still sits under the bar, add this CSS as a manual fallback:
  ```css
  /* Nudge a fixed header down by the StartupBar height */
  header.your-header { top: 36px; }
  /* Or add breathing room to the page body */
  body { padding-top: 36px; }
  ```
  Also mention: on mobile, if the site jumps slightly on load, that's the auto-shift; setting the padding manually removes the jump.
- **Troubleshooting** — CSP fix (same directives as above), SPA / client-side routers (loader re-mounts on `pushState`), cache-busting tip (hard reload), and how to remove the widget cleanly (delete the script tag).

### 3. Design polish (Step 2 only)
- Group "embed code → verify → guide" inside one bordered card region so the page reads as a single install checklist.
- Small numbered pills at the top of Step 2: `1 Paste · 2 Verify · 3 Submit`.
- Verification card gets a status-colored left border matching the current state.
- Site summary chip (favicon + name + Edit) stays; Submit CTA and copy at the bottom stay the same.
- No token or font changes. Step 1 untouched.

### 4. Safety
- Only file touched: `src/routes/apply.tsx`.
- No changes to `verify-install.ts`, edge functions, DB, payment flow, or Step 1.
- Resubmit auto-check now surfaces the exact reason (e.g. CSP) so founders can fix before re-submitting — bonus reduction in rejection loops.
- No new npm packages.

## Technical details

- Extend `verifyStatus` union to `"idle" | "checking" | "live" | "csp" | "not-found" | "error"`. Map response: `cspBlocked → "csp"`, `installed → "live"`, else `"not-found"` / `"error"`. `suspicious` is ignored client-side.
- Rename existing `"found"` → `"live"`; update submit-gate condition and helper text accordingly.
- New small in-file components: `InstallGuide` (accordion), `CopyableCode` (thin wrapper around the existing copy pattern), `VerifyStatusPanel`.
- All existing state, effects, payment logic, and submit handler unchanged.
