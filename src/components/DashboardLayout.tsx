import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, LayoutDashboard, Trophy, Settings, Globe, LogIn } from "lucide-react";
import { useEffect, useState } from "react";

function FooterBar() {
  return (
    <footer className="border-t border-black/8 bg-white px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-6 rounded-sm bg-black" />
          <span className="text-sm font-semibold tracking-tight text-black">StartupBar</span>
          <span className="text-xs text-black/30 ml-1">— Built for founders, by founders.</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-black/40">
          <Link to="/privacy" className="hover:text-black transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-black transition-colors">Terms</Link>
          <Link to="/apply" className="hover:text-black transition-colors">Apply</Link>
          <span className="text-black/20">© {new Date().getFullYear()} StartupBar</span>
        </div>
      </div>
    </footer>
  );
}

const NAV = [
  { to: "/network",     label: "Network",     icon: Globe },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
] as const;

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { location, status } = useRouterState();
  const path = location.pathname;
  const isNavigating = status === "pending";
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => setAuthed(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const visibleNav = authed ? NAV : NAV.filter(({ to }) => to !== "/dashboard");

  return (
    <div className="min-h-screen bg-[#f7f7f6] flex flex-col">
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-black/[0.06]">
          <div className="progress-bar h-full bg-black w-full" />
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-black/8 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <div className="h-2 w-6 rounded-sm bg-black" />
            <span className="text-sm font-semibold tracking-tight text-black">StartupBar</span>
          </Link>

          <nav className="flex items-center gap-0.5 sm:gap-1">
            {visibleNav.map(({ to, label, icon: Icon }) => {
              const active = path === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                    active ? "text-black" : "text-black/45 hover:text-black/80"
                  }`}
                >
                  <Icon className="h-4 w-4 sm:hidden" />
                  <span className="hidden sm:inline">{label}</span>
                  {active && (
                    <span className="absolute inset-x-2 -bottom-[calc(0.875rem+1px)] h-px bg-black sm:inset-x-3" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {authed ? (
              <>
                <Link
                  to="/account"
                  className={`rounded-md p-2 transition-colors ${path === "/account" ? "text-black" : "text-black/40 hover:text-black"}`}
                  title="Account settings"
                >
                  <Settings className="h-4 w-4" />
                </Link>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 rounded-md border border-black/12 bg-white px-2 py-1.5 text-sm text-black/60 hover:border-black/25 hover:text-black transition-all sm:px-3"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="flex items-center gap-1.5 rounded-md border border-black/12 bg-white px-2 py-1.5 text-sm text-black/60 hover:border-black/25 hover:text-black transition-all sm:px-3"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div key={path} className="page-enter">
          {children}
        </div>
      </main>

      <FooterBar />
    </div>
  );
}