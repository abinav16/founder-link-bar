# Fix: bar drops by 36px after Livewire (wire:navigate) navigation

## What is happening

Hameem's report is accurate and reproducible from the loader code in `public/widget/loader.js`.

Two facts combine:

1. The loader has **no single-instance guard**. On a `wire:navigate` client-side navigation, Livewire re-runs scripts in the swapped document, so the whole IIFE executes a second time and creates a *new* iframe plus new closure state.
2. The fixed-element sweep only skips the iframe by object identity: `if (el === iframe ...) return;` (line 205). The **second** instance holds a different `iframe` reference, so it sees the **first** instance's still-mounted iframe as an ordinary fixed element with `top: 0` and shifts it to `top: 36px`, stamping `data-startupbar-shifted="1"` and `data-startupbar-original-top="0px"`. That is exactly the markup in the email.

The same re-run also double-counts spacing: the second instance reads the already-padded `body` (`padding-top: 36px`), captures that as its "original", and adds another 36px, which is the blank strip above the bar.

A hard reload clears both because only one instance exists again.

## Fix

All in `public/widget/loader.js`:

1. **Identify the iframe by attribute, not identity.** Set `data-startupbar-frame="1"` (plus a stable `id`) on the iframe and make `shiftFixedElement` skip any element carrying that attribute. This alone stops the bar from ever shifting itself, even across instances.
2. **Single-instance guard.** At the top, if `window.__startupbarLoaded` is already set (or an existing `[data-startupbar-frame="1"]` node is in the DOM), do not build a second widget. Instead re-assert the existing bar's position and spacing and return.
3. **Re-assert position on client-side navigation.** Listen for `livewire:navigated`, `turbo:load`, `astro:page-load`, `popstate`, plus a `history.pushState`/`replaceState` patch, and on each: re-run `applyIframeStyle()`, clear any stray `data-startupbar-shifted` on our own frame, and recompute spacing from a clean base.
4. **Make spacing idempotent.** Track the padding the loader itself added and subtract it before recomputing, so repeated `applySpacing()` calls can never stack a second 36px.

No backend, database, or app UI change is needed. Hosts pick up the fix automatically because the loader is served from startupbar.co.

## Reply to Hameem

Short note confirming the cause (the loader re-initialised on `wire:navigate` and treated its own iframe as a host fixed element), that the fix excludes the StartupBar frame from the positioning sweep and resets to `top: 0` after client-side navigation, and that no change is needed on his side.
