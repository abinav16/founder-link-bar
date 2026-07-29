# Redesign "Startups in Network" list

Replace the Newest / Trending / Most clicks / Most impressions chips with real sortable columns (leaderboard-style), and rebuild each list item as a two-band card.

## Sorting

- Remove the pill/chip row entirely.
- Add a column header row above the list (desktop) with clickable, sortable headers and an ascending/descending arrow on the active one, matching the leaderboard's `ColHeader` pattern (label + tooltip hint).
- Columns: **Joined** (days since joined), **Impressions**, **Clicks**. Default sort: Joined, newest first. Clicking a header toggles asc/desc; clicking another switches the sort key.
- No "Trending" sort. The separate "Trending Today" section at the top of the page stays as-is.
- On mobile the header row is hidden; a compact sort dropdown keeps sorting reachable.
- Search box stays where it is.

## New list card layout

Two bands only — no separate founder row:

```text
┌──────────────────────────────────────────────────────────────┐
│ [logo]  Startup name                    12d ago  1.2K  84 [→]│
│         [Visit site ↗]  (pic) Founder    Joined  Impr  Clicks│
├──────────────────────────────────────────────────────────────┤
│ One-liner description (full width, own row, wraps)           │
└──────────────────────────────────────────────────────────────┘
```

- Band 1 left: logo, startup name on the first line; beneath it, on one line, the **Visit site ↗** button followed inline by the founder's avatar + name.
- Band 1 right: the metric columns (Joined / Impressions / Clicks) aligned to the header, plus the black arrow button to the startup profile page.
- Band 2: the one-liner on its own full-width row so mobile shows far more of it (currently truncated on the shared line).
- Visit site opens in a new tab and keeps the existing click-tracking href so attribution is preserved.
- On mobile the metrics collapse into a compact inline strip under the name/founder line; the description keeps its own row.
- Startups with no founder name simply omit the avatar + name from that line.

## Technical notes

- All work is in `src/routes/network.tsx` (`StartupRow` rebuilt, `SORT_OPTIONS` chips removed, sort state becomes `{ key, dir }`).
- Founder name/avatar are not currently returned by `getNetworkDashboard`. They're derived per-user via `public_founder_info(_user_id)`, one call per user — too many for 58 startups. Add a batch security-definer RPC `public.public_founder_info_bulk(_user_ids uuid[])` returning `(user_id, full_name, avatar_url)`, granted to `anon`/`authenticated`, with `search_path = public`.
- `getNetworkDashboard` selects `user_id` alongside the existing fields, calls the bulk RPC once, and adds `founder_name` / `founder_avatar_url` to `StartupCard`.
- Existing lifetime `impressions` / `clicks` already come from `public_startup_totals`, so no new metrics work is needed.
