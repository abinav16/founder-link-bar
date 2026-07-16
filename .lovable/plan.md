Update the widget bar to address Allan's feedback, applying the mobile-only changes only when `isMobile` is true.

1. Open all outbound links in a new tab
   - Change the "Visit →" click-through link from `target="_top"` to `target="_blank" rel="noopener noreferrer"`.
   - Confirm the existing STARTUPBAR badge and "Join free →" links already use `target="_blank"`.

2. Add a "Visit" button on mobile
   - In mobile view, render a "Visit" text label immediately to the left of the existing arrow "→".
   - Keep the arrow as the clickable hit target (or wrap both in the same anchor) so no extra click area is added.

3. Hide the STARTUPBAR badge on mobile
   - Conditionally render the STARTUPBAR badge only when `!isMobile`.
   - This frees horizontal space for the startup name + description marquee.

File to edit: `src/routes/widget.bar.tsx`.

Verification: run a local preview at `/widget/bar?mobile=1` and a desktop viewport to confirm the badge hides on mobile, the Visit label appears, and links open in a new tab.