// Records a pageview for StartupBar's own site (stored as an impression row
// against the StartupBar startup id — see api/public/track.site-visit.ts).
//
// This used to fire only on the homepage and on startup profile pages, so we
// had no visibility into /auth, /apply, /pricing or /faq. It now runs on every
// route change, deduped per path per browser session so profile-view counts
// keep their "one view per session" meaning.

const SKIP_PREFIXES = ["/api/", "/widget/", "/lovable/"];

export function trackSiteVisit() {
  if (typeof window === "undefined") return;
  try {
    const path = window.location.pathname;
    if (SKIP_PREFIXES.some((p) => path.startsWith(p))) return;

    const key = `sb_visit_${path}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    fetch("/api/public/track/site-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: path + window.location.search,
        referrer: document.referrer || null,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Private/hardened browsers can throw on sessionStorage — tracking is
    // never worth breaking a pageview over.
  }
}
