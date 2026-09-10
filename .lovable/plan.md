# Fix the missing logo for your first paying subscriber

## What's wrong

Zengech (slot 1) has no uploaded logo, so the card falls back to Google's favicon service. For zengech.co.uk that service returns Google's generic globe icon — the same grey globe you see on several other cards. Nothing is broken in the card itself; the image source is simply a dead end for that domain.

NotepadPlus (slot 8) has no uploaded logo either, so it will hit the same issue.

## The fix

1. **Better logo fallback chain.** Instead of one favicon source, try several in order and only fall back to the letter tile when all fail: the uploaded logo, then the site's own high-resolution icon services (icon.horse, DuckDuckGo icons), then Google's, and finally the letter tile. Treat Google's generic-globe result as a failure so it never shows.
2. **Apply it everywhere.** The shared favicon component is used by the side rail, mobile banner, network, leaderboard, dashboard and startup pages, so one change covers all of them.
3. **Nudge paying members to upload.** On the featured card in Dashboard/Account, when a promoted startup has no uploaded logo, show a small "Add your logo" prompt linking to the existing upload control in Account. Paid placements deserve a real mark, not a favicon guess.

Optional: I can upload Zengech's logo for them directly if you send me the image file.

## Draft email to Aaron (Zengech)

Subject: Thank you for being our first featured founder

Hi Aaron,

You're the first founder to take a featured slot on StartupBar, so genuinely, thank you. Your card is live in the top-left position on the network page right now.

One small thing: your card is currently showing a generic icon because we're guessing your logo from your website. If you send me your logo (a square PNG or SVG works best) I'll put it up straight away, or you can upload it yourself under Account > your startup > Startup logo.

I'd also really like your honest input while it's early:

- What made you decide to take the slot, and what are you hoping it does for Zengech?
- Is anything about the dashboard or the stats unclear or missing?
- What would make this obviously worth the money to you a month from now?

If there's anything I can help with — the placement, your listing copy, the widget setup — just reply and I'll sort it personally.

Thanks again,
Abinav
StartupBar
