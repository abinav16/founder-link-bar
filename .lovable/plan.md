# What the data actually says (verified)

Queried the live DB before writing anything:

- 58 approved startups; 23,538 network impressions in the last 7 days.
- park.fan has **given 1,970** impressions and **received 81** since joining (Jul 28).
- Since park.fan joined, the whole network served **6,373** impressions. Of those, 1,970 happened on park.fan's own site — where park.fan is excluded from its own bar. So the pool it could win from was ~4,400, and 4,400 / 58 ≈ **76 expected**. It received **81**.

So there is no filtering or penalty on new accounts — the delivery algorithm (`src/routes/api/public/widget.pick.ts`) is a **uniform random pick** across all approved startups, and park.fan got slightly more than its fair share of it. The 23.8x ratio is purely because park.fan is currently one of the largest traffic contributors in the network: it supplies ~30% of all impressions but, under uniform random, receives 1/57 of them. Uniform random is fair per-impression, but it is *not* reciprocal — big contributors always subsidise small ones.

# Proposed change: reciprocity-weighted delivery

Replace the uniform pick with a weighted pick so contribution influences delivery, without starving small/new sites.

- Weight each eligible startup by `1 + k * (impressions_given_7d / avg_given_7d)`, capped (e.g. max 4x) and floored at 1x.
- Small and brand-new startups keep their baseline 1x share, so no one is excluded.
- Backed by a new `SECURITY DEFINER` RPC returning `(startup_id, weight)` for the last 7 days, cached briefly (60s) in the pick endpoint so it stays fast.
- Effect for park.fan: roughly 3-4x its current received volume, without breaking the leaderboard or existing stats.

## Technical notes

- New RPC `public.widget_pick_weights()` — 7-day given counts per approved startup, grants to `anon`/`authenticated`, `search_path = public`.
- `widget.pick.ts`: fetch weights alongside the startup list, build a cumulative-weight array, pick from it instead of `Math.random() * filtered.length`. Host-exclusion and own-domain filtering stay unchanged.
- No schema/table changes, no impact on impressions/clicks recording.

# Reply 1 — to Patrick (park.fan)

> Hey Patrick,
>
> Thanks for writing in, and glad the idea clicks with you.
>
> I went and pulled your actual numbers before answering. There's no filtering on new accounts — nothing is throttling you. What you're seeing is a side effect of how delivery worked until now: every bar impression picked a startup uniformly at random from the ~58 approved sites. That's fair *per impression*, but it isn't reciprocal. park.fan is currently one of the biggest traffic sources in the whole network — you're supplying roughly a third of all impressions — while an even split only ever hands you 1/57 of them back. So the more traffic you send, the worse your ratio looks. That's on the algorithm, not on you.
>
> You're right that it's not a good deal, so I've changed it. Delivery is now weighted by contribution: sites that send more impressions get a proportionally larger share of impressions back, capped so nobody can dominate, with a guaranteed baseline for small and brand-new startups so they don't get starved. For park.fan that should mean roughly 3-4x the views you're getting today, and it'll keep scaling with what you send.
>
> Give it a day or two to show up in your dashboard and tell me how it looks. If it's still off, I'd rather keep tuning it than have you pull the bar.
>
> Thanks for the honest feedback — this one genuinely improved the product.
>
> Best,
> Daniel

# Reply 2 — to the URL redirect bug reporter

> Hey,
>
> Thanks for reporting this, and sorry for the blank page — it was a real bug, not something on your end.
>
> When you signed in, the login token was handed back in the URL fragment (the part after the `#`). Our protected-page guard was checking for a session a beat *before* the auth library had finished reading that token, so it decided you weren't logged in and bounced you — which left you on `/dashboard#` with nothing rendered. On faster loads people won the race and never noticed; on yours it lost, every time.
>
> It's fixed now. Sign-in returns to a dedicated callback page that waits until a real session actually exists before sending you on, and the page guard no longer redirects while a token is still being processed. The stray `#` is gone too.
>
> Please give it another try and let me know if you still hit it.
>
> Best,
> Daniel

If you'd rather I only send the replies and leave the algorithm as-is, say so and I'll drop the weighting change — but then reply 1 needs rewording, since it currently promises the fix.
