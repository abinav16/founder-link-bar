import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, LayoutDashboard, Trophy, Settings } from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
] as const;

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { location } = useRouterState();
  const path = location.pathname;

  async function signOut() { await supabase.auth.signOut(); navigate({ to: "/" }); }

  return (
    <div className="min-h-screen bg-[#f7f7f6]">
      <header className="sticky top-0 z-30 border-b border-black/8 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2"><div className="h-2 w-6 rounded-sm bg-black" /><span className="text-sm font-semibold tracking-tight text-black">StartupBar</span></Link>
          <nav className="flex items-center gap-1">
            {NAV.map(({ to, label }) => {
              const active = path === to;
              return (
                <Link key={to} to={to} className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${active ? "text-black" : "text-black/45 hover:text-black/80"}`}>
                  {label}
                  {active && <span className="absolute inset-x-3 -bottom-[calc(0.875rem+1px)] h-px bg-black" />}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/" className="text-sm text-black/40 hover:text-black transition-colors px-2">View site</Link>
            <Link to="/account" className={`rounded-md p-2 transition-colors ${path === "/account" ? "text-black" : "text-black/40 hover:text-black"}`} title="Account settings"><Settings className="h-4 w-4" /></Link>
            <button onClick={signOut} className="flex items-center gap-1.5 rounded-md border border-black/12 bg-white px-3 py-1.5 text-sm text-black/60 hover:border-black/25 hover:text-black transition-all"><LogOut className="h-3.5 w-3.5" />Sign out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
