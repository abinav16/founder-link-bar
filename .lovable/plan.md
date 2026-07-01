## What's happening on boltfox.net

The embed `<script src="https://startupbar.co/widget/loader.js" ...>` is in their HTML, so our HTML-scan says **Embed: Live** and their previous heartbeat (probably from an earlier test) left **Widget Health: Visible**. But the browser is refusing to execute our script:

```
Refused to load the script 'https://startupbar.co/widget/loader.js' because it violates
the following Content Security Policy directive: "script-src 'self' 'unsafe-inline'
https://www.googletagmanager.com https://static.cloudflareinsights.com ..."
```

boltfox.net ships a strict CSP that doesn't allow `startupbar.co` under `script-src`. Result: loader never runs → no iframe → no bar visible → no new heartbeats. Our current signals (HTML scan + last heartbeat) can't distinguish "installed but CSP-blocked" from "installed and working".

## Fix

Two parts:

### 1. Server-side CSP detection in `verify-install.ts`

When we fetch the site HTML, also read the `Content-Security-Policy` header (and any `<meta http-equiv="Content-Security-Policy">`). If the tag is present but the policy has a `script-src` (or `default-src` fallback) that doesn't allow `startupbar.co` / `*.startupbar.co` / `https:` / `*`, return a new state: `csp_blocked`.

Rules:
- If no CSP header/meta → treat as allowed (current behavior).
- Parse the effective `script-src` (fallback to `default-src`).
- Allowed if any of: `*`, `https:`, `startupbar.co`, `*.startupbar.co`, or an explicit `https://startupbar.co` entry.
- Otherwise → `csp_blocked`.

### 2. Admin "Embed" column state

Add a new pill in `src/routes/admin.tsx`:
- **CSP blocked** (red/amber) — takes priority over heartbeat freshness, since a stale heartbeat here is misleading.
- Tooltip: "Site's Content Security Policy is blocking startupbar.co/widget/loader.js. Ask the founder to add `https://startupbar.co` to their `script-src` directive."

### 3. Rejection reason template

Add one entry to the rejection modal in `admin.tsx`:  
**"CSP blocks our widget"** → email body explains the CSP issue and the one-line fix (`script-src ... https://startupbar.co;`).

### Files touched
- `src/routes/api/public/verify-install.ts` — parse CSP, return new `csp_blocked` state.
- `src/routes/admin.tsx` — render new pill, prioritize over heartbeat, add rejection template.
- `supabase/functions/send-email/index.ts` — add the `csp_blocked` rejection reason copy.

No DB migration needed — this is purely derived at read time.

## Immediate answer for boltfox.net

Ask them to update their CSP `script-src` to include `https://startupbar.co` (and `frame-src https://startupbar.co` if they also restrict frames). Their `Visible` widget-health badge is stale — from an earlier heartbeat before this CSP was in place; new heartbeats haven't arrived because the loader never executes.