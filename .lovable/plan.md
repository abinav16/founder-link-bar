## Why only one startup shows

"Trending Today" = top 3 approved startups by clicks, filtered to `clicks_24h > 0`.

Despite the name, `clicks_24h` is **not** a rolling 24 hours. The `public_startup_24h` database function counts from `date_trunc('day', now() AT TIME ZONE 'UTC')` — i.e. since UTC midnight.

Verified against live data at 03:13 UTC:
- Since UTC midnight: exactly 1 startup has a click (Blubber OS, 1).
- Rolling last 24 hours: 20+ startups with clicks (StartupBar 10, Blubber OS 4, park.fan 4, Securelint 3, StopBurnout 3, VerifiedMRR 3, ...).

So the section collapses to 1-2 cards every night after UTC midnight and only fills up late in the UTC day. It also causes an ugly 1-card grid in a 3-column layout.

## Fix

1. Change `public.public_startup_24h` (new migration, `CREATE OR REPLACE`) to use a true rolling window: `created_at >= now() - interval '24 hours'` for both impressions and clicks. Keep the `referrer IS DISTINCT FROM 'dev-simulate'` filter, `SECURITY DEFINER`, and `SET search_path = public` as-is.
2. In `src/routes/network.tsx`, make the trending block resilient:
   - Keep top 3 by `clicks_24h`, tie-broken by `impressions_24h`.
   - If fewer than 3 startups have clicks, backfill the remaining slots with the highest `impressions_24h` startups (still excluding zero-activity ones) so the row rarely renders as a lone card.
   - Only render the section when there are at least 2 entries; otherwise hide it.
3. Relabel to "Trending — last 24h" so the window matches the wording.

Note: this also affects any other place reading `impressions_24h` / `clicks_24h` from the network dashboard (the network card metrics), which will now show rolling-24h numbers instead of since-midnight — that's the more intuitive reading of "today" for those labels too, and card copy saying "impressions today" will be updated to "last 24h".

## Verification

Re-run the aggregation query after the migration and confirm the RPC returns the rolling-24h counts, then check `/network` renders three trending cards.
