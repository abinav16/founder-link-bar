## Where Solomon (and future paid users) actually get redirected

When someone clicks **Pay** on `/apply`:

```text
1. Browser  →  create-dodo-checkout  (edge function)
                • Verifies JWT, builds Dodo checkout with:
                  return_url = https://startupbar.co/apply
                               ?paid=true
                               &name=<name>
                               &url=<website>
                               &desc=<description>
                               &sid=<new-startup-uuid>
                               &payment_id={payment_id}   ← Dodo substitutes real ID
2. Browser  →  Dodo checkout page  (checkout.dodopayments.com/...)
3. After paying, Dodo redirects the browser back to that return_url
4. /apply reads paid=true + payment_id from the URL
5. Browser  →  verify-dodo-payment (checks Dodo, inserts row in `payments`)
6. /apply refreshes gate data, auto-calls onSubmit()
7. onSubmit consumes 1 prepaid slot + inserts startup, sends emails
8. Navigate to /dashboard
```

So the intended destination is **`https://startupbar.co/apply?paid=true&...`**, and on success the user lands on **`/dashboard`**. I re-tested `create-dodo-checkout` end-to-end just now — it returned HTTP 200 with a real `payment_link`, so Dodo itself is healthy.

## What went wrong for Solomon (best explanation given the evidence)

The redirect target is correct, but the flow is **fragile from step 3 onward**. Any of these silently orphan a real payment:

1. User closes the tab on Dodo's success page before Dodo redirects them back — no `verify-dodo-payment` ever runs, no `payments` row is ever created, so the app has no idea they paid.
2. Dodo redirects back but the browser drops the session (mobile Safari, ITP, cross-site cookies) — `supabase.auth.getUser()` returns null, verify 401s, we show "couldn't verify".
3. `verify-dodo-payment` runs before Dodo has marked the payment `succeeded` (rare race) — we return `ok: false`, no `payments` row inserted, user is stuck.
4. `onSubmit` auto-fires but `hasPrepaid` hasn't propagated yet, or `consume_prepaid_listing` returns no ID because the payment row wasn't inserted — user sees "No prepaid listing available".

There is **no webhook** and **no admin recovery view for "paid but not submitted"**, so any of the above == silent money loss + angry email like Solomon's.

## Proposed fix

### 1. Add a Dodo webhook (source of truth, not the browser)

New server route: `src/routes/api/public/dodo-webhook.ts`
- Verify Dodo's HMAC signature against `DODO_WEBHOOK_SECRET`.
- On `payment.succeeded`: upsert `payments` row keyed by `dodo_payment_id`, with `user_id` resolved from Dodo's customer email → `auth.users`.
- Idempotent (safe if browser return-flow also runs verify).

This means: even if the user closes the tab on Dodo, their `payments` row still lands, and the prepaid slot is theirs the next time they open `/apply`.

### 2. Pass user_id + attempt marker into checkout metadata

Update `create-dodo-checkout` to send `metadata: { user_id, intended_startup_id }` on the Dodo payment. Webhook uses this instead of email lookup, which is more reliable and handles email-case mismatches.

### 3. Make the return flow retry + surface errors

In `src/routes/apply.tsx`:
- On `paid=true` return, if `verify-dodo-payment` returns `ok:false`, retry up to 3× with 2s backoff (handles the race in #3 above).
- If it still fails, show a clear message: "Payment received — your dashboard will show the slot within a minute. Refresh if needed." instead of the current dead-end toast. The webhook will have already inserted the row.
- Keep the auto-submit path, but if it fails, keep the draft so the user can retry without losing anything.

### 4. Admin recovery: "Paid but not submitted"

Add a panel to `/admin` that lists `payments` rows where `consumed_at IS NULL` older than 10 minutes, joined with the user's email. One click "Reach out" mailto so we can rescue future Solomons in seconds instead of hours.

### 5. Trim PII from the return URL

Today the return URL carries `name`, `url`, `desc` in the query string — they end up in Dodo's referer logs and browser history. Move them to `sessionStorage` (already partly used via `DRAFT_KEY`) and keep only `paid=true&sid=<uuid>&payment_id={payment_id}` in the URL.

### Technical details

- New secret required: `DODO_WEBHOOK_SECRET` (you generate one strong random value, paste into Dodo dashboard → Webhooks, and into `add_secret` on our end).
- Webhook endpoint URL to give Dodo: `https://startupbar.co/api/public/dodo-webhook` (public prefix bypasses auth; HMAC verification enforces trust).
- `payments` table already has the right shape (`dodo_payment_id` unique key), so no migration needed for #1.
- No changes to `consume_prepaid_listing` — it already atomically reserves the oldest unconsumed row.
- Files touched: `src/routes/api/public/dodo-webhook.ts` (new), `supabase/functions/create-dodo-checkout/index.ts` (add metadata), `src/routes/apply.tsx` (retry + trimmed URL + friendlier failure copy), `src/routes/admin.tsx` (new orphaned-payments panel).

## Reply you can send Solomon right now

> Hey Sully — really sorry about the friction. I checked from my side: your payment for sullyzworld.com did go through on our end, and I've manually approved the site so you don't have to run the flow a third time. Both meetvitalis.com and sullyzworld.com are live in the network now. I'm also shipping a fix today so this can't happen to anyone else — payments will register even if the redirect back to our site drops. Appreciate you flagging it, and again, sorry for the run-around.