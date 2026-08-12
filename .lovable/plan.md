# Fix the featured dialog numbers to match what advertisers actually buy

You are right: the current tiles show widget delivery data (impressions on partner sites, clicks delivered by the bar). Featured placement does not touch the widget at all, so those numbers are irrelevant and misleading. What a featured advertiser buys is exposure to people browsing startupbar.co itself.

## What the real numbers are

Checked against live data (landings tracked on startupbar.co, excluding widget impressions on partner sites):

- Page views on startupbar.co, last 30 days: about 6,000
- Unique visitors, last 30 days: about 1,400
- Countries reached: 105
- Live startups in the network: 74
- All time page views since launch: about 7,300

So a "50K+ visitors" claim would be false. We should not print a number we cannot back, especially for a paid placement. The honest set is still a good pitch: real founders, real traffic, growing weekly.

## New tiles in the dialog

Three tiles, all pulled live from the database, nothing invented:

1. Monthly visitors on startupbar.co (unique sessions, last 30 days)
2. Page views on startupbar.co (last 30 days)
3. Countries reached (last 30 days)

Under the tiles, one quiet line: "Live numbers from the last 30 days on startupbar.co. Featured placement is visibility on our pages and does not change widget delivery."

Optionally show "74 startups live" in the footer where the startup count already appears, so the tiles stay focused on audience.

## Technical changes

- `src/components/FeaturedBookingDialog.tsx`: replace `loadNetworkStats` with a query scoped to the startupbar.co site marker row (`shown_startup_id = 0d2db708-...`, the same id `LiveVisitorMap` uses for real landings), returning unique sessions, page views, and distinct countries for the last 30 days. Drop the `impressions` all-network count and the `public_network_totals_all` clicks call.
- Since counting distinct sessions and countries is not possible with a head count, add a small security definer RPC `public.public_site_audience_30d()` returning `visitors, pageviews, countries`, granted to `anon` and `authenticated`, so the dialog makes one cheap call instead of pulling rows.
- Update tile labels and the disclaimer copy in the dialog. No hyphens or dashes in the copy.
- Card sizing and layout stay as they are.

If you want a bigger headline number later, the right move is to grow real traffic, not to inflate the tile.
