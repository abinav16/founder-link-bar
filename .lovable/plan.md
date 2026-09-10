# Fix the misleading "Currently showing on your site" card

## What Aaron is actually seeing

The card is not lying about anything broken — it is just labelled wrong.

`src/routes/_authenticated/dashboard.tsx:137` builds that card by calling the widget pick endpoint once with `preview=true`. That endpoint (`src/routes/api/public/widget.pick.ts`) returns a **random, reciprocity-weighted pick** for each call. So:

- The card shows one random member, freshly drawn every time the dashboard loads.
- The real bar on his site draws its own random member per visitor, and rotates every 30 seconds.
- The two will almost never match, which is exactly what he reported.

Separately, his own listing (Zengech) can never appear on his own site: the pick query excludes the host startup. His banner does show on *other* members' sites — the screenshot he sent is someone else's site (developer.stockfit.io) showing a different member, which is normal rotation.

So there is no delivery bug. The dashboard wording promises a live state it doesn't have.

## Fix

Replace the single random pick with the truth, in two parts.

### 1. Card becomes "Recently shown on your site"

Instead of one random pick, list the last few startups that were **actually** displayed on his site, read from the impressions his own widget generated (`host_startup_id = his startup`), newest first, deduplicated by startup, with a relative timestamp ("2 min ago").

Sub-line under the title: "Your bar rotates every 30 seconds, so each visitor sees a different member."

### 2. Add a "Where your bar appears" counterpart

A second small block showing the sites his own listing was shown on recently (`shown_startup_id = his startup`, grouped by host), so he can answer his real question — "where is my banner running?" — instead of inferring it from a card that never shows him.

Keep the existing empty states for pending/unapproved listings.

## Technical notes

- New security-definer RPC pair, both scoped by startup id and cheap on the existing `impressions` indexes:
  - `public_host_recent_shown(_host uuid, _limit int)` → distinct `shown_startup_id` with name, description, website_url, logo_url, `last_shown_at`.
  - `public_startup_recent_hosts(_startup uuid, _limit int)` → distinct `host_startup_id` with host name, slug, logo, `last_shown_at`.
  Both restricted to the last 7 days and `LIMIT 8` to stay off full scans; grant execute to `authenticated`.
- `src/routes/_authenticated/dashboard.tsx`: loader drops the `preview=true` pick fetch and calls the two RPCs in the existing `Promise.all`; `current` state is replaced by the two lists.
- No change to `widget.pick.ts`, the loader script, or rotation behaviour.

## Reply to Aaron

Short note: the bar rotates every 30 seconds and picks a different member per visitor, so what he sees on any one page load is expected; his own listing never shows on his own site by design; the dashboard card was labelled as if it were live state and is being changed to show the members actually shown on his site recently, plus where his own banner has been running.
