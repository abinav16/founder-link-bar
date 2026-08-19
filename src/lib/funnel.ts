// Lightweight apply-funnel breadcrumbs. Without these, an abandoned
// application is invisible: we only ever learn about people who finish.

export type FunnelEvent = "apply_opened" | "apply_step";

export function trackFunnel(event: FunnelEvent, data?: { step?: number; name?: string; url?: string }) {
  if (typeof window === "undefined") return;
  try {
    // One event per session per (event, step) so a re-render or a back-and-
    // forth between steps doesn't inflate the numbers.
    const key = `sb_funnel_${event}_${data?.step ?? ""}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // ignore storage failures and still send once
  }

  fetch("/api/public/track/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, ...data }),
    keepalive: true,
  }).catch(() => {});
}
