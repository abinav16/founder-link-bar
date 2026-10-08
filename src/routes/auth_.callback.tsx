import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth_/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { name: "twitter:card", content: "summary" },
      { property: "og:type", content: "website" },
      { title: "Signing you in — StartupBar" },
      { name: "description", content: "Completing your StartupBar sign-in." },
      { property: "og:title", content: "Signing you in — StartupBar" },
      { property: "og:description", content: "Completing your StartupBar sign-in." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallback,
});

// Only ever navigate to a known same-origin app path.
function safeNext(raw: string | null): "/apply" | "/dashboard" {
  if (raw === "/apply") return "/apply";
  return "/dashboard";
}

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let done = false;
    const params = new URLSearchParams(window.location.search);
    let stored: string | null = null;
    try {
      stored = window.sessionStorage.getItem("startupbar:auth-next");
    } catch { /* ignore */ }
    const next = safeNext(params.get("next") ?? stored);

    const finish = () => {
      if (done) return;
      done = true;
      try { window.sessionStorage.removeItem("startupbar:auth-next"); } catch { /* ignore */ }
      navigate({ to: next, replace: true });
    };

    // The provider hands the session back in the URL fragment; the Supabase
    // client parses it asynchronously. Wait for a real session instead of
    // assuming one exists (that race is what left people on /dashboard#).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish();
    });

    const started = Date.now();
    const poll = window.setInterval(async () => {
      if (done) return;
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        finish();
        return;
      }
      if (Date.now() - started > 8000) {
        done = true;
        window.clearInterval(poll);
        toast.error("Sign-in didn't complete. Please try again.");
        navigate({ to: "/auth", replace: true });
      }
    }, 250);

    return () => {
      done = true;
      window.clearInterval(poll);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-white px-6">
      <div className="text-center">
        <div className="mx-auto h-2 w-6 rounded-sm bg-black" />
        <p className="mt-4 text-sm text-black/50">Signing you in…</p>
      </div>
    </div>
  );
}
