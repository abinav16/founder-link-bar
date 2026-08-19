# Refresh sitemap and llms.txt

Both files have fallen behind the current site. Findings from the route list and file contents:

## Sitemap (`src/routes/sitemap[.]xml.tsx`)

Missing:
- `/leaderboard`
- `/network`
- One entry per approved startup profile page (`/startup/{slug}`), which is the largest set of indexable pages we have

Should be removed:
- `/admin` (admin-only, not for indexing; also blocked in spirit by the admin gate)
- `/auth` (sign in page, no indexable content)

Stays as is: `/`, `/apply`, `/pricing`, `/faq`, `/terms`, `/privacy`.

## llms.txt (`public/llms.txt`)

Missing or stale:
- No mention of `/pricing` or `/faq`
- No mention of startup profile pages (`/startup/{slug}`) with founder info, quote, stats and live embed
- No mention of the Featured spot promotion ($79/month, 8 slots, highlighted across network and leaderboard)
- Widget section does not mention the top/bottom placement option

## What to build

1. Update the sitemap route: drop `/admin` and `/auth`, add `/leaderboard` and `/network`, and fetch approved startups from the database to emit one `/startup/{slug}` entry each, mirroring the filters the profile route uses. No `lastmod` values unless a real page-specific timestamp exists.
2. Update `public/llms.txt`: add Pricing, FAQ and startup profile pages to the Pages list, add a short Featured spots section, and note the widget placement option.
3. Verify `/sitemap.xml` renders valid XML with the startup URLs included.

`public/robots.txt` already allows crawling and points at the sitemap, so no change there.
