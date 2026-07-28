## Problems

1. **Sparkline is always 7 days**, even on All-time and Today — so the graph doesn't match the number next to it.
2. **Clicks / CTR are always lifetime**, even when Today or This week is selected (currently patched with a "· all" caption). Mixed windows in one row is the core confusion.
3. **No column headers** — users can't tell whether "Clicks" means clicks the startup received or clicks it sent, or what the bar chart represents.

## What to build

### 1. Column header row with tooltips
Add a sticky-ish header row above the list (desktop only; mobile keeps the current inline captions), aligned to the existing columns:

`# · Startup · Trend · Impressions · Clicks · CTR` (Most Seen)
`# · Startup · Trend · Given · Received · Ratio` (Top Contributors)

Each header gets an info icon with a tooltip (shadcn `Tooltip`), wording plain-English and window-aware:
- Impressions — "Times this startup's card was shown inside other founders' widgets."
- Clicks — "Times a visitor clicked through to this startup from a widget, the network page, or the leaderboard."
- CTR — "Clicks ÷ impressions."
- Given — "Impressions this startup delivered to others by running the widget on its own site."
- Received / Ratio — same treatment.
- Trend — label changes with the range (see below).

### 2. Range-aware sparkline
- **Today** → 24 hourly bars for the current IST day, caption "Today · hourly".
- **This week** → current 7 daily bars, caption "Last 7 days".
- **All-time** → keep the 7-day bars but caption them honestly as "Last 7 days trend", so it reads as recent momentum rather than a claim about all-time. (Rendering the full history per row isn't meaningful at this bar size and would need a much heavier query.)

### 3. Make clicks and CTR follow the selected window
Instead of the "· all" workaround, show clicks and CTR for the same window as the impressions column, and keep the lifetime number as a small muted sub-caption so the big number isn't lost. Podium cards get the same treatment.

## Technical notes

- One migration adding two read-only functions (same security pattern as the existing `public_startup_daily`: `SECURITY DEFINER`, fixed `search_path`, execute granted only to the roles the server function uses):
  - `public_startup_hourly(_ids uuid[])` → per startup, hour offset 0–23 within the current IST day, impressions received/given + clicks.
  - Extend the daily aggregation to also return **clicks per day** (new function `public_startup_daily_v2` or added columns), which is what makes windowed Clicks/CTR possible.
- `src/lib/leaderboard.functions.ts`: call the new functions, add `hourlyImpressions[24]`, `hourlyGiven[24]`, `dailyClicks[7]`, `hourlyClicks[24]` to `LeaderboardRow`.
- `src/routes/leaderboard.tsx`: header row + tooltips, range-aware sparkline data/caption, windowed clicks/CTR with lifetime sub-caption.
- No RLS or table changes; existing pill styling reused, no new design tokens.
- Verify in a headless browser: toggle all three ranges on both tabs, confirm re-ranking, hourly bars on Today, tooltips open, zero console errors.
