## Plan A — Visibility for deleted / withdrawn applications

Give the admin panel a permanent record of every application, even if the founder later deletes their startup, so cases like Royal SoftWorks never disappear silently.

### What we'll build

1. **`application_events` audit table** (append-only)
   - Columns: `id`, `startup_id` (nullable, no FK cascade), `startup_name`, `website_url`, `applicant_email`, `applicant_user_id`, `event_type` (`submitted` | `deleted` | `resubmitted` | `approved` | `rejected`), `metadata jsonb`, `created_at`.
   - RLS: `SELECT` restricted to admin email (`danielabinav16@gmail.com`); `service_role` full access. No anon/user access.
   - GRANTs per the standard pattern.

2. **DB triggers on `public.startups`** (can't be bypassed by the client)
   - `AFTER INSERT` → insert `submitted` event.
   - `AFTER UPDATE` on `status` → insert `approved` / `rejected` / `resubmitted` accordingly.
   - `AFTER DELETE` → insert `deleted` event (captures the row's snapshot in `metadata` so we still have name/URL after the row is gone).
   - Trigger function is `SECURITY DEFINER` with `search_path = public` and pulls `applicant_email` from `auth.users` via `user_id`.

3. **Admin panel: "Recently removed" section** (`src/routes/admin.tsx`)
   - New collapsible block above/beside Pending, showing `deleted` events from the last 30 days.
   - Each row: startup name, website, applicant email (click-to-copy + mailto:), submitted-at, deleted-at, and a small "Reach out" button that opens a mailto with a warm pre-filled draft.
   - Read via a new server function `getRecentlyRemoved` using `requireSupabaseAuth` + admin email check.

4. **No changes to the user-facing delete flow** — founders keep the ability to remove their own listing from `/account`. We just get a durable trail.

### Files touched

- New migration: `application_events` table + triggers + RLS + GRANTs.
- New: `src/lib/admin-events.functions.ts` (server fn to list recent removals, admin-only).
- Edit: `src/routes/admin.tsx` (new section).

### Acceptance

- Deleting a startup from `/account` writes a `deleted` row visible in Admin.
- Backfill: seed a single `deleted` row for Royal SoftWorks manually from the notification email data so it shows up immediately.
- Non-admin users get no access to `application_events` (RLS blocks + admin email gate on the server fn).

---

## Warm email to send to the Royal SoftWorks applicant

> **Subject:** Everything okay with your StartupBar application?
>
> Hey,
>
> I got your Royal SoftWorks application come through last night — thanks for putting it in! I went to review it just now and noticed the listing isn't in our system anymore, which usually means it was removed from the account page.
>
> Totally no worries if that was on purpose. I just wanted to check in — did something feel off, or was there a step that wasn't clear? If you'd like, I'm happy to jump in and get you set up personally: walk you through the widget snippet, help place it on royalsoftworks.com, and get you approved on the network the same day.
>
> Just reply here and I'll take it from there.
>
> Cheers,
> Daniel — StartupBar

Short, warm, no pressure, offers concrete help. Once Plan A ships you'll have the applicant's email pulled straight from the admin panel with a one-click "Reach out" button for cases like this in the future.
