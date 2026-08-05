# Why a rejected startup is generating 18K impressions

## What I found

`technical-rex.blogspot.com` ("Technical AI") is in the database with status **rejected** — it was never approved into the network. It still has the widget script installed and is still being served picks.

Last 24 hours, impressions grouped by the host site's status:

```text
rejected host   18,324 impressions   <- all from technical-rex.blogspot.com
approved host    7,368 impressions
no host at all      80 impressions
```

So roughly 71% of today's impressions came from a site that isn't a member. That is the entire CTR collapse — the denominator is junk, and that host sent 0 clicks into the network.

## The cause

`/api/public/widget/pick` never checks the host. It reads the `host` parameter, uses it only to exclude that startup from its own bar, and then serves a pick and writes an impression regardless of whether the host is approved, rejected, pending, or banned. The database insert rule has the same gap: it validates that the *shown* startup is approved, but says nothing about the *host*.

## The fix

Serve and count only for approved hosts.

- The pick endpoint verifies the host startup exists and is `approved` and not `banned`. If it isn't, it returns no pick — the bar renders nothing on that site, so a non-member gets no free network traffic.
- Same check on the click endpoint, so clicks from non-member hosts aren't recorded either.
- Tighten the database insert rule for impressions and clicks so the host must be an approved startup (or null, for internal StartupBar pages), matching the endpoint.

No caps, no bot filtering, no rate limits — only the membership check you already intend to enforce.

## Historical data

The 18,324 impressions from this rejected host are sitting in today's numbers and will keep dragging network CTR and the leaderboard. Two options:

- Delete impressions and clicks whose host is a non-approved startup (this host is the only meaningful one), so today's figures read true immediately.
- Leave them and let the numbers correct going forward.

Tell me which; the plan assumes we delete them.

## Technical notes

- `src/routes/api/public/widget.pick.ts`: fetch `status`/`banned` for the `host` id up front; bail with `null` when not approved. Cache the approved-host lookup briefly to avoid an extra query per pageview.
- `src/routes/api/public/widget.click.ts`: same host validation before inserting the click.
- Migration: replace the `Insert impressions for approved startups` and `Insert clicks for approved startups` policies so the check also requires `host_startup_id IS NULL OR host is an approved, non-banned startup`.
- Cleanup: delete `impressions`/`clicks` rows whose `host_startup_id` points at a non-approved startup.
