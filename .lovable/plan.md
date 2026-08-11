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
  239   Kustiq
  185   NotepadPlus
  169   Hunch
  ...    rest of the network
```

So it is not winning on merit. Half its impressions come from the widget we run on our own site, and the rest come from being in the normal rotation on member sites like every other startup. That double counting puts it permanently at the top of the leaderboard and trending, which is exactly what the Reddit commenter noticed.

Given impressions (10,993) is also the highest in the network, which under the reciprocity weighting pushes it toward the 4x delivery cap, compounding the lead.

## Suggested public reply

Use this transparent-but-smart tone:

> Thanks for the honest feedback — it’s a fair thing to call out. We do list our own page on the network because it is technically a member site with the widget installed, and the leaderboard is purely impression-based. The numbers are public: we’ve received ~6.9k impressions, ~3.4k of which are from our own homepage traffic, and the rest from the same rotation every other startup is in. If any member startup passes that number, it will take the top spot automatically — there is no manual boost or special treatment. That said, we totally understand that it looks like self-promotion, so we’re going to either hide the StartupBar row from the public leaderboard or add a clear "house / network" label so the spotlight stays on the actual founders. Appreciate you keeping us honest.

## The fix options

Pick one:

1. **Hide it** (default recommendation): keep the StartupBar house listing out of the public leaderboard and the network directory. Network-wide totals stay the same. No data is deleted.
2. **Label it as house**: keep the row but mark it "Network / StartupBar" and exclude it from the "Trending today" and "Recently active" sections so it does not dominate those spotlight slots.

## Technical notes if we hide it

- Add a shared constant for the house id `0d2db708-f4e9-4b77-bd83-c446826c76b1` (e.g. `src/lib/house.ts`) instead of repeating the literal.
- `src/lib/leaderboard.functions.ts`: filter the house id out of the `startups` query result before ranking, keep the stats RPC calls unchanged.
- `src/lib/network-dashboard.functions.ts`: filter the house id out of `cards` after they are built, so `stats.totalImpressions` / `totalClicks` (which come from `public_network_totals_all`) stay untouched, while `recentStartups`, `newThisWeek`, `recentlyActive` and trending lose the house row.
- No change to `src/routes/api/public/widget.pick.ts`, `widget.click.ts`, or any RLS policy.
