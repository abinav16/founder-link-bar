## Scope

Confirm the widget-click attribution fix works for every startup's dashboard globe, and extend the same StartupBar attribution to the homepage globe (startupbar.co landings).

## 1. All startups' dashboards — yes, it's global

The change in `src/routes/api/public/widget.click.ts` + `public/widget/loader.js` + `src/routes/api/public/widget.pick.ts` is not per-startup. Any widget click → destination site with the StartupBar loader will now:
- carry `_sbvia=<host domain>` on the redirect
- the destination's loader reads it and sends `sbref=startupbar:<host>` to `widget.pick`
- new impressions get `referrer = https://startupbar.co/` (or `startupbar:<host>`) instead of empty
- every startup's `LiveVisitorMap` groups them under "StartupBar" instead of "Direct"

No per-startup code path — one fix covers all.

## 2. Homepage globe (startupbar.co landings from widget clicks)

Today, when someone clicks a widget on another site and the destination is `startupbar.co` itself, the redirect lands on our own site. Our site-visit tracker (`src/routes/api/public/track.site-visit.ts`) records the impression, but the incoming URL now contains `_sbvia` / `utm_source=startupbar` — we should honor that and label the referrer as `startupbar:<host>` rather than trusting `document.referrer` (which can be empty on 302).

Change in `track.site-visit.ts` (or its client caller in the homepage tracker):
- If the landing URL has `utm_source=startupbar` or `_sbvia=<host>`, set the stored `referrer` to `https://startupbar.co/` with source `startupbar:<host>` so the homepage globe's `LiveVisitorMap` classifies it as StartupBar network traffic instead of Direct.

## 3. Backfill

Run one more targeted backfill for recent startupbar.co landings that came in with empty referrer but have a matching outbound click from a widget host in the prior 10 minutes — mirror of the earlier global backfill, scoped to `shown_startup_id = STARTUPBAR_SITE_ID`.

## Files to edit

- `src/routes/api/public/track.site-visit.ts` — parse `_sbvia`/`utm_source=startupbar` from the landing URL and set referrer accordingly.
- (Optional) client caller that posts to `track.site-visit` — forward `window.location.search` so the server sees the params.
- SQL backfill via migration/insert tool for recent startupbar.co landings.

## Not changing

- `LiveVisitorMap.tsx` classification logic already handles `startupbar:*` referrers, so no UI change needed.
- Existing per-startup dashboards — already covered by the previous turn's fix.
