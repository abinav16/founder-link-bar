## What's happening

Your GA tag fires a pageview immediately from `<head>`, before React renders and sets the document title. So GA records the hit with no page title → "(not set)". Also, because StartupBar is a single-page app, GA only ever sends one pageview per full page load; when a visitor moves from `/` to `/network` or `/leaderboard`, no new pageview is sent at all.

That's why you see users and `page_view` events but no page titles and "No data available" in "Views by page title".

Your routes DO have proper titles defined (`StartupBar — Free traffic exchange for founders`, `Network — StartupBar`, etc.), so once the timing is fixed the real names will show up.

## Fix

1. In `src/routes/__root.tsx`, change the gtag init to `gtag('config', 'G-EKLMW549YK', { send_page_view: false })` so the premature, title-less hit is suppressed.
2. Add a small client-side tracker (new `src/lib/analytics.ts` + a `useEffect` in the root component) that subscribes to router navigation and, after each navigation settles (title applied), sends:
   `gtag('event', 'page_view', { page_title: document.title, page_location: window.location.href, page_path: location.pathname + location.search })`
   This also covers the first load.
3. Guard against duplicate sends for the same path and skip when `gtag` isn't loaded (ad blockers).

## Notes

- Data already collected stays "(not set)" — GA can't backfill. New traffic from the moment this ships will show correct page names.
- Widget-driven landings on `startupbar.co` will now be attributed to the exact page they land on (usually `/`), visible in Realtime pages within minutes of deploying.
