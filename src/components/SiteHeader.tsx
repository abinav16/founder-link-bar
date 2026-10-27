import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Settings, LogOut, ChevronsRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function Logo() {
  return (
    <Link to="/" className="group flex shrink-0 items-center gap-2.5">
      <div className="h-2.5 w-7 rounded-full bg-header-ink transition-transform duration-300 group-hover:scale-x-125 group-hover:origin-left" />
      <span className="text-[22px] font-semibold text-header-ink">StartupBar</span>
    </Link>
  );
}

const linkCls =
  "relative px-2 py-3 text-[15px] font-medium text-header-ink/65 transition-colors hover:text-header-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const activeCls = "!text-header-ink underline decoration-header-ink/30 underline-offset-8";
const links = [
  { to: '/network', label: 'Network' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/startupbid', label: 'StartupBid' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/faq', label: 'FAQ' },
] as const;

export function SiteHeader({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
      className={cn(
        "site-header sticky top-0 z-40 border-b border-header-ink/8 bg-header-surface/85 backdrop-blur-xl transition-shadow duration-300",
        scrolled && "site-header-scrolled",
      )}
      suppressHydrationWarning
    >
      <div className="mx-auto flex h-[88px] max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-8 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
        <Logo />
        <nav aria-label="Main navigation" className="hidden items-center gap-3 xl:gap-6 lg:flex">
          {links.map(link => <Link key={link.to} to={link.to} activeProps={{ className: activeCls }} className={linkCls}>{link.label}</Link>)}
        </nav>
        <div className="flex items-center justify-end gap-2.5">
          {authed === null ? (
            <div aria-hidden className="hidden h-12 w-[240px] lg:block" />
          ) : authed ? (
            <>
              <Button asChild className="h-12 rounded-full bg-header-ink px-5 text-header-surface hover:bg-header-ink/85"><Link to="/dashboard">Dashboard <ChevronsRight /></Link></Button>
              <Button asChild variant="ghost" size="icon" className="hidden rounded-full text-header-ink lg:inline-flex" title="Account settings"><Link to="/account" aria-label="Account settings"><Settings /></Link></Button>
              <Button variant="ghost" size="icon" className="hidden rounded-full text-header-ink lg:inline-flex" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut /></Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline" className="hidden h-12 rounded-full border-header-ink/25 bg-transparent px-6 text-header-ink hover:bg-header-ink/5 sm:inline-flex"><Link to="/auth">Sign in</Link></Button>
              <Button asChild className="h-12 rounded-full bg-header-ink px-5 text-header-surface hover:bg-header-ink/85 sm:px-6"><Link to="/apply"><span className="hidden sm:inline">Join the network</span><span className="sm:hidden">Join</span><ChevronsRight /></Link></Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full text-header-ink lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="site-mobile-menu">{menuOpen ? <X /> : <Menu />}</Button>
        </div>
      </div>
      {menuOpen && <nav id="site-mobile-menu" aria-label="Mobile navigation" className="grid border-t border-header-ink/8 bg-header-surface px-5 py-4 lg:hidden">
        {links.map(link => <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} activeProps={{ className: activeCls }} className={linkCls}>{link.label}</Link>)}
        {authed ? <><Link to="/account" className={linkCls} onClick={() => setMenuOpen(false)}>Account settings</Link><Button variant="ghost" className="justify-start px-2 text-header-ink" onClick={signOut}><LogOut />Sign out</Button></> : <Link to="/auth" className={linkCls} onClick={() => setMenuOpen(false)}>Sign in</Link>}
      </nav>}
      {children}
    </header>
  );
}
