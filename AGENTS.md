<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep StartupBid overview panels in its route and define their visual tokens and animations in the global stylesheet, so live data remains separate from presentation.
- Share the featured-glass treatment and semantic featured color tokens across desktop slot cards and compact banners; keep card links separate so profile and founder actions remain accessible.
- Use content-sized featured cards with flexible empty slots in a viewport-bounded scrollable desktop rail, so complete listing text remains accessible without wasting available space.
- Keep exit detection in the host loader and recommendation rendering in the widget route; authenticate frame messages and clip expanded overlays so the host page remains interactive.
