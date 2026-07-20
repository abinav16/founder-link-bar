## Quick ship: "New this week" badge on Network cards

A tiny, high-visibility update we can push in one edit.

### What
On `/network`, add a small **"New"** pill on any startup card whose `created_at` is within the last 7 days. Right now new joiners only get a subtle "Just joined" label when they have 0 impressions — the moment they get their first impression, they blend in with everyone else.

### Why it's worth shipping
- Rewards fresh joiners with visible spotlight for their first week (retention nudge).
- Zero backend/schema work — `created_at` already comes back in the dashboard payload.
- Makes the Network page feel alive week over week.

### Change
- `src/routes/network.tsx`: in `StartupCard` (and optionally `StartupRow`), render a small `NEW` pill in the top-right when `Date.now() - new Date(s.created_at) < 7d`. Style: white bg, black text, subtle border, tiny — matches the existing minimalist look.
- If `created_at` isn't currently selected in `getNetworkDashboard`, add it to the select (single-line change in `src/lib/network-dashboard.functions.ts`).

### Not doing
No DB migrations, no new routes, no email/notification changes. Pure frontend polish.

Alternative small fixes I can ship instead if you'd rather — say the word:
1. Show "last seen URL" (already captured) in the admin embed row so you can spot cross-domain installs at a glance.
2. Add `rel="noopener"` audit + `hreflang` to sitemap (SEO hygiene).
3. Copy-link button on `/leaderboard` rows for founders to share their ranked position.