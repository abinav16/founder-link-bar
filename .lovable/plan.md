# Advertise page and ad setup

## Goal
Remove the left/right featured rails on Network and Leaderboard. Add Product Hunt–style banner ads shown between list rows, a new Advertise page, and an ad setup page. Gold highlights (click packs) and the Sunday newsletter stay as they are.

## How banners are priced (proposal)
No fixed slots. Advertisers pick a **budget** (e.g. $100, $250, $500, custom from $50). Banners are shown at random among all approved, running campaigns, weighted by remaining budget. Each view costs a flat rate per 1,000 views (starting suggestion: $15 CPM — easy to change). The campaign stops when its budget is used. The setup page shows estimated views, like Product Hunt. Many advertisers can run at once.

## Pages

### 1. `/advertise` (public)
Inspired by Product Hunt's advertise page, in the site's black and white style:
- Opening: headline, audience numbers from live network stats (monthly views, founders, member sites).
- Three product cards: Banner ads, Gold highlight (guaranteed clicks), Sunday newsletter — each with what it is, where it shows, price, and "Start" button.
- Visual examples of where each appears.
- FAQ and "Start a campaign" button.

### 2. `/advertise/new` (sign-in required)
Left menu like Product Hunt: Banner ad, Gold highlight, Newsletter, Review & pay. Advertiser adds one or more.
- **Banner:** budget with live estimate, advertiser name, destination link, desktop image (wide, e.g. 1200×200) and mobile image (e.g. 600×300) uploads with size checks, live preview showing the banner inside a Network list on a laptop and phone (reuses the existing device preview).
- **Gold highlight & newsletter:** need a listed startup. Listed founders pick their startup; non-listed users see "List your startup first" linking to `/apply`.
- **Review & pay:** one combined Dodo payment.

## Who sees what
| Visitor | Banner | Gold highlight | Newsletter |
|---|---|---|---|
| Signed out | Sign in to start | Sign in to start | Sign in to start |
| Signed in, no listing | Yes | Link to apply | Link to apply |
| Signed in, listed | Yes | Yes | Yes (booked Sundays disabled) |

## After payment
- Banner goes to **admin review** (approve / reject with reason) in the admin page. Only approved banners show. Rejected campaigns are refunded manually via note to admin.
- Advertiser dashboard: "My campaigns" with status (in review, running, paused, finished), views, clicks, budget left.

## Where banners show
- Network list: one banner after every ~6 startups.
- Leaderboard list: same.
- Startup profile page: one banner above "Traffic partners today".
- Desktop image on wide screens, mobile image on phones; labelled "Ad".

## Network and Leaderboard
Remove both side rails and the mobile featured banner. Lists widen to fill space; the freed area gets planned later. Existing 3 monthly featured subscribers keep paying until expiry but are no longer displayed in a rail — instead they keep the gold highlight in the list.

## Technical details
- New tables: `ad_campaigns` (owner, type, budget_cents, spent_cents, cpm_cents, destination_url, desktop_image_url, mobile_image_url, status: draft/pending_payment/in_review/running/rejected/finished, rejection_reason) and `ad_events` (campaign, kind view/click, path, session) with service-only writes plus a daily rollup.
- Public storage bucket `ad-banners`, owner-scoped upload policies.
- Public RPC `public_pick_banners(count, path)` returns random weighted running campaigns; server route records views/clicks (bot-filtered like existing impressions) and debits budget atomically, finishing campaigns at zero.
- Dodo: new flexible-price "Banner campaign" product (secret `DODO_BANNER_PRODUCT_ID`); combined cart with existing click pack and newsletter products; webhook moves campaign to `in_review`.
- Components: `BannerAd`, `AdvertisePage`, `AdSetup` route with section menu, reuse `DeviceStage` for preview. Remove `SponsoredRail` / `FeaturedMobileBanner` usage from network, leaderboard and profile.
- Update pricing, FAQ, terms, header nav ("Advertise"), sitemap.
- Tests for budget estimates and CPM debit.

## Open items
- Confirm CPM rate and minimum budget.
- Need a Dodo product ID for banner campaigns after approval.
