# Why PreShip Validation shows 0 impressions

## What the data actually says

I queried the `impressions` table grouped by `host_startup_id` (the site running the embed) and `shown_startup_id` (the startup displayed in the bar):

```
host = PreShip       → shown = Notepad      : 17
host = PreShip       → shown = VerifiedMRR  : 12
host = Notepad       → shown = VerifiedMRR  :  6
host = VerifiedMRR   → (nothing)            :  0
```

Two facts fall out of this:

1. **PreShip is never the `shown_startup_id`.** That's why its analytics card is 0. Impressions only count when *someone else's* site shows your startup in their bar — they don't count when your own site shows other startups.
2. **VerifiedMRR's site is not generating any impressions as a host.** Either the embed isn't installed on verifiedmrr.in, or it is being blocked (e.g. the iframe guard we added — if their script tag is only inside a nested iframe context, the loader correctly bails).

## Why PreShip hasn't been picked yet

The pick endpoint (`/api/public/widget/pick`) is a uniform random choice across all approved startups except the host and any startup whose `website_url` matches the current page domain. With only 3 approved startups and very little traffic:

- PreShip's own bar (29 impressions) can't show PreShip — host exclusion.
- Notepad's bar has only fired 6 times so far and random luck gave all 6 to VerifiedMRR. With ~6 samples, getting 6/0 vs 3/3 is normal variance — no bug.
- VerifiedMRR's bar would be the other place PreShip could appear, but it has logged **zero** impressions — meaning the loader isn't running on verifiedmrr.in at all right now.

So PreShip's count is 0 because the only host site producing impressions during this window (Notepad, low traffic) happened to randomly pick VerifiedMRR each of the 6 times. Nothing is filtering PreShip out.

## What to check / do next

1. **Confirm the embed is live on verifiedmrr.in.** The admin "Embed" column we just added can do this — if VerifiedMRR shows "Not installed" or "Unreachable", that explains the missing host-side impressions and is the bigger issue.
2. **No code change needed for the picker** — it already includes PreShip as a candidate. Once VerifiedMRR's embed is firing and Notepad gets a few more page views, PreShip impressions will appear naturally.
3. **Optional fairness improvement (only if you want it):** swap the uniform random pick for a weighted pick that favors the startup with the fewest impressions in the last N days. This guarantees newcomers like PreShip ramp up faster instead of waiting on random variance. I can implement this in `widget.pick.ts` if you want — say the word and I'll add it to a follow-up plan.

## Summary

PreShip is at 0 because (a) impressions only count on *other* sites' bars, and (b) the only other site currently producing impressions is Notepad, which has only fired 6 times and randomly picked VerifiedMRR for all of them. Nothing is broken — but VerifiedMRR's site appears to not be running the loader, which is worth verifying via the new Embed column in admin.
