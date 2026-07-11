## Why founders arrive with a "wrong ID" installed

I traced the flow. It's not that they installed the snippet weeks ago and forgot — it's a bug in `/apply` that gives them a **new ID** partway through the same application.

### The bug

`src/routes/apply.tsx:168` generates the widget ID client-side:

```ts
const [startupId, setStartupId] = useState(() => initial.resubmitId || crypto.randomUUID())
```

`crypto.randomUUID()` runs **on every fresh mount**. And the draft we persist to `sessionStorage` (line 285) only saves `step / name / url / desc` — **not `startupId`**. The Dodo payment return URL (line 317) also carries name/url/desc but not the ID.

So the typical failure path is:

1. Founder opens `/apply`, gets snippet with UUID‑A, copies it, installs on their site.
2. Anything that remounts the page — reload, sign-in round-trip, payment redirect back from Dodo, `paid=true` URL rewrite — generates UUID‑B.
3. Draft restores their form fields but the state reinitializes `startupId` to UUID‑B.
4. They submit → DB row inserted with UUID‑B (line 412).
5. Their site keeps pinging with UUID‑A → admin sees "Wrong ID".

This matches what you're seeing: brand-new applications arriving already flagged, because the ID drifted between "copy snippet" and "submit".

### Fix

Make the widget ID stable for the whole application session:

1. **Persist `startupId` in the sessionStorage draft.** Save it alongside `step/name/url/desc` in the `useEffect` at line 281–286, and restore it in `readDraft` / initial state.
2. **Round-trip `startupId` through Dodo payment.** Add `&sid=<startupId>` to `returnUrl` in `handlePayment` (line 317) and read it back in `readInitialFromUrl` (line 140+), so the post-payment mount reuses the same ID the founder already installed.
3. **Initial state precedence:** `resubmitId → draft.startupId → url ?sid → new crypto.randomUUID()`.

No DB or schema changes. Pure frontend fix in `src/routes/apply.tsx`.

### Not doing (out of scope)

- No changes to admin verify-install logic — it's correctly reporting the mismatch.
- No changes to widget loader.
- Existing rows with mismatched IDs still need the manual repoint you've been doing (or I can add a small admin action later).
