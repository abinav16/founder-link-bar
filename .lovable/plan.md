## Goal

Give admin a soft step before rejection: send a warning email to the founder telling them they have 48 hours to reinstall the snippet, start a visible 48h countdown on the admin row, and surface clearly when the window expires so you can reject and remove them from the network.

## 1. Database

New migration adds two columns to `public.startups`:

- `warned_at timestamptz` — when the warning was sent
- `warn_expires_at timestamptz` — `warned_at + 48 hours`

RLS: admin email already has full update access via the existing admin policy, so no new policy needed. The `prevent_user_status_change` trigger only blocks `status` changes, so these new columns are safe for the admin to write.

## 2. Email template

In `supabase/functions/send-email/index.ts` add `emailStartupWarning(name, startupName, deadlineText)`:

- From: `FROM_PERSONAL` (founder can reply)
- Subject: `Action needed: reinstall StartupBar on {startupName}`
- Body: friendly note that the embed snippet is no longer detected on their site, they have **48 hours** (until `{deadlineText}`) to reinstall it or their startup will be removed from the network. Includes the snippet block and a "Go to dashboard" CTA.

Add `type === "startup-warning"` branch in the `serve` handler that looks up the founder's email the same way `startup-approved`/`startup-rejected` already do.

## 3. Admin UI (`src/routes/admin.tsx`)

In the Approved tab row actions:

- New **Warn** button (yellow/outline) next to Reject, only enabled when `embed_status !== "live"` and there is no active warning.
- On click: confirm dialog → update startup with `warned_at = now()`, `warn_expires_at = now() + 48h` → invoke `send-email` with `type: "startup-warning"` → toast.
- Replace the button with a live countdown chip `Warned · 41h 12m left` (recomputed every minute via a small `useEffect` interval).
- When `warn_expires_at < now()`: chip turns red `Warning expired — safe to reject`, and the **Reject** button gets a subtle highlight. Reject flow itself is unchanged (still one click, still sends the rejection email).
- Add a new top-level tab/filter **Warned** that lists all startups with an active warning, sorted by soonest expiry first, so you can scan who is about to lapse.
- If admin re-checks embed and it comes back `live`, automatically clear `warned_at`/`warn_expires_at` and show a green "Reinstalled ✓" toast.

## 4. No auto-reject

Per your message ("if its done i get to know we can reject it"), expiry only *signals* you — it does not auto-reject. You stay in control of the destructive action.

## Files touched

- `supabase/migrations/<new>_add_warn_to_startups.sql` — new columns
- `supabase/functions/send-email/index.ts` — `emailStartupWarning` + handler branch
- `src/routes/admin.tsx` — Warn button, countdown chip, Warned tab, auto-clear on reinstall

## Out of scope

- No cron job, no automatic rejection on expiry.
- No changes to the founder dashboard (can add a banner there in a follow-up if you want).
