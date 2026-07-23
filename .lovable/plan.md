# Plan: Per-Startup Detail Pages with Live Embed

## Goal
Give every approved startup a public, shareable page at `/startup/$slug` with identity, founder story, network stats, and a live interactive preview of their site.

## Live embed approach (no ScrapingBee needed)
Use a real `<iframe>` — it's free, interactive, and no API required. ScrapingBee-style services only produce static screenshots, so the "click to focus and use the site inside our page" experience is only possible with an iframe.

Fallback for sites that block iframes (`X-Frame-Options` / CSP):
- Use **Microlink.io** (`https://api.microlink.io/?url=<site>&screenshot=true`) — free tier, no API key, no connector setup.
- Show the screenshot with a big "Open site ↗" button.
- Detect the block: attempt to read `iframe.contentWindow` after load; on error/blank, swap to screenshot. Also maintain a small `iframe_blocked` boolean column on `startups` cached from the verify-install probe so we don't re-detect on every page load.

## Page structure: `src/routes/startup.$slug.tsx`

### Hero
- Circular startup logo, name, one-liner
- "Joined <date>" pill
- Founder avatar + name + quote (italic pull-quote style)
- External-link button to the real site

### Contribution stats (network impact)
Reuse `public_startup_totals` scoped to this startup:
- Impressions generated (shown in others' bars)
- Clicks contributed (given from this startup's bar)
- Clicks received (users clicked this startup)
- Network CTR

### Live embed section
- Bordered rounded iframe, ~500px tall, `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`.
- Idle overlay: dim + "Click to interact" hint. On click, remove overlay and expand to a taller focused view so the user can scroll/click inside.
- Toolbar: reload, open external, copy URL.
- If blocked → Microlink screenshot + "Open site" CTA.

### Unique feature: "Live visitor pulse" (visibility booster)
- Real-time-ish dot showing recent landings via StartupBar in the last 5 minutes (from clicks/site-visits filtered by this startup).
- "Users also came from" — top 3 referring startups in the last 24h with mini logos, each linking to their `/startup/$slug`. This cross-links the whole network and drives organic visits between startup pages.

### SEO
Unique `head()`: title = `${name} — StartupBar`, description = one-liner, og:image = startup logo URL, canonical `/startup/<slug>`.

## Data changes (single migration)
1. Add to `startups`:
   - `slug text unique` (indexed) — backfill from name for existing approved rows
   - `founder_quote text`
   - `founder_avatar_url text`
   - `iframe_blocked boolean default null` (cached probe result)
2. Backfill slugs via one-shot SQL.
3. RLS: existing public SELECT policy already covers new columns.

## Founder inputs (per your note)
Founder quote and founder avatar are editable in **Account Settings** (`src/routes/_authenticated/settings.tsx` or existing account page), NOT the dashboard. Add two fields there:
- Textarea for `founder_quote` (max ~200 chars)
- Avatar upload → `startup-logos` bucket path `founders/<user_id>.png`, saved to `founder_avatar_url`

Founder name reuses existing profile/auth name; no new input.

## Files to create / modify
- `src/routes/startup.$slug.tsx` — new public detail page
- `src/components/StartupEmbed.tsx` — iframe + screenshot fallback
- `src/components/LiveVisitorPulse.tsx` — recent visitors + referring startups
- `src/lib/startups.functions.ts` — `getStartupBySlug`, `getStartupPageStats`, `getRecentReferrers`
- `src/routes/_authenticated/settings.tsx` (or existing settings route) — add founder quote + avatar fields
- `src/routes/network.tsx` — logos link to `/startup/$slug`
- `src/routes/leaderboard.tsx` — rows link to `/startup/$slug`
- Migration for schema + slug backfill

## Open question before building
Anything you'd like beyond the "Live visitor pulse" as the unique/cool feature — for example a shareable embeddable stats card ("This startup got X clicks via StartupBar"), or should I just build the pulse + referrers?
