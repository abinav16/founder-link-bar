# The 24K impressions: one member site is flooding the network

## What actually happened

Nothing broke. The rotation and session dedupe are working (about 1.7 impressions per session, which is normal). The spike is one member.

Last 13 hours, impressions by host site:

```text
Technical AI (technical-rex.blogspot.com)   18,318 impressions   12,197 sessions   0 clicks generated
Kustiq                                       2,699 impressions      710 sessions
park.fan                                       701 impressions      229 sessions
everyone else                                ~1,500 combined
```

Signals that this is not real audience traffic:

- 12,197 distinct sessions in 13 hours on a Blogspot page — 100% of them on path `/` and nothing else.
- 13,737 of today's impressions come from Serbia (RS), versus 3,753 US.
- That host sent 0 clicks into the network while receiving thousands of impressions of network traffic.

So the denominator exploded with junk traffic while clicks stayed flat at 24. That's the whole CTR drop.

## The fix

Three layers, in order of importance.

### 1. Cap how much one host can pump into the network per day

Any single host site counts at most a fixed number of impressions per UTC day (proposal: 2,000). Past that, the bar still renders and rotates normally on their site, but extra impressions are not written. This bounds the damage from any one flooding site, today and in the future.

### 2. Basic bot filtering at the pick endpoint

Skip recording an impression when the request looks non-human:

- Known bot/crawler/headless user agents.
- Requests with no session id at all (rotation and normal pageviews always have one).

### 3. Flag suspicious hosts in Admin

A "Suspicious traffic" indicator on the admin startup row when a host is far outside normal ranges — very high sessions, near-zero clicks generated, single-path traffic. Gives you a one-look decision on whether to warn or remove them.

## Historical data

The 18K bogus rows from Technical AI are already in the table and drag every historical chart. Options:

- Leave them (charts show a spike today, CTR recovers tomorrow).
- Delete this host's impressions from the last 24 hours so today's numbers read true.

I'll leave them untouched unless you say to delete them.

## Technical notes

- `src/routes/api/public/widget.pick.ts`: add a per-host daily cap check and a bot-UA guard before the `impressions` insert; the pick response is unchanged so the bar keeps working.
- Cap counting needs a cheap lookup, so a security-definer function `host_impressions_today(_host uuid)` returning today's count, cached in memory for ~60s per host.
- `src/lib/ua.ts`: add an `isBot(ua)` helper covering common crawler/headless signatures.
- `src/routes/admin.tsx`: derive a suspicious-traffic badge from sessions vs clicks-given over 24h.
- Reciprocity weighting (`widget_pick_weights`) already keys off impressions given; capping also stops a flooder from buying itself 4x delivery.
