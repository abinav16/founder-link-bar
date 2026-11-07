import { Link, useRouterState } from "@tanstack/react-router";

import { FeaturedReturnWatcher } from "@/components/FeaturedBookingDialog";
import { SiteHeader } from "@/components/SiteHeader";

function FooterBar({ wide }: { wide?: boolean }) {
  return (
    <footer className="border-t border-black/8 bg-white px-4 py-6 sm:px-6">
      <div className={`mx-auto ${wide ? "max-w-6xl xl:max-w-[1800px]" : "max-w-6xl"} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-2">
          <div className="h-2 w-6 rounded-sm bg-black" />
          <span className="text-sm font-semibold tracking-tight text-black">StartupBar</span>
          <span className="text-[13px] text-black/30 ml-1">— Built for founders, by founders.</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[13px] text-black/40">
          <a href="mailto:hello@startupbar.co" className="hover:text-black transition-colors">Support</a>
          <Link to="/pricing" className="hover:text-black transition-colors">Pricing</Link>
          <Link to="/faq" className="hover:text-black transition-colors">FAQ</Link>
          <Link to="/privacy" className="hover:text-black transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-black transition-colors">Terms</Link>
          <Link to="/apply" className="hover:text-black transition-colors">Apply</Link>
          <a
            href="https://x.com/danielabinav16"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X (Twitter)"
            className="hover:text-black transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <span className="text-black/20">© {new Date().getFullYear()} StartupBar</span>
        </div>
      </div>
    </footer>
  );
}

export function DashboardLayout({
  children,
  rail,
}: {
  children: React.ReactNode;
  rail?: React.ReactNode;
}) {
  const { status } = useRouterState();
  const isNavigating = status === "pending";


  return (
    <div className="min-h-dvh bg-card flex flex-col">
      <div
        className={`fixed top-0 left-0 right-0 z-50 h-[2px] bg-black/[0.06] transition-opacity ${
          isNavigating ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
        suppressHydrationWarning
      >
        <div className="progress-bar h-full bg-black w-full" />
      </div>

      <SiteHeader />

      {/* Side featured rails were retired in favour of in-list banner ads; `rail` is kept for callers. */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8" data-rail={rail ? "" : undefined}>
        <div className="min-w-0">
          <div className="page-enter">{children}</div>
        </div>
      </main>

      <FooterBar />
      <FeaturedReturnWatcher />
    </div>
  );
}