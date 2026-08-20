# Mobile promoted banners for featured slots

Today the 8 featured slots only render in the desktop side rails (`SponsoredRail` is `hidden xl:block`), so mobile visitors never see promoted startups. Add compact promoted banner strips at the top and bottom of the page on mobile only.

## What it looks like

- A slim horizontal banner rail, shown only below `xl` (where the side rails are hidden).
- Each card is small: startup logo + startup name only, no one liner, no founder.
- Gold treatment consistent with the existing featured styling, plus the glass sweep.
- Cards scroll horizontally in one row (snap scrolling), tappable straight to the startup's website in a new tab.
- Small "Promoted" label above the row so it reads as paid placement.

## Placement

- Top banner: directly under the header, above page content (slots 1 to 4).
- Bottom banner: below page content, above the footer (slots 5 to 8).
- Only booked slots are shown. If a group has no booked slots, that banner renders a single quiet "Book this slot" card that opens the existing booking dialog.
- If nothing is booked at all, both banners are hidden entirely so the page stays clean.

## Technical notes

- New component `src/components/FeaturedMobileBanner.tsx` with a `slots: number[]` prop, reusing `fetchFeaturedSlots` via the same React Query key `["featured-slots"]` (no extra requests), `StartupFavicon`, and `FeaturedBookingDialog` for the empty case.
- Render inside `DashboardLayout` in the `rail` branch only, wrapped in `xl:hidden`, above and below the `page-enter` content div.
- Card markup: `flex items-center gap-2 rounded-xl border px-3 py-2` with `sb-sponsored` for the gold sweep, name `truncate text-sm`, logo `h-7 w-7 shrink-0`.
- Row: `flex gap-2 overflow-x-auto snap-x scroll-px-4 -mx-4 px-4 [scrollbar-width:none]` so it bleeds edge to edge on small screens.
- No backend, schema, or booking logic changes; desktop rails stay exactly as they are.
