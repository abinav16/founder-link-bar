# Stop counting impressions from non-approved startups

## What I found

`technical-rex.blogspot.com` ("Technical AI") has status **rejected** — it was never approved into the network. It still has the widget installed and is still being served picks and having impressions recorded.

Last 24 hours, impressions grouped by the host site's status:

```text
rejected host   18,324 impressions   (all from technical-rex.blogspot.com)
approved host    7,368 impressions
no host at all      80 impressions
```

About 71 percent of today's impressions come from a non-member site, and that site produced 0 clicks. That is the whole CTR drop.

## Cause

The pick endpoint never checks the host. It uses the `host` parameter only to avoid showing a startup its own bar, then serves a pick and writes an impression no matter what the host's status is. The database insert rule has the same gap: it validates that the shown startup is approved, but not the host.

## The fix

1. Pick endpoint validates the host: only an approved, non-banned startup gets a pick. Anyone else gets nothing back, so the bar does not render on non-member sites.
2. Click endpoint gets the same host check, so clicks from non-member hosts are not recorded.
3. Database insert rules for impressions and clicks require the host to be an approved startup, or null for StartupBar's own pages.

No caps, no bot filtering, no rate limits.

## Cleanup of the last 24 hours

Delete impressions and clicks from the last 24 hours whose host startup is not approved. That removes the 18,324 junk impressions and restores today's network CTR immediately. Anything older than 24 hours stays untouched.

## Technical notes

- `src/routes/api/public/widget.pick.ts`: look up `status` and `banned` for the `host` id and return `null` when not approved; short in-memory cache so it does not add a query per pageview.
- `src/routes/api/public/widget.click.ts`: same host validation before the insert.
- Migration: replace the `Insert impressions for approved startups` and `Insert clicks for approved startups` policies to also require `host_startup_id IS NULL OR` the host is an approved, non-banned startup.
- Data cleanup: delete from `impressions` and `clicks` where `created_at > now() - interval '24 hours'` and `host_startup_id` points at a startup whose status is not `approved`.
