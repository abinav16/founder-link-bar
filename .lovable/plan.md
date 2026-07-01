## What the Redditor is describing

Two real UX bugs in the current apply flow:

### Bug 1 — Rejected startups still count as "used your free slot"

In `src/routes/apply.tsx`, the payment gate is:

```ts
supabase.from("startups").select("*", { count: "exact", head: true }).eq("user_id", userId)
```

This counts **every** startup for the user, including `rejected` ones. So if a founder's first submission is rejected (bad URL, missing embed, wrong category, etc.), they're now on their "second" listing and get hit with the **$9.99 gate** just to try again. That's exactly what `pystar` is calling out.

### Bug 2 — Rejection forces a full re-submission instead of "fix + re-verify"

Today, rejection is terminal for that row. There's no "edit and resubmit" path — the founder has to fill in name/URL/description again, re-install the script, and click Verify from scratch. The Redditor's ask ("just clicking verify") is reasonable: if we rejected them for a fixable reason (embed not installed / hidden / CSP), the retry should be one click, not a restart.

## Fix

### Part A — Stop charging for rejected retries (small, safe, ship first)

In `refreshGateData()`:
- Change the count query to `.not("status", "eq", "rejected")` so only pending / approved / warned listings count toward the free-first-slot rule.
- Founders whose only prior startup was rejected → back to free.
- Founders with 1 approved + 1 rejected → still pay for the third (unchanged intent).

Also update the Step 2 copy: when `existingCount === 0` after filter, keep the "First listing is free" line.

### Part B — Add "Resubmit" for rejected startups (bigger, needs a bit more)

On the dashboard, if the user has a `rejected` startup:
- Show a **Fix & resubmit** button on that row.
- Clicking it deep-links to `/apply?resubmit=<startup_id>`, which:
  1. Prefills name / URL / description from that row.
  2. Skips straight to Step 2 (install + verify).
  3. On successful verify + submit, **updates** the existing row back to `pending` and clears `rejection_reason` — no new row, no payment prompt.

DB / RLS:
- Owners can already update their own rows (existing policy).
- The `prevent_user_status_change` trigger already permits owners to reset status → `pending`, so this works with no schema change.
- Send `startup-submitted` email again on resubmit so admin sees it in the queue.

### Files touched

- `src/routes/apply.tsx` — filter rejected from `existingCount`; support `?resubmit=<id>` mode; on submit, update instead of insert when in resubmit mode.
- `src/routes/_authenticated/dashboard.tsx` — show "Fix & resubmit" button on rejected rows with the rejection reason inline.
- (Optional) `supabase/functions/send-email/index.ts` — no change needed; existing `startup-submitted` handler is reused.

## What I'd ship in the next commit

Part A only, because it directly answers the Reddit complaint ("told to pay $9.99 after rejection") and is a 2-line query change with zero risk. Part B is a follow-up once you confirm the resubmit UX you want (edit form vs. verify-only).

## Answer to give pystar

"You're right — that's a bug on our side, not intended. The $9.99 gate should only apply after you have an approved listing. Rejected submissions shouldn't count. Fix is going out now, and rejected startups will get a one-click Fix & resubmit button on the dashboard shortly after."
