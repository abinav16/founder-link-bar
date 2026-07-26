## First: nothing private leaked — here's the proof

I pulled the actual Imgur screenshot he posted and read the live database access rules. Verified facts:

- His screenshot's tab counters read **All 15 · Pending 0 · Approved 15 · Warned 0 · Rejected 0**. Every row on his screen is an **approved** startup — data already public on `/network` and `/leaderboard`.
- The "Paid but not submitted", "Recently removed", and "Unsubscribe analytics" panels are all **collapsed** in his shot. He never opened them, and if he had they'd have returned nothing: those queries hit `application_events` and `payments`, whose database policies restrict SELECT to `auth.jwt() ->> 'email' = 'danielabinav16@gmail.com'`. Confirmed by querying the live policy list.
- The broadcast-email function re-verifies the caller's bearer token and rejects any non-admin email with 403 for `admin-broadcast`, `admin-broadcast-preview`, `admin-broadcast-recipients`, and `admin-unsub-reasons`. He could not have emailed your users.
- `admin_orphan_payments` raises `Forbidden` unless the caller's JWT email matches yours.
- Admin writes (approve/reject/warn/ban) are gated by an admin-only UPDATE policy — he cannot change any record.

**So: no breach of private data, no write access, no email access.** Take a breath.

## How he got the screen

`/admin` renders client-side and its only gate is a `beforeLoad` check that reads the signed-in user's email in the browser and redirects home. That check runs in JavaScript on his machine, so any signed-in user can step over it in devtools and render the panel shell. The shell then paints whatever the database will hand *him* — which is the approved-startups list. It looks like your admin console; it's actually his own permission level wearing your console's clothes.

Two real problems this exposes:

1. **The console is reachable at all.** Even with no private data, it leaks your internal layout, panel names, review workflow, and the fact that an admin surface lives at `/admin`.
2. **Approved-startup rows are fully public, column and all.** The public read policy is row-scoped, not column-scoped, so operational fields ride along: `widget_last_page_url` (the last URL a founder's widget was seen on), `widget_last_heartbeat_at`, `widget_currently_visible`, `strike_count`, `banned`, `rejection_reason`, and `user_id`. That's the genuinely sensitive part of his screenshot — the "Widget Health / last seen on …" column shows other founders' page URLs.

## The fix

**1. Gate `/admin` on the server, not the browser**

Add an admin-check server function that validates the caller's bearer token server-side and returns whether the email matches. The route calls it in `beforeLoad` and redirects on anything but a clean pass. A devtools breakpoint can no longer fake it, because the answer comes from the server, not from local JS. Keep the existing client check as a fast path so admin navigation stays instant.

**2. Stop shipping operational columns to the public**

Replace the blanket public-read grant on `startups` with a column-scoped one. Public/anon and ordinary authenticated readers get only what the network and profile pages actually render:

`id, slug, name, website_url, description, logo_url, created_at, status, founder_quote, iframe_blocked`

Owners keep full access to their own row; you keep full access to every row. The widget-health, moderation, and ownership columns stop being readable by strangers. I'll check each public query first (`network`, `leaderboard`, `startup/$slug`, `widget/pick`, `widget/click`) so nothing that renders today breaks.

**3. Collapse the duplicate public policy**

`startups` has two identical public-read policies — "Anyone can view approved startups" and "Approved startups are publicly readable". Redundant rules are how a tightening gets silently undone later. Consolidate to one.

**4. Move the admin email out of the client bundle**

`ADMIN_EMAIL` is a literal in `src/routes/admin.tsx` and ships to every visitor's browser. Once the server gate is in, the client copy is only a UX nicety; I'll drop it from the bundle and let the server own the identity check.

### Technical notes

- The database policies for `application_events`, `payments`, and admin UPDATE on `startups` are already correct — I'm not touching them.
- The column tightening is one migration using `REVOKE SELECT ON public.startups FROM anon, authenticated` followed by a column-list `GRANT SELECT (...)`, with the owner and admin paths preserved through the existing policies.
- No change to the widget, the heartbeat pipeline, or the email system.

### Worth doing after, not now

Rename `/admin` to a non-obvious path, and add a lightweight audit log of admin page loads. Say the word and I'll fold either in.

Approve and I'll implement 1–4.