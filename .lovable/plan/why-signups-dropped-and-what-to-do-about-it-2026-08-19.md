# Why signups dropped, and what to do about it

## What the data actually shows

Verified against the live database just now:

- **Site traffic is flat.** Landings on startupbar.co: Aug 13: 52, 14: 73, 15: 75, 16: 76, 17: 67, 18: 79, 19 (partial): 17. No traffic collapse.
- **The widget network is healthy.** 58 to 74 active host sites every day, thousands of impressions daily, and clicks through to startupbar.co are in the normal 4 to 15/day range.
- **Signups did slow.** Aug 14: 5, Aug 15: 4, Aug 16: 0, Aug 17: 0, Aug 18: 2, Aug 19: 0.
- **Signup itself is not broken.** The two Aug 18 accounts were created successfully, one by Google and one by email, both confirmed, and one signed back in ten minutes later. Auth logs show no failing signup requests.
- **The real gap is after signup.** Zero applications have been submitted since Aug 15. Both Aug 18 accounts have no startup attached. Before that, submissions ran nearly every day (5 on Aug 14, 3 on Aug 15).

So nothing points to a broken front door. Traffic arrives, accounts can be created, but people are not finishing the listing. Whether that is a bug in the apply flow or just a quiet stretch is **not yet confirmed** because there is no data on what happens between landing and submitting.

## The blind spot to close

Page tracking only records landings. Over the last 7 days, every tracked path is `/` or a `/startup/...` profile: there is not a single `/auth` or `/apply` view recorded. That means we cannot tell whether visitors ever reach the signup page, whether they reach the apply form and abandon it, or whether the form errors out for them.

## Plan

- **Track the funnel, not just landings.** Send a tracked view for every route the visitor sees, so `/auth`, `/apply`, `/pricing` and `/faq` show up alongside `/`. Today the tracker only fires on the landing page.
- **Record apply-form progress.** Log a lightweight event when someone opens the apply form and when they move between steps, using the existing application events table, so an abandoned application is visible instead of invisible.

## Technical notes

- Route-level tracking: extend the existing pageview call in the root route so it posts to `/api/public/track/site-visit` on every route change, not only the homepage.
- Funnel events: add `apply_opened` and `apply_step` event types to `public.application_events`; keep them anonymous (no PII beyond the existing user reference).
- Stalled accounts query: `auth.users` left joined against `public.startups` on `user_id`, filtered to zero rows.
- No schema-breaking changes; tracking writes reuse the current impressions and application events tables.