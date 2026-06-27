## Problem

On the leaderboard, most startup logos render as a generic blue/purple globe instead of the real favicon. That globe is the default icon Google's favicon service (`google.com/s2/favicons`) returns when it can't find or hasn't cached a favicon for a domain. It's especially common for newer sites, sites behind Cloudflare, or sites that only ship a non-standard `apple-touch-icon`. Once Google returns that placeholder, `<img onError>` never fires (it's a valid 200 response), so no fallback kicks in.

The same issue exists in:
- `src/routes/leaderboard.tsx` (podium cards + ranked list)
- `src/routes/admin.tsx`
- `src/routes/_authenticated/dashboard.tsx`
- `src/routes/widget.bar.tsx` (the widget itself)

## Proposed fix

Switch the primary favicon source to **Logo.dev**, which has much better coverage for startup/SaaS domains, and keep Google as a fallback for the rare cases Logo.dev can't resolve.

Logo.dev is already available as a Lovable connector (frontend-only, publishable key). If you approve this plan, the first build step will connect it so `VITE_LOVABLE_CONNECTOR_LOGO_DEV_API_KEY` is available.

### Implementation

1. **Connect Logo.dev** via the standard connector flow (one-click; no key to paste).

2. **Add a small `StartupFavicon` component** in `src/components/StartupFavicon.tsx`:
   - Primary `src`: `https://img.logo.dev/{domain}?token={key}&size=64&format=png&fallback=404`
   - On error → swap to `https://www.google.com/s2/favicons?domain={domain}&sz=64`
   - On second error → show a neutral letter avatar (first letter of startup name on a soft gray bg) so the row never looks broken.
   - Props: `url`, `name`, `size`, `className` (so it slots into the podium, list, admin, dashboard, and widget without restyling).

3. **Replace the inline `<img src="google.com/s2/favicons…">` usages** in the four files above with `<StartupFavicon />`. No layout/style changes — same dimensions and ring classes.

4. **Widget (`widget.bar.tsx`)** — same swap. Logo.dev works fine inside the iframe; the publishable key is already a browser-safe `VITE_*` env var.

### Why this works
- Logo.dev returns real brand marks for the long tail of startup domains where Google falls back to its globe.
- `fallback=404` on Logo.dev makes it return a real HTTP error for unknown domains, which lets `onError` actually fire and chain into Google → letter avatar.
- No backend or schema changes; pure frontend.

### Out of scope
- No change to the favicon URL stored in the database (we still derive from `website_url`).
- No change to ranking, stats, sparkline, or click-tracking behavior.

After build, I'll spot-check the leaderboard to confirm VerifiedMRR, PreShip Validation, Imagecolorpicker, Startup Name Generator, and StartupBar all render real marks instead of the globe.
