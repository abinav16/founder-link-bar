# Why StartupBar is always first, and how to stop it

## What the data shows

StartupBar's lifetime numbers: 6,921 impressions received, 294 clicks, 10,993 impressions given.
Next best startup is VerifiedMRR at 3,007 impressions.

Where StartupBar's 6,921 impressions come from:

```text
3,428   startupbar.co itself (no host site)
  671   Technical AI
  445   Zest Win
  357   park.fan
  239   TheMarketContext.com
  ...    rest of the network
```

So it is not winning on merit. Half its impressions come from the widget we run on our own site, and the rest come from being in the normal rotation on member sites like every other startup. That double counting puts it permanently at the top of the leaderboard and trending, which is exactly what the Reddit commenter noticed.

Given impressions (10,993) is also the highest in the network, which under the reciprocity weighting pushes it toward the 4x delivery cap, compounding the lead.

## The fix

Treat the StartupBar entry as a house listing rather than a competing startup:

1. Hide it from the public leaderboard (both received and given tabs).
2. Hide it from the network page: trending today, new this week, recently active, and the directory list.
3. Keep network wide totals (impressions, clicks, CTR) unchanged, so headline numbers stay accurate.
4. Keep it in the widget rotation and as the non member fallback, and keep its own dashboard and public page working.

Nothing is deleted, no data changes, no migration. It just stops appearing in the public rankings.

## Technical notes

- Add a shared constant for the house id `0d2db708-f4e9-4b77-bd83-c446826c76b1` (e.g. `src/lib/house.ts`) instead of repeating the literal.
- `src/lib/leaderboard.functions.ts`: filter the house id out of the `startups` query result before ranking, keep the stats RPC calls unchanged.
- `src/lib/network-dashboard.functions.ts`: filter the house id out of `cards` after they are built, so `stats.totalImpressions` / `totalClicks` (which come from `public_network_totals_all`) stay untouched, while `recentStartups`, `newThisWeek`, `recentlyActive` and trending lose the house row.
- No change to `src/routes/api/public/widget.pick.ts`, `widget.click.ts`, or any RLS policy.
