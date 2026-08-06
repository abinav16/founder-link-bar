# Track paid-but-unsubmitted listings

## What happened with today's payment

Nothing is broken. The Dodo payment from **jared@pypes.dev** (19:09 UTC today) was recorded correctly and is still **unconsumed** — meaning the paid listing credit is sitting on his account, waiting for him to finish the application form. He already has one approved listing (Career Jumpship), so this is a payment for a second one. When he submits the form, the credit is redeemed automatically and he is not charged again.

The one weak spot: his half-typed draft lives in the browser session, so switching browser/device loses the typed text (never the credit), and today you had no way to see "someone paid but never submitted" without querying the database.

## What to build

Add a **"Paid, no listing yet"** panel to the admin dashboard so these never go unnoticed.

For each unconsumed successful payment older than ~10 minutes, show:
- Founder email and name (and avatar if available)
- Amount context: payment ID and time since payment
- How many listings they already have
- A copy-email button so you can nudge them manually

The panel is empty in the normal case, so it only appears when there is something to act on.

## Technical notes

- An admin-only RPC `admin_orphan_payments(_older_than_minutes)` already exists and returns exactly these rows (payment id, user id, dodo payment id, created_at, email), gated to your admin email. No new migration needed unless we want the listing count, which can be joined client-side against the startups already loaded in Admin.
- Add a section in `src/routes/admin.tsx` that calls this RPC through the existing admin server-function path, rendered alongside the "Recently removed" panel and following the same card styling.
- No changes to the payment or checkout flow — the credit mechanics already work correctly.

No automatic reminder emails in this pass; the admin panel first, so you can see the volume before automating outreach.
