# Show StartupBar's own listing on non-member sites (uncounted)

## What changes

Today, when a site that is not an approved member still has the script installed (rejected, pending, or banned), the widget falls back to the generic "Join free" banner.

Instead, those sites will show **StartupBar's own approved network listing** — same look as any normal rotation slot — but nothing is recorded:

- no impression is logged
- no click is logged (already the case today)
- the visitor can still click through to startupbar.co

Approved member sites are unaffected: they keep serving real network startups with full impression and click counting.

## Technical notes

`src/routes/api/public/widget.pick.ts`: when `isApprovedHost()` returns false, instead of returning `null`, fetch the StartupBar row (`0d2db708-f4e9-4b77-bd83-c446826c76b1`, status `approved`) and return it with no impression insert. If that row can't be fetched for any reason, fall back to the current `null` behaviour so the bar degrades to the generic banner rather than breaking.

`src/routes/api/public/widget.click.ts` already skips the click insert when the host isn't approved, so no change is needed there. The click still redirects, so outbound traffic to startupbar.co keeps working.

No database or widget-loader changes.
