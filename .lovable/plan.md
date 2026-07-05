## Goal

The welcome-page globe currently mixes two very different things into one "today" number:

1. Widget-bar impressions shown on partner startups' sites (the bar loading on someone else's page)
2. Actual visits that land on `startupbar.co` (direct, search, and clicks from widget bars)

You only want #2 on the homepage globe: real landings on `startupbar.co`. Widget impressions belong on each startup's dashboard, not on the global welcome map.

## How landings are already tracked

Every pageview on `startupbar.co` fires `POST /api/public/track/site-visit`, which inserts an `impressions` row with:

- `shown_startup_id = STARTUPBAR_SITE_ID` (the marker row for the marketing site)
- `host_startup_id = null`
- `referrer` = the actual HTTP referrer (Google, Twitter, `startupbar:<domain>` for widget-bar clicks, or empty for direct)
- `path` = the URL path the visitor landed on (`/`, `/pricing`, `/leaderboard`, …)

Widget-bar impressions on partner sites use different rows (`host_startup_id = <partner>`), so filtering on `shown_startup_id = STARTUPBAR_SITE_ID` cleanly isolates landings.

## Changes (frontend only)

File: `src/components/LiveVisitorMap.tsx`

1. In `refreshData()` (the initial + 30s poll query), when `networkMode` is true and no `scopeStartupId` is set, add `.eq("shown_startup_id", STARTUPBAR_SITE_ID)` to the `impressions` select.
2. In the realtime subscription (the `postgres_changes` filter), when `networkMode` is true and no `scopeStartupId`, use `shown_startup_id=eq.<STARTUPBAR_SITE_ID>` instead of the unfiltered subscription so live pins only include real landings.
3. Add the `STARTUPBAR_SITE_ID` constant at the top of the file (same value already used server-side in `track.site-visit.ts`).

No change needed for the "Recent visitors" panel — it already renders `cleanPath(f.path)` under each visitor, so once the feed is scoped to `startupbar.co` rows every entry will naturally show which page they landed on (`/`, `/pricing`, `/leaderboard`, etc.).

Dashboard behavior stays exactly as it is (already scoped by `host_startup_id` per startup). Nothing changes for partner startups.

## Result

- Welcome page globe count = only humans who actually opened a `startupbar.co` page today (direct + referral + widget clicks that landed here).
- Recent visitors feed on the welcome page = a live list of those landings, each showing the exact path visited.
- Widget impressions on partner sites no longer inflate the homepage number.
