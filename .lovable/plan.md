The exact issue is likely this: the widget iframe is still changing height after the host page loads. On iPhone Safari, even small iframe height changes plus browser address-bar resizing can make the page re-anchor, so the bar appears to move between positions every few seconds. The reporter’s “banner under the View dashboard button changes its size” comment points to our dynamic `startupbar:resize` messages and the widget’s loading-to-content height transition, not the network/heartbeat logic.

Plan:
1. Make the widget height stable by default
   - Keep the normal bar fixed at exactly `36px`.
   - Do not resize the iframe for ordinary loading/content changes.
   - Only allow height expansion when the user manually opens the info panel.

2. Fix the loading-to-content shift
   - In `src/routes/widget.bar.tsx`, render a stable 36px skeleton/fallback immediately instead of returning `null` while loading.
   - This prevents the iframe from briefly being empty/0-height and then expanding.

3. Gate resize messages
   - Send `startupbar:resize` only for intentional states:
     - `36px` for the normal bar
     - expanded height when the info panel is open
     - `0px` only when dismissed
   - Remove/avoid ResizeObserver-driven height changes for the normal bar because it can fire from tiny font/layout changes on mobile Safari.

4. Keep iPhone Safari safe
   - Keep the current iPhone-Safari-only in-flow rendering branch.
   - Do not change widget picking, impressions, clicks, heartbeat, visibility detection, CSP detection, payments, admin, or application flow.

5. Verify carefully
   - Check the widget route renders a visible 36px bar immediately.
   - Check opening the info panel still expands correctly.
   - Check dismiss still collapses to 0.
   - Check no unrelated widget APIs or tracking behavior changed.