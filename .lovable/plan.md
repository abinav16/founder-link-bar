# Highlight promoted startups across the network and leaderboard

Startups that bought a featured slot should stand out everywhere on startupbar.co, with the same gold tone and glass sweep used on the sidebar slot cards.

## What changes

Network page
- Trending last 24h cards: gold highlight for promoted startups
- New This Week cards: same highlight
- Full startup list rows: gold border accent, soft gold tint and the sweep, plus the existing "Featured" pill

Leaderboard page
- Top 3 podium cards: gold treatment when the startup is promoted, taking priority over the plain rank styling
- Regular leaderboard rows: gold accent row with the sweep and a small Featured pill

## Look

Two variants of the same gold language:
- Dark card variant (already used today on cards): dark surface, gold border, animated sheen sweep
- Light row variant (new): white surface, gold border, faint gold wash, same sheen sweep so rows stay readable in the light list and leaderboard tables

## Technical notes

- Add a shared hook, for example `useFeaturedStartupIds`, backed by the existing `fetchFeaturedSlots` (RPC `public_featured_slots`) returning a Set of active `startup_id` values, cached with React Query.
- On `/network` and `/leaderboard`, treat a startup as highlighted when `s.sponsored` is true OR its id is in that Set, so the existing manual `sponsored` flag and paid slots use one code path.
- Reuse the `sb-sponsored` utility in `src/styles.css` for dark cards; add a sibling utility such as `sb-featured-row` with the same `sb-sheen` keyframes tuned for light surfaces.
- Apply in `StartupCard`, `StartupRow`, `HorizontalCardRail` items on `src/routes/network.tsx`, and in the podium plus row rendering in `src/routes/leaderboard.tsx`.
- Respect `prefers-reduced-motion` by disabling the sweep animation.
