## Root cause (confirmed by reading the page)

`src/routes/api/public/verify-install.ts` marks a site as "Hidden (CSS)" when any of `display:none`, `visibility:hidden`, `opacity:0`, `height:0`, or `hidden` appears in the 400 chars before the loader `<script>` tag. That window is not scoped to the script's own attributes or an ancestor wrapper — it catches any preceding CSS on the page.

On sullyzworld.com the loader tag sits directly after a `<style>` block whose responsive `@media` rule contains `.nav-links { display: none; }`. That rule targets the site's nav, not our widget, but it's inside the 400-char window, so the check trips. The widget renders correctly (visible in your screenshot).

The heuristic is also wrong in principle: the loader script itself is invisible (it injects an iframe at runtime), so CSS declared *before* the script tag in an unrelated `<style>` block can't hide the widget. Real "cheap CSS hiding" attempts look like a selector that actually targets the widget's iframe/host element.

## Fix

Replace the pre-script-window scan in `src/routes/api/public/verify-install.ts` with a narrower `suspicious` heuristic that actually indicates someone tried to hide our widget:

1. **Script-tag-scoped checks** (real signal):
   - The `<script ...>` tag itself has an inline `style="..."` containing `display:none`, `visibility:hidden`, `opacity:0`, or `height:0`.
   - The `<script ...>` tag itself has the `hidden` attribute.
   - The script's *immediate* parent element (checked by looking ~200 chars before the script and matching an unclosed opening tag like `<div ... style="display:none">`) hides it.

2. **Global-CSS checks that mention us** (real signal):
   - Anywhere in the document, a `<style>` block contains a rule whose selector references our widget (`iframe[src*="startupbar"]`, `script[src*="startupbar"]`, `#startupbar-bar`, `.startupbar`, `[data-startup-id]`) AND whose declarations include one of the hiding properties. Detect by regex-scanning each `<style>` block for a `{ ... }` chunk that contains both a startupbar-referencing selector and a hiding declaration.

3. **Drop** the current "400 chars before the tag" window entirely — it's the sole source of the false positive and doesn't correlate to actual hiding.

Keep the existing `installed`, `idMismatch`, `cspBlocked`, `cspFrameBlocked`, `cspImgBlocked` logic and the auth/SSRF guard untouched.

## Backfill

- Re-check sullyzworld.com from the admin (existing "Check now" flow) after the deploy — it should flip from Hidden (CSS) to a normal state, matching what you visually see.
- No DB writes needed.

## Not doing

- Not changing the admin UI badge itself — once `suspicious` becomes accurate, the existing badge is correct.
- Not touching the CSP checks or the `data-startup-id` mismatch check.
- Not adding an admin override toggle — the heuristic fix removes the whole class of false positive, so an override isn't needed.

## Technical notes

- File: `src/routes/api/public/verify-install.ts`, lines ~82–104 (the current `suspicious` block).
- Regex for global-CSS check: extract each `<style>[^]*?</style>` body, split on `}`, and for each rule check both `/startupbar|data-startup-id|startupbar-bar/i` on the selector portion and `/display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?!\.)|height\s*:\s*0(?:px)?\b/i` on the declaration portion.
- All checks stay cheap and run against the already-fetched HTML — no extra network calls.
