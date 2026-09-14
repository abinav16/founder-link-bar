# Fill featured slot cards: founder social + bottom action row

Featured cards in the side rails (and the mobile banner) have empty space at the bottom. Fill it with founder-helpful elements — no metrics — and add the founder's X/Twitter presence near their name.

## What changes

**1. Founder social icon (next to founder name)**
- The founder's X/Twitter handle already exists (`profiles.twitter_handle`, populated for ~15 founders).
- Extend the `public_featured_slots` RPC to also return `twitter_handle` (already joins `profiles`).
- In the featured card, when a handle exists, show a small X icon button beside the founder name that opens `https://x.com/<handle>` in a new tab. `stopPropagation` so it doesn't trigger the card's main link (avoid nested anchors).

**2. Bottom action row (fills the marked empty space)**
A slim row pinned to the card bottom with:
- **Visit site →** — the primary gold CTA; goes through the same tracked `/api/public/widget/click?id=...&source=featured` redirect the card already uses, so featured clicks and attribution stay identical.
- **View profile** — a quiet secondary link to their `startupbar.co/startup/<slug>` profile (falls back to hidden when the startup has no slug). This raises their profile views — directly helpful to founders.
- **Founder on X** — when a handle exists, `@handle` with the X icon sits at the end of the row (same behavior as the icon by the name; keep it in one place — put the X icon + @handle in the bottom row only, and keep the plain name line clean up top).
- Card becomes `flex flex-col` with `mt-auto` on the row so it always sits flush at the bottom regardless of one-liner length.
- Only booked cards change; empty "Book this slot" cards stay as they are.

## Look
- Bottom row: thin top border `border-white/10`, small 11px text, "Visit site →" in gold-ish white with the arrow sliding right on hover; "View profile" and "@handle" in muted white with hover brightening. Matches the existing dark gold card language (`sb-sponsored`).

## Technical notes
- Migration: recreate `public_featured_slots()` adding `p.twitter_handle` to the returned columns (same filters, same security definer, `SET search_path` preserved).
- `src/lib/featured.ts`: add `twitter_handle: string | null` to `FeaturedSlot`.
- `src/components/SponsoredRail.tsx` (`FeaturedCard`): add the X icon button next to founder name OR bottom row per above, bottom action row with Visit site / View profile / @handle.
- `src/components/FeaturedMobileBanner.tsx`: mobile chips stay as-is (too small for extra content) — desktop rails only.
- X icon: small inline SVG (lucide has no brand X icon) or `Twitter` from lucide as fallback; use a minimal inline X path for the real brand look.
- No change to click tracking, booking flow, or metrics — Visit site reuses the existing tracked URL.
