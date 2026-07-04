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
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap" },

    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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
              gtag('config', 'G-EKLMW549YK');
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var p = window.location.pathname;
                var appRoutes = ['/network', '/leaderboard', '/dashboard', '/account', '/auth'];
                var isApp = appRoutes.some(function(r) { return p === r || p.startsWith(r + '/'); });
                if (!isApp) {
                  var s = document.createElement('script');
                  s.src = 'https://startupbar.co/widget/loader.js';
                  s.setAttribute('data-startup-id', '0d2db708-f4e9-4b77-bd83-c446826c76b1');
                  s.async = true;
                  document.head.appendChild(s);
                }
              })();
            `,
          }}
        />

      </head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
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