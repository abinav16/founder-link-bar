# Widget placement toggle (top / bottom)

Founders get a Top / Bottom switch for their bar in Account → Your startups. No approval step — it applies immediately. Default stays Top.

## What the founder sees

Inside each expanded startup card, a small segmented control:

```text
Bar placement:  [ Top ]  [ Bottom ]   (i)
```

The (i) tooltip/popover says (final copy):

> Top placement performs better. Visitors expect a thin promo strip at the top, so it gets noticeably more attention and clicks than a bottom bar, which competes with cookie banners, chat bubbles and mobile toolbars.
>
> It also affects how much traffic you receive. Our delivery algorithm is reciprocity-weighted: the more impressions your site sends into the network over the last 7 days, the more often your startup is shown on other members' sites (up to 4x the baseline). Placement doesn't change your weight directly, but a bottom bar that visitors scroll past — or that sits under a sticky footer — tends to be seen and clicked less, so your contribution score and your incoming traffic both drift down. 
>
> Bottom is fully supported if it fits your design better. You can switch back any time. (Make it short and keep all the content and done use any dash or hyhen symbols this is my siggestion)

Changing the toggle saves instantly with a toast; nothing goes to review.

## How it works technically

**Database** — new column on `startups`:
`widget_placement text not null default 'top' check (widget_placement in ('top','bottom'))`. Owner-update is already covered by the existing "Users can update their own startup" policy; the existing `prevent_user_status_change` trigger keeps status untouched. No new grants needed (table already granted).

**Account page** (`src/routes/_authenticated/account.tsx`) — add the segmented control + info popover in the startup card, writing `widget_placement` through the browser Supabase client and updating local state optimistically.

**Serving the preference** (`src/routes/api/public/widget.pick.ts`) — the pick response already runs on every widget load. It will also return the *host's* placement (`placement: 'top' | 'bottom'`) looked up from the host startup row, so no extra network round-trip is needed.

**Widget iframe** (`src/routes/widget.bar.tsx`) — on receiving the pick response, post `{ type: 'startupbar:placement', placement }` to the parent window.

**Loader** (`public/widget/loader.js`) — this is where the layout logic lives:

- Accepts an optional `data-placement="bottom"` attribute as an explicit override (useful for testing).
- Caches the last known placement in `localStorage` so repeat visits position the bar correctly on first paint (no flash).
- On `startupbar:placement`, switches the iframe between:
  - top: `position:fixed; top:0`, body `padding-top` offset, `scroll-padding-top`, and the existing sticky/fixed-header shifting sweep.
  - bottom: `position:fixed; bottom:0`, body `padding-bottom` offset, **no** header shifting (existing shifted elements get unshifted), `scroll-padding-bottom` instead.
- Dismiss/teardown restores whichever padding was applied.
- iPhone Safari path (currently `position:static` inserted at top of body) uses `position:fixed; bottom:0` for bottom mode, which behaves correctly there.
- Resize messages from the info panel keep working in both modes (bottom bar expands upward since it is anchored to the bottom edge).

**Admin/verification** — unchanged. Heartbeat visibility detection already uses `getBoundingClientRect` + `elementFromPoint`, which works for a bottom-anchored bar, so "installed / live" status is unaffected.

## Out of scope

- No change to the reciprocity algorithm or weighting.
- No admin approval, no per-page placement rules.  
  
  
1 question before you proceed the same way we placed like keeping the padding for 36px will be appliued same at the bottom right? any techincal difficulties we'll be hving extra then currently we have it at the top?