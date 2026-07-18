# Fix: dashboard globe shows "Direct" for StartupBar-referred visitors

## Root cause

On a startup's own dashboard, the "Live visitors" globe reads rows from `impressions` where `host_startup_id = <this startup>` and resolves the referrer from `impressions.referrer`.

Those rows are inserted by `src/routes/api/public/widget/pick` (called from the widget iframe on every pageview). That handler inserts only `shown_startup_id` and `host_startup_id` — it never writes `referrer`, `country`, `device`, `os`, `browser`, or `path`. Verified in `src/routes/api/public/widget.pick.ts`.

And the widget loader (`public/widget/loader.js`) never forwards the host page's `document.referrer` into the iframe, so even if the picker wanted the referrer it can't see it (the iframe is cross-origin and can't read parent context).

Result: for a visitor who clicks a startup on `startupbar.co/leaderboard` and lands on e.g. `notepadplus.com`, the impression row that fires when the widget loads has `referrer = null`, and `LiveVisitorMap.resolveReferrerSync` falls through to `"Direct"`. Same reason "Devices" shows only "Unknown" on the dashboard.

The existing `sbref` / `utm_source=startupbar` path only fires when the outbound link from a widget/leaderboard adds `?utm_source=startupbar`. Regular clicks from `startupbar.co/leaderboard` don't carry that param, so they're only recoverable via the browser `Referer` header.

## Changes

1. **`public/widget/loader.js`** — pass the parent-page referrer into the iframe URL as `pref` (only when non-empty), URL-encoded and length-clamped. Keep existing `sbref` behavior.

2. **`src/routes/widget.bar.tsx`** — read `pref` search param and forward it to `/api/public/widget/pick` as `pref` alongside existing `sbref`.

3. **`src/routes/api/public/widget.pick.ts`** — when inserting the impression row, populate:
   - `referrer`: prefer `sbref` if present (keeps the "StartupBar" bucket working), else use `pref`.
   - `country`: from `cf-ipcountry` header (fall through to `ipapi.co` like `track/site-visit.ts` if header is missing/`XX`/`T1`).
   - `device` / `os` / `browser`: parse `user-agent` header with the same helper shape used in `track/site-visit.ts` (extract to `src/lib/ua.ts` and reuse in both files).
   - `path`: from the existing `path` query param (already sent by loader → iframe).
   Keep the response body identical (still `Response.json(pick)`); the enrichment happens only inside the insert.

4. No DB migration needed — `impressions.referrer`, `country`, `device`, `os`, `browser`, `path` already exist and are already what `LiveVisitorMap` reads.

## Result

- Dashboard globe: a leaderboard/network click that lands on the startup's site now shows under **StartupBar** (via `resolveReferrer`'s `startupbar` prefix path when `sbref` is set) or under **startupbar.co** (via `parseExternalReferrer`) when only the browser Referer is available.
- Country and Device panels on the per-startup dashboard start reflecting real data instead of "US / Unknown".
- Existing network/welcome-page globe is unaffected (it scopes to `shown_startup_id = STARTUPBAR_SITE_ID` and gets its own referrer from `track/site-visit`).

## Not in scope

- Not touching the network map, `track/site-visit`, or admin widget-health logic.
- Not adding new columns or RPCs.
- Not backfilling past impression rows — only new impressions after deploy will have referrer/device.
