import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Trophy, LayoutDashboard, Settings, LogOut, Gavel } from "lucide-react";

function Logo() {
  return (
    <Link to="/" className="group flex shrink-0 items-center gap-2.5">
      <div className="h-2 w-6 rounded-full bg-black transition-transform duration-300 group-hover:scale-x-125 group-hover:origin-left" />
      <span className="text-[15px] font-semibold tracking-tight text-black">StartupBar</span>
    </Link>
  );
}

const linkCls =
  "relative flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium text-black/50 transition-all duration-200 hover:bg-black/[0.045] hover:text-black";

const activeCls = "!text-black font-semibold bg-black/[0.05]";

export function SiteHeader() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthed(!!session),
    );
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setAuthed(false);
    navigate({ to: "/" });
  }

  return (
    <header
      className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl"
      suppressHydrationWarning
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="flex min-h-9 items-center gap-0.5 text-sm">
          <Link to="/network" activeProps={{ className: activeCls }} className={linkCls}>
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Network</span>
          </Link>
          <Link to="/leaderboard" activeProps={{ className: activeCls }} className={linkCls}>
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Leaderboard</span>
          </Link>
          <Link to="/startupbid" activeProps={{ className: activeCls }} className={linkCls}>
            <Gavel className="h-4 w-4" />
            <span className="hidden sm:inline">StartupBid</span>
          </Link>

          {authed === null ? (
            <div aria-hidden className="h-9 w-[92px] sm:w-[190px]" />
          ) : authed ? (
            <div className="flex items-center gap-0.5">
              <Link to="/dashboard" activeProps={{ className: activeCls }} className={linkCls}>
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <div aria-hidden className="mx-2.5 hidden h-5 w-px bg-black/[0.08] sm:block" />
              <Link
                to="/account"
                aria-label="Account settings"
                activeProps={{ className: "!text-black bg-black/[0.05]" }}
                className="rounded-full p-2 text-black/40 transition-all duration-200 hover:bg-black/[0.045] hover:text-black hover:rotate-45"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <button
                onClick={signOut}
                aria-label="Sign out"
                className="ml-1 flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-[13px] font-medium text-black/60 transition-all duration-200 hover:border-black hover:bg-black hover:text-white sm:px-4"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div aria-hidden className="mx-2.5 hidden h-5 w-px bg-black/[0.08] sm:block" />
              <Link
                to="/auth"
                className="rounded-full px-3 py-2 text-[13px] font-medium text-black/50 transition-all duration-200 hover:bg-black/[0.045] hover:text-black"
              >
                Sign in
              </Link>
              <Link
                to="/apply"
                className="inline-flex h-9 items-center rounded-full bg-black px-4 text-[13px] font-medium text-white shadow-sm transition-all duration-200 hover:bg-black/85 hover:shadow-md active:scale-[0.98]"
              >
                <span className="hidden sm:inline">Join the network</span>
                <span className="sm:hidden">Join</span>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
