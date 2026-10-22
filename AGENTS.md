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
- Keep exit detection in the host loader and the compact attention effect in the widget route; authenticate frame messages and keep the compact row in normal flow so both placements remain visible and info-panel height is measured correctly.
- Keep profile insights in a dedicated public RPC and vouches behind database-enforced founder eligibility and ownership rules; use daily rollups rather than raw analytics scans to keep profiles fast.
- Vouch rows expose each founder's approved, non-banned startups through the profile insights RPC; keep legacy single-startup fields for deployed-client compatibility and provide separate accessible profile links.
- Share the live visitor history limit across seed, realtime feed and map pins so incoming visits preserve the same history window.
- Native-widget detection requires an actual iframe source, not CSP permissions or slot placeholders, so blocked loaders cannot bypass script checks.
- Admin "Removed" requires both a negative page scan and no widget heartbeat inside the shared proof window, because static scans miss bundled and inner-page installs while heartbeats come from the running bar.
- Dashboard RPC values and labels use oldest-first UTC periods; rolling-day totals and buckets share identical boundaries so charts accurately represent their selected range.
- Keep weekly digest rendering in a pure adjacent template module with inline email-safe tokens, separate from recipient selection and sending, so presentation can be previewed without sending emails.
- Share app-email delivery policy and monochrome shells independently of send triggers; authentication templates share a React Email layout and never copy access links or security codes to another recipient.
- Use shared Supporter price/trial constants in public copy and Dodo's next billing date for membership expiry, so trials and webhook retries never grant unpaid years; all Dodo paths use live-only credentials and webhook verification.
- Keep partner attribution in dedicated owner-scoped settings and service-only event tables; hash referral capabilities, enforce expiry and deduplication in the database, isolate consent-gated browser reports from widget rendering, and distinguish signed partner confirmations from success-page reports so proof never implies independently audited signups.
- Share the progressive signup setup between application and dashboard, keeping technical handoff details behind explicit actions and journey animation in global CSS so presentation does not change attribution logic.
