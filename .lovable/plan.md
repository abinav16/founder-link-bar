## What's actually happening with MyNotifyAssist

I dug into the DB and the live site. Both things are true at the same time:

- **DB says Live + Visible.** Last heartbeat `2026-07-16 19:20:31 UTC` (~9 min ago at time of check), `widget_currently_visible = true`, and 2 real host-impressions in the last 15 minutes (rows in `impressions` with `host_startup_id = e4621bf1…`, matching origin).
- **The site has no widget.** I fetched `/`, `/home`, `/login`, `/register`, `/services`, `/plans`, `/blog`, `/mobile-app`, `/dashboard`, `/app`, `/admin`, `/account`, `/pricing`, etc. with curl and with a real headless Chromium (waited for `networkidle` + 3s). **Zero** references to `startupbar`, `data-startup-id`, `widget/loader.js` — no script, no iframe, no network request to `startupbar.co`.

So the widget IS loading in *someone's* browser on `mynotifyassist.com` (origin check passes, heartbeat + impressions are recorded), but it is **not present in any public HTML we can reach**. The likely explanations, in order:

1. **Client-side injection they gate.** Their site is a client-rendered SPA. The loader is appended by their app JS only under a condition we don't hit — e.g. logged-in users only, after cookie consent, feature-flagged, only on mobile UA, or only on a route behind auth.
2. **Injected by a tag manager** (GTM/PostHog) with a trigger that excludes bot/headless UAs (which is what our curl + Playwright look like).
3. **The founder themself** is the one triggering it — they open their own site while logged in, the widget loads for their session only, and heartbeats fire.

What this is NOT: it's not a bug in our admin badge. "Live" and "Visible" are computed from real heartbeats + `widget_currently_visible` flags landing right now with a matching origin — those are trustworthy signals. It's just that "installed for some visitors" ≠ "installed for the public homepage."

## Why this is confusing us in admin

Today the "Live · Visible" badge only tells us "at least one browser somewhere on this domain is running the widget." It doesn't tell us **which URL** that browser was on. That's why the mismatch feels impossible from the outside.

## Proposed fix

Small, admin-only change so future cases like this are self-explanatory:

1. **Record heartbeat origin.** In `src/routes/api/public/widget.heartbeat.ts`, capture the `Referer` (or `Origin` + path from a new `?path=` query param the loader already knows) and store the last-seen page URL on `startups` (new nullable column `widget_last_page_url text`). Migration adds column + grants; no policy change (already admin-only reads via existing RLS).
2. **Update `public/widget/loader.js`** to send `&path=` (pathname only, no query/hash) alongside the existing heartbeat so we don't rely on Referer-Policy.
3. **Surface it in admin.** In `src/routes/admin.tsx`, under the Widget Health cell, when a startup is Live show a small "last seen on: /some/path" line + copy button. Tooltip on the Visible badge shows full URL.
4. **No behavior change** for founders, `verify-install`, ban logic, or the widget UI. Purely observability so next time we can immediately see "widget is only firing on `/dashboard`" vs "widget is on `/` — check ad-blocker / consent".

### Technical notes

- Column default `null`; only written when a heartbeat arrives with a valid same-origin path. Reject paths that don't start with `/` and truncate to 200 chars.
- Origin/host validation stays exactly as-is — we only *store* the path portion when the origin already matched.
- Loader change is additive (`path=` param); older cached loaders keep working, they just won't populate the new field.

## What I'll tell you about MyNotifyAssist specifically after this ships

Once the column is populated, one look at the admin row will answer "where is it actually installed?" — likely a logged-in route or a GTM-triggered path we can't crawl anonymously.
