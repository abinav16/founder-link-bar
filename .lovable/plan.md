## Full resubmit-flow verification — clean, with one small hygiene fix

I traced every hop end to end:

### Path 1 — Dashboard → `/apply?resubmit=<id>`
`_authenticated/dashboard.tsx:446` renders the rejection banner only when `startup.status === "rejected"` and links via `<Link to="/apply" search={{ resubmit: startup.id }} />`. Produces `/apply?resubmit=<id>`. ✓

### Path 2 — URL parse → initial state
`readInitialFromUrl()` prioritizes `?paid=true` → `?resubmit=` → sessionStorage draft → blank. With `?resubmit=<id>` it returns `{ step: 2, resubmitId: id, name/url/desc: "" }`. `useState` uses `initial.resubmitId` for both `resubmitId` and `startupId`, so the same DB row / same embed ID is reused. ✓

### Path 3 — Prefill + auto-verify
Effect at `apply.tsx:162` runs once `authed === true` and `resubmitId` is set:
- Fetches the row scoped to `user_id === auth.user.id` — ownership guard. ✓
- Bails if `status !== "rejected"` — prevents re-triggering on already-approved rows. ✓
- Sets name/url/desc, `startupId = data.id`, `step = 2`, then calls `checkInstallation(data.website_url)` (URL passed explicitly — no stale-closure regression). ✓

Guard at `apply.tsx:141` (`authed === false && step === 2 → setStep(1)`) uses strict `false`, so the null loading state won't bounce a signed-in resubmit back to step 1. ✓

### Path 4 — Payment gate override
`needsPayment = !resubmitId && existingCount >= 1 && !hasPrepaid` → always `false` on the resubmit path. Button label is "Submit application", `onClick = onSubmit`. No `handlePayment`, no Dodo redirect, no `consume_prepaid_listing` RPC. ✓

### Path 5 — `onSubmit` resubmit branch
`apply.tsx:314`:
```
update({ ...parsed, status: "pending", rejection_reason: null })
  .eq("id", resubmitId).eq("user_id", user_id)
```
No `insert`, so no duplicate row and the same UUID (== embed script `data-startup-id`) is preserved. Ownership double-scoped by `user_id`. ✓

### Path 6 — DB trigger
`prevent_user_status_change` (migration `20260629112141_…`) allows owner-driven status change **only when `NEW.status = 'pending'`**. The resubmit update sets exactly that → trigger passes. Admin can later flip to `approved`/`rejected`. ✓

### Path 7 — Post-submit
- `sessionStorage.removeItem(DRAFT_KEY)` clears the draft.
- Startup-submitted + admin-new-application emails fire.
- `navigate({ to: "/dashboard" })`.
- Dashboard's realtime channel (now `dashboard-startup:<userId>:<uuid>`) receives the `UPDATE` payload and swaps in the pending row — the rejection banner disappears, the "Under review" amber banner appears. ✓

### One small hygiene fix

The draft-persistence effect (`apply.tsx:231-235`) unconditionally writes `{step, name, url, desc}` to `sessionStorage`. During a resubmit it overwrites the draft with the resubmitted startup's data — so if the founder later opens a fresh `/apply` (no query params) in the same tab, they'll land on step 2 with the old resubmitted values.

Fix: skip draft persistence when `resubmitId` is set (resubmits are stateless — the URL param is the source of truth):

```
if (resubmitId) return;
```

Everything else in the flow is correct and there are no duplicate-startup or unwanted-charge paths.

### Files touched

- `src/routes/apply.tsx` — one-line guard in the draft-persistence `useEffect`.
