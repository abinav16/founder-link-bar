Update the "You're live" approval email in `supabase/functions/send-email/index.ts` (`emailStartupApproved`).

Since the submit flow already requires the embed script to be live before approval, the email shouldn't re-ask the user to install it. Instead, remind them to keep the code in place to remain in the network.

Changes to `emailStartupApproved`:
- Keep: heading "You're live. 🎉", greeting, and the first paragraph confirming approval and network exposure.
- Replace the second paragraph ("To complete the exchange, install the embed script...") with: "Keep the embed code on your site as long as you'd like to be featured across the StartupBar network — if it's removed, your startup will stop being shown to other founders."
- Remove the "Get your embed script" CTA button (no longer needed since the code is already installed).
- Keep the signature.

No other emails, routes, or logic touched.