import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Public OAuth client ID (not a secret). Must match the Google provider
// configured in the auth settings so the ID token is accepted.
const GOOGLE_CLIENT_ID = "220930740912-aqs9o16vijupbfbe5s0bt2arterhh10c.apps.googleusercontent.com";

// Pages where a floating sign-in prompt would be wrong: embedded widgets,
// the sign-in screens themselves, and callback/API endpoints.
const SKIP_PREFIXES = ["/widget", "/embed", "/auth", "/api", "/reset-password", "/unsubscribe"];

type GoogleId = {
  initialize: (cfg: Record<string, unknown>) => void;
  prompt: () => void;
  cancel: () => void;
};
declare global {
  interface Window { google?: { accounts?: { id?: GoogleId } } }
}

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>("script[data-gsi]");
    const s = existing ?? document.createElement("script");
    s.addEventListener("load", () => resolve(), { once: true });
    s.addEventListener("error", () => reject(new Error("gsi load failed")), { once: true });
    if (!existing) {
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.dataset.gsi = "1";
      document.head.appendChild(s);
    }
  });
}

export function GoogleOneTap() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const skip = SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "_"));

  useEffect(() => {
    if (skip) return;
    // Never inside an iframe (embedded widget hosts, editor preview frames).
    if (window.self !== window.top) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || data.session) return;
      try { await loadScript(); } catch { return; }
      const gid = window.google?.accounts?.id;
      if (cancelled || !gid) return;

      const rawNonce = crypto.randomUUID() + crypto.randomUUID();
      const hashedNonce = await sha256Hex(rawNonce);

      gid.initialize({
        client_id: GOOGLE_CLIENT_ID,
        nonce: hashedNonce,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: "signin",
        itp_support: true,
        use_fedcm_for_prompt: true,
        callback: async (response: { credential?: string }) => {
          if (!response.credential) return;
          const { error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: response.credential,
            nonce: rawNonce,
          });
          if (error) {
            toast.error("Quick sign-in didn't work. Please use Continue with Google.");
            return;
          }
          toast.success("You're signed in.");
        },
      });
      gid.prompt();
    })();

    return () => {
      cancelled = true;
      try { window.google?.accounts?.id?.cancel(); } catch { /* ignore */ }
    };
  }, [skip, pathname]);

  return null;
}
