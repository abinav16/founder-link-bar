# AI-agent install prompt on the Apply page

A community member (AlexWho3000) suggested: for non-technical users, the installation could also be a ready-to-use prompt for an AI agent (Lovable, Cursor, v0…) that installs the widget for them. Add a one-click "copy the prompt" option to the install step.

## What changes

**New option on the Apply page install step (`src/routes/apply.tsx`, step 2)**

- Directly under "1 · Your embed code", add a slim card / expandable row:
  - Title: "Let your AI agent install it" with a short subline: "Using Lovable, Cursor, v0 or another AI builder? Copy this prompt and give it to your agent."
  - A "Copy prompt" button (same pattern as the existing `CopyableCode` component, but for plain text — no code-block styling).
- The prompt is generated per startup with the real snippet and startup ID baked in, so the agent installs the exact same embed code:

```text
Add the StartupBar widget to my website.

1. Paste this script tag inside the <head> tag of every page:
   <script async src="https://startupbar.co/widget/loader.js" data-startup-id="<ID>"></script>

2. The widget is a 36px bar pinned to the very top of the page. If my site has a
   fixed or sticky header, push it down by 36px (e.g. header { top: 36px }) so
   nothing hides behind the bar.

3. If the site has a Content-Security-Policy, add these directives:
   script-src https://startupbar.co;
   frame-src https://startupbar.co;
   img-src 'self' data: https://www.google.com https://*.googleusercontent.com;

4. Do not change anything else on the site.
```

- Wording stays platform-agnostic (no "Lovable-specific" instructions), so the same prompt works in any agent.

**No changes to**

- Verification flow — "Check now" works exactly as before; the agent installs the same script, so detection is unchanged.
- The manual "Where to paste it" guide, CSP help cards, and theme/header guide items — they stay for people installing by hand.
- Tracking, embed IDs, or the dashboard.

## Look

- Quiet, secondary treatment: same monochrome card language as the install checklist, small sparkle/bot icon, "Copy prompt" button in the existing button style. It should read as an easier alternative, not a third required step.

## Technical notes

- Single file change: `src/routes/apply.tsx`.
- Reuse the copy-button pattern from `CopyableCode` (a small local variant or a `plainText` prop on it) so clipboard + "Copied!" feedback match the rest of the page.
- The prompt string is built from the existing `snippet` / `startupId` values already in scope at that point.
