import { Link } from "@tanstack/react-router";

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="h-2 w-6 rounded-sm bg-black" />
      <span className="text-base font-semibold tracking-tight text-black">StartupBar</span>
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-black/8 bg-white px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <Logo />
            <span className="text-[11px] text-black/30">Built for founders, by founders.</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-black/40">
            <a href="mailto:hello@startupbar.co" className="hover:text-black transition-colors">Support</a>
            <Link to="/auth" className="hover:text-black transition-colors">Sign in</Link>
            <Link to="/apply" className="hover:text-black transition-colors">Apply</Link>
            <Link to="/privacy" className="hover:text-black transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-black transition-colors">Terms</Link>
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
      </div>
    </footer>
  );
}
