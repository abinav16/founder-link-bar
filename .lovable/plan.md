## Hero mockup polish

Three small changes to the landing hero mockup in `src/routes/index.tsx`.

### 1. Rewrite the handwritten annotation

Current:
> Try this ✨
> (people are addicted)

New (my pick):
> **The StartupBar widget** ✨
> *This is how it looks on your site*

Alternate lines I can swap in — tell me if you prefer one:
- "See how it lives on your site"
- "What it looks like in the wild"
- "How it shows up on your site"
- "Meet the StartupBar widget / Lives quietly on your site"

Both lines stay in the Caveat handwriting; the first line stays a touch bolder/larger, the second line stays lighter and italic-feeling, same as today.

### 2. Move the arrow to the right side

Today the arrow sits at the bottom-left of the mockup body and curves up-left toward the STARTUPBAR pill.

New: mirror it to the right side. The annotation block sits at the top-right area inside the mockup body, the arrow curves up-and-right toward the widget's **× / dismiss** button (right end of the bar), and the handwritten text sits to the left of the arrow. Same Caveat font, same rough sketch style, just flipped. Desktop only — mobile still shows the text centered below the mockup (unchanged).

### 3. Replace "your website continues here as normal"

Today the mockup body is a flat grey box with that grey placeholder text. Replace with a very light skeleton so it reads as "a real page underneath, we're just showing the bar":

```text
┌───────────────────────────────────────────┐
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬                          │  ← faux headline bar
│  ▬▬▬▬▬▬▬▬  ▬▬▬▬▬▬                        │  ← two short lines
│                                           │
│  ┌────────┐  ┌────────┐  ┌────────┐       │  ← three faint card blocks
│  │        │  │        │  │        │       │
│  └────────┘  └────────┘  └────────┘       │
└───────────────────────────────────────────┘
```

- Muted neutral fills (`bg-black/[0.04]` / `bg-black/[0.06]`), rounded corners, no text.
- No animation/pulse — static so it reads as "site content" and doesn't compete with the widget bar or the new annotation.
- Same overall height as today so nothing shifts on the page.

### Not changing

- The widget bar itself (STARTUPBAR pill, Acme AI, "turn meeting notes…", Visit →, ×) stays exactly as-is.
- The browser chrome (traffic lights, `yourstartup.com`) stays as-is.
- Mobile fallback text stays centered below the mockup.
- `mockDismissed` behavior (annotation hides after the ×) stays.

### Files touched

- `src/routes/index.tsx` — the hero mockup block only (around lines 758–845). No other files.

Confirm the copy pick ("This is how it looks on your site" vs one of the alternates) and I'll ship it.