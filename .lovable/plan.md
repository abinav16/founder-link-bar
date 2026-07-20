Quick ship: extend the 7-day "NEW" badge from the Network page to the Leaderboard page.

Why this matters
- We just shipped the NEW badge on Network cards; founders expect consistent treatment across pages.
- The Leaderboard is high-traffic and the top-3 card area is prime real estate for surfacing new startups.
- It takes <30 min and requires no backend changes.

What we'll change
1. Reuse the existing `isNew()` helper from `src/routes/network.tsx` (or move it to a shared util if not already shared).
2. Update `src/routes/leaderboard.tsx`:
   - Top 3 medal cards: add a small "NEW" pill in the corner when the startup is <7 days old.
   - Full content rows: add a "NEW" badge next to the startup name for the same condition.
3. Keep styling identical to the Network page badge so the UI feels cohesive.

Acceptance criteria
- Startups created within the last 7 days show "NEW" on both Network and Leaderboard.
- Badge does not push layout or truncate on mobile.
- No new backend queries or data changes needed.