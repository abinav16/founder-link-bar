// Lightweight apply-funnel breadcrumbs. Without these, an abandoned
// application is invisible: we only ever learn about people who finish.
import { supabase } from "@/integrations/supabase/client";

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

  // Attach the session bearer when signed in so the server can record WHICH
  // founder reached a step — that's what makes "reached step 2, never
  // installed" an emailable audience instead of an anonymous count.
  void (async () => {
    let token: string | undefined;
    try {
      const { data: s } = await supabase.auth.getSession();
      token = s.session?.access_token;
    } catch {
      // anonymous visitor
    }
    fetch("/api/public/track/funnel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ event, ...data }),
      keepalive: true,
    }).catch(() => {});
  })();
}
