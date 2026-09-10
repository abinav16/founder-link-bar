# Fix the missing logo for your first paying subscriber

## What's wrong

Zengech (slot 1) has no uploaded logo, so the card falls back to Google's favicon service. For zengech.co.uk that service returns Google's generic globe icon — the same grey globe you see on several other cards. Nothing is broken in the card itself; the image source is simply a dead end for that domain. NotepadPlus (slot 8) has no uploaded logo either, so it will hit the same issue.

Separately, Aaron's site (zengech.co.uk) has an overlap: their header sits at the very top of the page and our bar covers it by roughly its own height (36px).

## The fix

1. **Better logo fallback chain.** Instead of one favicon source, try several in order and only fall back to the letter tile when all fail: the uploaded logo, then high-resolution icon services (icon.horse, DuckDuckGo icons), then Google's, and finally the letter tile. Treat Google's generic-globe result as a failure so it never shows.
2. **Apply it everywhere.** The shared favicon component is used by the side rail, mobile banner, network, leaderboard, dashboard and startup pages, so one change covers all of them.
3. **Nudge paying members to upload.** On the featured card in Dashboard/Account, when a promoted startup has no uploaded logo, show a small "Add your logo" prompt linking to the existing upload control in Account.

## Draft email to Aaron (Zengech)

Subject: Thank you for being our first featured founder

Hi Aaron,

You're the first founder to take a featured slot on StartupBar, so genuinely, thank you. Your card is live in the top-left position on the network page right now.

Two quick things on my side:

**1. Your card's logo.** We're currently guessing your logo from your website, which is why a generic globe shows on your card. You can fix it in a minute: sign in, go to Account > Your startups, and use the "Upload logo" button on Zengech (a square PNG or SVG works best). Or just reply with the image and I'll put it up myself.

**2. A small overlap on your site.** Our bar sits 36px tall at the very top of the page, and your site has a fixed header there too, so the bar is covering it slightly. If you can, give your page content a little extra room at the top — for example, add `padding-top: 36px` to your site header (or the element your header sits on) so everything shifts down by exactly the bar's height. If your builder or theme has a "top bar offset" or "announcement bar height" setting, 36px is the value. Happy to look at it with you if you tell me how the site is built (WordPress, Webflow, custom, etc.).

And while it's early, I'd love your honest input:

- What made you decide to take the slot, and what are you hoping it does for Zengech?
- Is anything about the dashboard or the stats unclear or missing?
- What would make this obviously worth the money to you a month from now?

If there's anything at all I can help with — the placement, your listing copy, the widget setup — just reply and I'll sort it personally.

Thanks again,
Abinav
StartupBar
