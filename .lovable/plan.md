Plan:

1. Fix widget click redirects so the destination site receives a StartupBar marker:
   - In the widget click endpoint, preserve the host startup/source in the redirected URL with `_sbvia=<host domain>`.
   - Keep existing UTM params so analytics still show `utm_source=startupbar`.

2. Fix source labeling for dashboard globes:
   - Ensure impressions generated after a widget-click landing are saved with `referrer = startupbar:<source-domain>` instead of blank/direct.
   - Keep normal organic/direct traffic unchanged.

3. Backfill the recent wrong rows:
   - For recent clicks from a widget host to a destination startup, update the matching landing/pageview impressions that were inserted with empty referrer.
   - This will convert those dashboard globe entries from `Direct` to `StartupBar (<host site>)` where the source can be matched.

4. Validate with current data:
   - Re-check NotepadPlus and the broader recent startup rows so future widget click visits no longer fall under Direct.