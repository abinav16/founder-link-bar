# park.fan & skilldiscs.com — findings, outreach emails, and better install detection

## What I found

**park.fan — widget removed.** No `startupbar` reference anywhere in the page HTML, and a real browser load makes zero requests to startupbar.co. The script was taken out.

**skilldiscs.com — installed, but effectively never loads.** Their page contains the loader with id `7d1538e4-f847-4f7e-a9a4-f693e284a94b`, wrapped in two self-imposed restrictions:
- Front page only (`/`, `/de`, `/fr`, `/es`); a CSS rule `html[data-sb-off] … { display:none !important }` hides the bar on every other route.
- Injected only after `load` + idle.

And on top of that, their Termly consent auto-blocker (`app.termly.io/resource-blocker?autoBlock=on`) swallows third-party scripts until a visitor accepts cookies. In a real browser on their front page, after 10s: no startupbar script tag, no request — their own Google Analytics tag was blocked too. So most visitors never see the bar.

## Part 1 — Founder emails (drafts to review before sending)

Two ready-to-send drafts, surfaced in chat for you to copy:
- park.fan: script removed, reciprocity paused, one-line reinstall snippet, ask if something broke.
- skilldiscs.com: script present but blocked by Termly + front-page-only gating; ask them to allowlist `startupbar.co` as an essential/unblocked script in Termly and consider running the bar site-wide.

## Part 2 — Admin detection upgrade

Today the embed check only reads raw HTML, so it cannot see either of these cases. It reports skilldiscs as "installed" even though the script never executes for visitors.

### `src/routes/api/public/verify-install.ts`

Add two new signals to the JSON response:

- `consentBlocked` — detect a known consent/auto-block script in the HTML (Termly `resource-blocker?autoBlock=on`, Cookiebot `data-blockingmode`, OneTrust `otSDKStub`, CookieYes) present alongside our loader. Return the vendor name so the tooltip can name it.
- `conditionalInstall` — the loader is not a plain static `<script src="https://startupbar.co/widget/loader.js">` in the markup, but appears inside inline JS (`load('https://startupbar.co/widget/loader.js', …)`, `createElement('script')`), and/or there is a CSS rule that hides `[data-startup-id]` / `iframe[src*='startupbar.co']` behind a state attribute. Also capture the `data-startup-id` value from the inline call, so the wrong-id check keeps working for these sites.

Both keep the existing `installed: true`, but flag delivery risk.

### `src/routes/admin.tsx`

- Extend the `EmbedState` "installed" variant with `consentBlocked: boolean`, `consentVendor: string | null`, `conditionalInstall: boolean`.
- Add two badge states after `csp-blocked` in the precedence chain:
  - `consent-blocked` (amber) — "Installed, but a cookie-consent blocker stops the script from loading for most visitors".
  - `conditional` (amber) — "Installed via inline JS and/or gated to certain pages — the bar may not render for all visitors".
- Precedence becomes: `wrong-id > csp-blocked > consent-blocked > heartbeat-live > removed > hidden > conditional > installed-unseen > missing`.
- Tooltips name the vendor / the restriction so outreach is one click.
- Do not auto-clear a warning when `consentBlocked` or `conditionalInstall` is set (extend the existing `!suspicious && !cspBlocked && !idMismatch` condition).

No database or migration change.

## Notes

Detection stays HTML-based (no headless browser in the request path), so `conditional`/`consent-blocked` are heuristics — deliberately amber "needs a look", not red "broken".
