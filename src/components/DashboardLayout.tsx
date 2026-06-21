import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, LayoutDashboard, Trophy, Settings } from "lucide-react";

const NAV = [
  { to: "/dashboard",   label: "Overview",    icon: LayoutDashboard },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
] as const;

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { location } = useRouterState();
  const path = location.pathname;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-[#f7f7f6]">
      <header className="sticky top-0 z-30 border-b border-black/8 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <div className="h-2 w-6 rounded-sm bg-black" />
            <span className="text-sm font-semibold tracking-tight text-black">StartupBar</span>
          </Link>

          <nav className="flex items-center gap-0.5 sm:gap-1">
            {NAV.map(({ to, label, icon: Icon }) => {
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
            <Link
              to="/"
              className="hidden text-sm text-black/40 hover:text-black transition-colors px-2 sm:inline"
            >
              View site
            </Link>
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
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
