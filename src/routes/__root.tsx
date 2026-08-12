import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackPageView } from "@/lib/analytics";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-4 text-sm text-muted-foreground">This page doesn't exist.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Go home</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something broke</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try again or head home.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Retry</button>
          <a href="/" className="inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-medium">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "StartupBar" },
      { name: "twitter:card", content: "summary" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/67514186-9049-4d48-b318-8b7c94ee1d7b" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/67514186-9049-4d48-b318-8b7c94ee1d7b" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,600;1,400&family=Caveat:wght@500;600&display=swap" },

    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-EKLMW549YK"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-EKLMW549YK', { send_page_view: false });
            `,
          }}
        />
        {/* Widget loader is injected client-side from RootComponent's useEffect
            so it runs after React hydration — otherwise its DOM mutations
            (shifting fixed/sticky elements) race hydration and force a
            client rerender that looks like the page loads twice. */}

      </head>
      <body suppressHydrationWarning>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // Send GA pageviews after each navigation settles, so document.title (set by
  // the route's head()) is already applied — otherwise GA logs "(not set)".
  useEffect(() => {
    const send = () => window.setTimeout(trackPageView, 0);
    send();
    const unsub = router.subscribe("onResolved", send);
    return unsub;
  }, [router]);



  // Inject the StartupBar widget after full hydration + a paint tick so its
  // DOM mutations (shifting fixed/sticky elements down by 36px, adding
  // scroll-padding to <html>, padding-top to <body>) don't race React's
  // progressive Suspense hydration and force subtrees to re-render — which
  // is what made the header look like it disappeared then loaded again.
  useEffect(() => {
    if (document.querySelector('script[data-startupbar-loader]')) return;
    let cancelled = false;
    const inject = () => {
      if (cancelled) return;
      if (document.querySelector('script[data-startupbar-loader]')) return;
      const s = document.createElement("script");
      s.src = "https://startupbar.co/widget/loader.js";
      s.setAttribute("data-startup-id", "0d2db708-f4e9-4b77-bd83-c446826c76b1");
      s.setAttribute("data-startupbar-loader", "1");
      s.async = true;
      document.head.appendChild(s);
    };
    const schedule = () => {
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback;
      if (ric) ric(inject, { timeout: 1500 });
      else window.setTimeout(inject, 800);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => { cancelled = true; };
  }, []);


  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();

      // First-sign-in welcome email. send-email now requires a Bearer token,
      // so we can't fire it from the signUp() call anymore (no session yet
      // with email confirmation on). Trigger it once per user on SIGNED_IN,
      // using localStorage as a "welcomed" flag.
      if (event === "SIGNED_IN" && session?.user) {
        const key = `startupbar:welcomed:${session.user.id}`;
        try {
          if (typeof window !== "undefined" && !window.localStorage.getItem(key)) {
            window.localStorage.setItem(key, "1");
            const name = (session.user.user_metadata?.full_name as string | undefined) ?? "";
            supabase.functions
              .invoke("send-email", { body: { type: "welcome", data: { name } } })
              .catch(() => {
                // Non-fatal — clear the flag so we retry next sign-in.
                try { window.localStorage.removeItem(key); } catch { /* ignore */ }
              });
          }
        } catch { /* ignore */ }
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}