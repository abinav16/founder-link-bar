## Problem

The admin "Embed: Live" badge only confirms the `<script src="…loader.js">` tag is present in the site's HTML (see `src/routes/api/public/verify-install.ts`). It does **not** check whether the widget iframe is actually visible. Sites like getvisibly.app can ship the snippet and then hide it with CSS (`display:none`, `visibility:hidden`, `height:0`, off-screen positioning, parent container hidden, etc.) and still pass the check.

We do have real visibility detection — `public/widget/loader.js` runs an `IntersectionObserver` inside the iframe and pings `/api/public/widget/heartbeat?visible=…`. But that endpoint only accepts heartbeats for `status='approved'` startups (`src/routes/api/public/widget.heartbeat.ts`), so for a **pending** application like Visibly we never record any visibility data — hence "No heartbeat yet" and a green Live badge that means nothing.

## Fix

Make visibility verifiable **before** approval and surface it in the admin table.

### 1. Accept heartbeats for pending startups

In `src/routes/api/public/widget.heartbeat.ts`:
- Drop the `.eq("status", "approved")` filter; accept pending too (still reject banned).
- Only run the strike/suspension/ban escalation flow when `status === 'approved'`. For pending, just record `widget_last_heartbeat_at`, `widget_hidden_at`, and a new boolean `widget_currently_visible` — no emails, no status changes.

### 2. Track current visibility on the startup row

Migration: add `widget_currently_visible boolean` to `public.startups` (nullable; null = unknown). Update it on every heartbeat. Keep existing grants/RLS.

### 3. Stronger "Embed" check in admin

Update `src/routes/admin.tsx` Embed column to a 3-state badge driven by both signals:
- **Live & visible** — script detected AND last heartbeat within 5 min AND `widget_currently_visible = true`.
- **Hidden** (red) — script detected AND heartbeat received AND `widget_currently_visible = false`. This is the case Visibly would land in.
- **Installed, not seen yet** (amber) — script detected but no heartbeat in the last 5 min (iframe never loaded or page not visited).
- **Not installed** (grey) — script not detected.

No auto-rejection for pending — admin decides. Tooltip explains each state.

### 4. Light HTML heuristic (defense in depth)

In `verify-install.ts`, additionally flag suspicious wrappers: script tag inside an element whose inline style contains `display:none`, `visibility:hidden`, `height:0`, or `opacity:0`. Returned as `suspicious: true` alongside `installed`. Admin badge shows a small "⚠ wrapped in hidden element" hint when true. This catches the cheap CSS-hide-the-script trick even when the iframe never gets a chance to load.

## Technical details

Files touched:
- `supabase/migrations/<ts>_widget_visibility_pending.sql` — add `widget_currently_visible boolean`.
- `src/routes/api/public/widget.heartbeat.ts` — allow pending, gate escalation on approved, write new column.
- `src/routes/api/public/verify-install.ts` — add hidden-wrapper heuristic, return `suspicious`.
- `src/routes/admin.tsx` — fetch `widget_currently_visible`, `widget_last_heartbeat_at`; compute combined badge; render new states with tooltips.
- `src/integrations/supabase/types.ts` — regenerated row type for new column (or cast where needed).

No changes to `loader.js` or `widget.bar.tsx` — they already report visibility correctly; we're just listening to that signal earlier.
