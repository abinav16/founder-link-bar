# StartupBar — UI / Loading / A11y Audit

I audited every route, the shared layout, root shell, and data-loading patterns. Below is what's actually hurting the site today, ranked by user impact. The single most critical theme: **the site has layout shift (CLS) baked into every page load**, and the hero page has it baked in *every 3 seconds forever*. That is the "height jumping" you keep seeing.

---

## 🔴 The critical issue (fix first)

**The hero on `/` shifts vertically on load AND every 3 seconds while the page is open.**

Three compounding sources in `src/routes/index.tsx`:

1. **Line 558–562** — `liveIndex` rotates every 3s. The startup name inside the mock browser bar has no fixed width, so text of varying length reflows the bar → shifts everything below it.
2. **Line 695 / 721** — the mock bar is conditionally rendered (`!mockDismissed`) and the "info" panel expands *inline* pushing content down instead of overlaying.
3. **Line 539–654** — landing header renders `null` while `authReady === false`, then expands to full nav ~200 ms later. Guaranteed header shift on every visit.

This is the root cause of the complaints you've been sending for days.

---

## Top 10 issues, ranked

| # | Severity | Issue | Where |
|---|---|---|---|
| 1 | 🔴 Critical | Mock-bar text reflow every 3s + info panel expands inline | `src/routes/index.tsx:558, 695, 721` |
| 2 | 🔴 Critical | Landing header collapses to 0 width until auth resolves | `src/routes/index.tsx:539–654` |
| 3 | 🔴 Critical | Same auth race in DashboardLayout (app-wide header shift) | `src/components/DashboardLayout.tsx:49–126` |
| 4 | 🔴 High | Google Fonts has no `preload` → FOUT reflows every H1 | `src/routes/__root.tsx:64` |
| 5 | 🔴 High | Dashboard loader fetches **all impressions** to compute rank client-side | `src/routes/_authenticated/dashboard.tsx:65, 82` |
| 6 | 🟠 High | Leaderboard "You" highlight fetched in useEffect after render → flicker | `src/routes/leaderboard.tsx:98–121` |
| 7 | 🟠 High | Mobile nav is icon-only with no `aria-label`; tap targets ~36×32 (need 44×44) | `src/components/DashboardLayout.tsx:80–108` |
| 8 | 🟠 Medium | StartupFavicon shows blank flash on load; `alt=""` on meaningful logos | `src/components/StartupFavicon.tsx` |
| 9 | 🟠 Medium | `/account` has no `head()` → wrong browser tab title, no SEO | `src/routes/_authenticated/account.tsx` |
| 10 | 🟡 Medium | `min-h-screen` used instead of `min-h-dvh` → iOS Safari URL-bar jump | `index.tsx:594`, `DashboardLayout.tsx:65` |

---

## Proposed fix plan (implement in this order)

### Phase 1 — Stop the layout jumps (do this first, biggest user-visible win)

1. **Hero mock bar (`index.tsx`)**
   - Wrap the rotating startup-name span with `w-[140px] truncate inline-block` so name length can't reflow the bar.
   - Give the mock bar a fixed `min-h-[36px]` and move the info-panel from inline expansion to `absolute` overlay above the bar (so it doesn't push page content).
   - Reserve the browser-mock container's height with an explicit `aspect-[16/10]` (or fixed min-height) so it doesn't grow when `liveStartup` populates.

2. **Auth race in headers**
   - Landing header: replace `!authReady ? null : …` with a fixed-width placeholder matching the widest nav state so nothing collapses.
   - `DashboardLayout`: same treatment for the right-side auth cluster and nav list.
   - Longer-term: initialize `authed` from `supabase.auth.getSession()` synchronously (returns cached session immediately) instead of `null`, cutting the flash entirely.

3. **`min-h-screen` → `min-h-dvh`** in `index.tsx` and `DashboardLayout.tsx`.

### Phase 2 — Loading performance

4. **Font preload** in `__root.tsx`: add `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the Instrument Serif regular + italic .woff2 URLs (extracted from Google's CSS).
5. **Dashboard rank calc**: replace the "select all impressions" scan (line 65) with a Postgres RPC that returns the caller's rank in a single query. Removes the biggest loader delay.
6. **Leaderboard `myId`**: move the two `supabase.auth.getUser()` + startup lookup calls into the route loader so the "You" badge renders on first paint (no flicker).

### Phase 3 — Accessibility & SEO polish

7. `DashboardLayout` nav: add `aria-label={label}` on each mobile icon Link; bump padding to `px-3 py-2` for 44×44 tap targets; add `aria-label="Account settings"` on the Settings icon.
8. `StartupFavicon`: default `alt` to `name || domain`; add neutral background on the wrapper to kill the white flash.
9. Add `head()` with a real title/description to `_authenticated/account.tsx`.

### Out of scope (not touching)
- Business logic, DB schema, RLS, edge functions, widget loader.
- CSP-detection work from previous turns (already shipped).
- Design/color system.

---

## Technical notes

- All changes are frontend/presentation only except item **#5** (dashboard rank), which needs one new SQL RPC — I'll write it as a `CREATE OR REPLACE FUNCTION` migration with proper `SECURITY DEFINER` + grants.
- Font preload URLs need to be fetched from Google's stylesheet once and hardcoded (they're stable per version).
- Auth session bootstrap: `supabase.auth.getSession()` is synchronous on cached sessions, unlike `getUser()` which is always async — this is the key to eliminating the header flash entirely.

Approve and I'll ship Phase 1 first (the layout-jump fixes) so you can verify the hero stops moving before I move on to the perf and a11y phases.
