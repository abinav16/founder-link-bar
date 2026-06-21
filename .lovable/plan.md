# Fix: impressions silently dropped inside cross-origin iframes

## Root cause

`src/routes/widget.bar.tsx` records the impression from inside the iframe using the **browser** Supabase client:

```ts
supabase.from("impressions").insert({ shown_startup_id: data.id, host_startup_id: host ?? null }).then(() => {});
```

That client is initialized to read/write `localStorage`. When the iframe is loaded cross-origin (StartupBar served on `startupbar.co`, embedded on `verifiedmrr.in`), Chrome's third-party storage partitioning / Brave / Safari ITP either blocks `localStorage` or hands it a partitioned store with no session. The Supabase client init throws or the request never fires; the `.then()` swallows it.

This matches the data exactly: PreShip's and Notepad's iframes record fine; VerifiedMRR — viewed in a partitioned third-party context — never records, even though the bar is visibly rendering PreShip (confirmed by the screenshot).

## Fix: record the impression server-side during the pick call

Move the insert out of the browser into `/api/public/widget/pick`, which already runs server-side and has no storage dependency. The iframe's only job becomes rendering.

### Changes

**1. `src/routes/api/public/widget.pick.ts`** — after selecting `pick`, insert an impression row using the same server publishable client before returning the JSON:

```ts
await supabase.from("impressions").insert({
  shown_startup_id: pick.id,
  host_startup_id: host ?? null,
});
```

The existing RLS `WITH CHECK` policy (`shown_startup_id` must belong to an approved startup) is satisfied because we just selected an approved row. The `anon` role already has INSERT via that policy.

**2. `src/routes/widget.bar.tsx`** — delete the client-side `supabase.from("impressions").insert(...)` block. No replacement needed.

**3. `src/routes/api/public/widget.click.ts`** — already server-side and already inserts the click row. Nothing to change.

## What this does NOT touch (so VerifiedMRR's own announcement bar / BoostMRR is safe)

VerifiedMRR runs **two separate widgets** on its homepage:
- StartupBar's bar (`startupbar.co/widget/loader.js` → iframe to `/widget/bar`)
- BoostMRR — VerifiedMRR's own announcement bar, a separate product served from a different origin and not part of this codebase

This fix only edits two files inside StartupBar:
- `src/routes/api/public/widget.pick.ts` — adds one server-side insert
- `src/routes/widget.bar.tsx` — removes one failing client-side insert

It does NOT change:
- `public/widget/loader.js` (the iframe-guard, domain param, script tag, sizing, theme detection — all unchanged)
- The `<iframe>` URL, dimensions, z-index, CSS, or any styling
- The picker's selection logic, host exclusion, or domain filter
- Any cross-widget script, message channel, or DOM the BoostMRR bar might rely on
- Any other origin or product

BoostMRR loads completely independently from StartupBar — different `<script>` tag, different iframe, different origin. There is no shared global, no shared CSS, no shared message bus between them. Editing StartupBar's pick handler and deleting one line from `widget.bar.tsx` cannot reach BoostMRR.

## Expected outcome

- VerifiedMRR's site starts producing rows in `impressions` with `host_startup_id = a1ab12c8…`, including PreShip as `shown_startup_id`.
- PreShip's analytics card stops sitting at 0.
- VerifiedMRR's BoostMRR bar continues working exactly as before.
- The visible StartupBar UI on every site is unchanged.

## Trade-offs (unchanged from previous draft)

- Impression now logs at picker-resolve time, ~<100 ms before paint. Standard ad-network behavior.
- Bots hitting `/widget/pick` count as impressions — same exposure as before, since the previous client-side path also fired on every iframe load.
