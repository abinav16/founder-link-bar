// Google Analytics pageview tracking for the SPA.
// The gtag snippet in __root.tsx runs with send_page_view:false, because a hit
// fired from <head> lands before React sets document.title — that's what made
// GA report "(not set)" page titles. We send pageviews ourselves once each
// navigation has settled and the title is applied.

let lastSent: string | null = null;

type Gtag = (...args: unknown[]) => void;

export function trackPageView() {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag !== "function") return; // blocked / not loaded

  const path = window.location.pathname + window.location.search;
  if (path === lastSent) return;
  lastSent = path;

  gtag("event", "page_view", {
    page_title: document.title,
    page_location: window.location.href,
    page_path: path,
  });
}
