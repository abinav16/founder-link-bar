import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Trophy, LayoutDashboard, Settings, LogOut, Gavel } from "lucide-react";

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="h-2 w-6 rounded-sm bg-black" />
      <span className="text-base font-semibold tracking-tight text-black">StartupBar</span>
    </Link>
  );
}

export function SiteHeader() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUser({ email: data.session.user.email });
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { email: session.user.email } : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    navigate({ to: "/" });
  }

  return (
    <header className="relative z-20 border-b border-black/8 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <nav className="flex min-h-9 items-center gap-1 text-sm">
          {!authReady ? (
            <div aria-hidden className="h-9 w-[220px] sm:w-[360px]" />
          ) : user ? (
            <>
              <Link to="/network" activeProps={{ className: "!text-black font-semibold" }} className="flex items-center gap-1.5 px-2 py-2 text-black/50 hover:text-black transition-colors sm:px-3">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Network</span>
              </Link>
              <Link to="/leaderboard" activeProps={{ className: "!text-black font-semibold" }} className="flex items-center gap-1.5 px-2 py-2 text-black/50 hover:text-black transition-colors sm:px-3">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Leaderboard</span>
              </Link>
              <Link to="/startupbid" activeProps={{ className: "!text-black font-semibold" }} className="flex items-center gap-1.5 px-2 py-2 text-black/50 hover:text-black transition-colors sm:px-3">
                <Gavel className="h-4 w-4" />
                <span className="hidden sm:inline">StartupBid</span>
              </Link>
              <Link to="/dashboard" activeProps={{ className: "!text-black font-semibold" }} className="flex items-center gap-1.5 px-2 py-2 text-black/50 hover:text-black transition-colors sm:px-3">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </Link>
              <Link to="/account" aria-label="Account settings" className="rounded-md p-2 text-black/40 hover:text-black transition-colors">
                <Settings className="h-4 w-4" />
              </Link>
              <button
                onClick={signOut}
                aria-label="Sign out"
                className="flex items-center gap-1.5 rounded-md border border-black/12 px-2 py-1.5 text-black/60 hover:border-black/25 hover:text-black transition-all sm:px-3"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/network" activeProps={{ className: "!text-black font-semibold" }} className="flex items-center gap-1.5 px-3 py-2 text-black/50 hover:text-black transition-colors text-[13px]">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Network</span>
              </Link>
              <Link to="/leaderboard" activeProps={{ className: "!text-black font-semibold" }} className="flex items-center gap-1.5 px-3 py-2 text-black/50 hover:text-black transition-colors text-[13px]">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Leaderboard</span>
              </Link>
              <Link to="/startupbid" activeProps={{ className: "!text-black font-semibold" }} className="flex items-center gap-1.5 px-3 py-2 text-black/50 hover:text-black transition-colors text-[13px]">
                <Gavel className="h-4 w-4" />
                <span className="hidden sm:inline">StartupBid</span>
              </Link>
              <Link to="/auth" className="px-3 py-2 text-black/50 hover:text-black transition-colors">Sign in</Link>
              <Link to="/apply" className="inline-flex h-9 items-center rounded-md bg-black px-3 text-sm font-medium text-white hover:bg-black/80 transition-colors sm:px-4">
                <span className="hidden sm:inline">Join the network</span>
                <span className="sm:hidden">Join</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
