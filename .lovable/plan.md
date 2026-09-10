# Fixes from Aaron's feedback (first paying subscriber)

Three real bugs plus one confusing behaviour, all confirmed in the code.

## 1. Editing a listing takes it off the network (and out of the paid slot)

Today, saving a change to a startup's name or description flips its status back to "pending". Everything that shows startups — the network page, the leaderboard, the widget rotation and the featured slot he paid for — only shows approved listings, so his card vanished until review. That is unacceptable for a paying member.

**Fix:** keep the approved version live while the edit waits for review.

- Store the proposed name/description in separate "pending edit" fields, leave the listing approved and visible.
- The account card shows "Changes under review — your live listing is unchanged", with the option to withdraw the edit.
- Admin sees a side-by-side of live vs proposed text with Approve changes / Reject changes. Approving copies the new text into the live fields; rejecting clears the proposal and leaves the listing untouched.
- Brand-new listings keep the current behaviour (pending until first approval).

His current listing is already approved, so nothing is stuck right now, but the pending text he submitted needs to be applied — I will surface it in the admin panel once this is in.

## 2. "Welcome to StartupBar" email sent 3 times

The "already welcomed" marker is stored in the browser, so every new browser, device, private window or cleared-storage sign-in sends it again.

**Fix:** record the welcome send once per account on the server, and have the email function refuse to send a second welcome to the same account. Existing members are marked as already welcomed in the same change, so nobody gets another one.

## 3. Visitor from India shows in the list but not on the globe

The globe only drops a pin for visits from the last 5 minutes; the list below shows everyone from today. Nothing is broken, but it reads as a bug.

**Fix:** pin every visitor from today, with live ones (last 5 minutes) shown bright and pulsing and earlier ones as small dimmed dots. The counter is relabelled so it's clear which is which, and clicking a name in the list flies to its pin.

## 4. Reply to Aaron

Short reply confirming: the listing-goes-offline-on-edit bug is fixed so his slot stays live during reviews, his pending text is applied, the triple welcome email is fixed, and the map now shows the India visit. Plus a note that clicks and traffic are exactly what the placement is for and the dashboard already breaks them down by source.

## Technical notes

- Migration: add `pending_name`, `pending_description`, `edit_status`, `edit_submitted_at` to `public.startups`; add `welcome_email_sent_at` to `public.profiles` and backfill existing users.
- `src/routes/_authenticated/account.tsx`: `confirmSubmit` writes pending fields instead of `status: 'pending'` when the listing is already approved.
- `src/routes/admin.tsx`: new "Edits" view/filter with approve/reject of pending edits.
- `supabase/functions/send-email/index.ts`: guard `type === 'welcome'` on `welcome_email_sent_at`; `src/routes/__root.tsx` keeps the local flag only as an optimisation.
- `src/components/LiveVisitorMap.tsx`: drop the `PIN_LIFETIME_MS` filter on historical seed pins, add a `stale` pin style, keep realtime pins as-is.
