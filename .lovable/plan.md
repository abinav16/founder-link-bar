## Verdict on the Reddit feedback

**1. "Navigation disappears when scrolling" — REAL issue.**
`src/routes/index.tsx` line 660 renders the landing header as `relative z-20 …` (not sticky). Once the user scrolls past ~64px, the nav (Network, Leaderboard, Sign in, **Join the network**) is gone until they scroll back to the top. On a marketing page where "Join" is the primary CTA, this is real friction — the commenter is right.

Note: authenticated app pages (`DashboardLayout`) already use `sticky top-0 z-30` and are fine. This bug is only on the public landing page.

**2. "Site logo does not link back to the homepage" — NOT a real issue.**
`Logo()` at line 580 already wraps the mark + wordmark in `<Link to="/">`. Clicking it does navigate home. The QAlaunch tool likely flagged it because it's a `<Link>` (client-side router anchor) rather than a raw `<a href="/">`, or because the homepage doesn't visibly change when you're already on `/`. Nothing to fix.

## Fix (only #1)

In `src/routes/index.tsx`, change the landing `<header>` (line 660) from:

```
<header className="relative z-20 border-b border-black/8 bg-white">
```

to a sticky header, matching the pattern already used in `DashboardLayout`:

```
<header className="sticky top-0 z-30 border-b border-black/8 bg-white/90 backdrop-blur">
```

- `sticky top-0` keeps the nav + Join CTA visible on scroll.
- `z-30` sits above hero/section content (`z-20`) but below the top progress bar / toasts.
- `bg-white/90 backdrop-blur` keeps it legible over the hero without a hard opaque band as content scrolls under it (fallback stays white where backdrop-filter is unsupported).

No other changes. Header markup, auth states, and links stay identical. This is a one-line CSS change on the landing page only.

## Not doing

- Not touching the logo link (already correct).
- Not changing `DashboardLayout` or `SiteHeader` (already sticky / not the page the commenter tested).
- Not adding scroll-hide/show behavior — plain sticky matches the rest of the app.