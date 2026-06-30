## Goal

Cut signup → submission drop-off. Of the last 18 signups, 14 never submitted a startup. The current dashboard empty state is a single line + "Apply your startup" button — it doesn't surface a saved draft, show progress, or explain the exchange clearly.

## What changes

**Only `src/routes/_authenticated/dashboard.tsx`** — the `!startup` branch (the empty state around lines 305–320). Nothing else touched: no DB, no auth, no email, no other routes.

### New empty state ("Finish your application" card)

Replace the centered "No startup yet" block with a left-aligned hero card that:

1. **Detects a saved draft** from `sessionStorage["startupbar:apply-draft"]` on mount (client-only, inside `useEffect`, so SSR/hydration stays clean).
2. **If a draft exists** → headline "Pick up where you left off", show the draft `name` + `url` in a small card, primary CTA **"Resume application →"** linking to `/apply` (apply.tsx already restores the draft).
3. **If no draft** → headline "You're one step away from free traffic", primary CTA **"Apply your startup →"** linking to `/apply`.
4. Below the CTA, a compact 3-step progress strip showing where they are: `① Sign up ✓ — ② Submit startup (current) — ③ Get approved & live`.
5. A 3-bullet value reminder ("Show on other founders' sites within 24h", "One startup shown on yours in return", "Free forever, cancel by removing the script") so users who landed on dashboard without context understand the exchange.
6. Secondary muted link to `/leaderboard` ("See who's already in the network") for users not ready to apply yet.

Visual style matches the existing dashboard: white card, `border-black/8`, `rounded-xl`, display font for headline, same button styling as the current Apply CTA.

### Technical notes

- Read `sessionStorage` inside `useEffect` (not at render) — the route is under `_authenticated` (`ssr: false`), but keep the pattern consistent with apply.tsx and avoid any hydration risk.
- Pure presentation change in the `!startup` branch. No new dependencies, no loader changes, no schema changes.
- The existing `startup-deleted` event listener and realtime subscription already re-render this branch correctly when a user deletes their only startup.

## Out of scope (can be follow-up plans)

- Re-engagement email to signups who never submitted
- Allowing submission before script install
- Dashboard-side analytics on the apply funnel
