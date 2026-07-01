## Second-pass audit — two issues found

### Issue 1 — `checkInstallation()` on resubmit uses stale URL (real bug from last turn)

In `src/routes/apply.tsx` the resubmit prefill does:

```
setUrl(data.website_url);
...
setTimeout(() => { checkInstallation(); }, 0);
```

`checkInstallation()` reads `url` from the effect's closure, which is the value at the render when the effect ran — before `setUrl` flushed. On the first resubmit load `url` is `""`, so `/api/public/verify-install?url=` hits an empty URL and returns not-found. The founder still has to click "Check now" manually — defeating the fix from last turn.

Fix: change `checkInstallation` to accept an optional override URL (`checkInstallation(targetUrl?: string)`), fall back to state when omitted, and pass `data.website_url` explicitly from the resubmit effect.

### Issue 2 — Realtime channel error on dashboard (runtime error you're seeing)

Runtime error: `cannot add postgres_changes callbacks for realtime:dashboard-startup after subscribe()`.

`src/routes/_authenticated/dashboard.tsx` opens `supabase.channel("dashboard-startup")` with a hard-coded topic. React StrictMode (and any remount) runs the effect twice; Supabase's realtime client reuses the existing channel by topic, so the second `.on("postgres_changes", …)` fires after the first `.subscribe()` and throws. This is harmless today because the try still returns cleanup, but it spams runtime errors and can leave the second listener silently detached.

Fix: give the channel a unique topic per mount, e.g. `` `dashboard-startup:${userId}:${crypto.randomUUID()}` `` (still scoped to the user via the `filter`). Keep the existing `removeChannel` cleanup.

### Everything else re-checked and clean

- Resubmit `needsPayment` override is in place — no charge on resubmit even with another approved startup.
- Resubmit `onSubmit` branch updates in place, clears `rejection_reason`, scoped by `user_id`.
- `refreshGateData` excludes rejected rows → first-listing-free path preserved after rejection.
- Payment return path (`?paid=true&payment_id=…`) verifies server-side, refreshes gate, auto-submits — untouched.
- Dashboard rejection banner links with `search={{ resubmit: id }}` — matches `readInitialFromUrl`.

### Files touched

- `src/routes/apply.tsx` — `checkInstallation(targetUrl?)` + pass `data.website_url` from resubmit effect.
- `src/routes/_authenticated/dashboard.tsx` — unique channel topic per mount.
