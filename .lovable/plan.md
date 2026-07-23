## Why the mismatch happens

The network page and profile page use the same `StartupFavicon` component, but they call it differently:

- **Profile page** (`src/routes/startup.$slug.tsx`) passes the uploaded logo:
  `<StartupFavicon url={...} name={...} logoUrl={s.logo_url} />` — so when the founder uploaded a logo, that logo is shown.
- **Network page cards** (`src/routes/network.tsx` lines 101 and 146) omit `logoUrl`:
  `<StartupFavicon url={s.website_url} name={s.name} />` — so the component falls back to `google.com/s2/favicons?domain=...`, which returns the site's raw favicon (or a generic globe when the site has no favicon set).

The data itself is fine — `network-dashboard.functions.ts` already selects `logo_url` and returns it in the payload. The card renderers just aren't passing it through. (The magnetic canvas at line 474 already uses `logo_url`, which is why the animated bubbles look correct while the cards below don't.)

## Fix

In `src/routes/network.tsx`, add `logoUrl={s.logo_url}` to both `<StartupFavicon>` usages:
- Featured card grid (~line 101)
- "New this week" list (~line 146)

That's the only change — one prop on two lines. The favicon component already prefers `logoUrl` when present and falls back to Google favicons otherwise, so sites without an uploaded logo keep their current behavior.
