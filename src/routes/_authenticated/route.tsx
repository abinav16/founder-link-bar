import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// An auth provider can drop us on a protected URL with its tokens still in the
// URL fragment. The Supabase client parses that fragment asynchronously, so a
// naive getUser() can lose the race, bounce to /auth, and leave the user on a
// blank page with a bare "#" in the address bar. Wait for the session to
// settle whenever a fragment is present.
function hasAuthFragment(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash ?? "";
  return /access_token=|refresh_token=|[?&#]code=|error(_description)?=/.test(hash);
}

async function waitForSession(timeoutMs: number) {
  const started = Date.now();
  for (;;) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    if (Date.now() - started > timeoutMs) return null;
    await new Promise((r) => setTimeout(r, 150));
  }
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (hasAuthFragment()) {
      const session = await waitForSession(8000);
      if (session) {
        // Strip the leftover fragment so refreshes and shares stay clean.
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        return { user: session.user };
      }
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
