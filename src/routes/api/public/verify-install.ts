import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/verify-install")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const site = url.searchParams.get("url");
        if (!site) return Response.json({ installed: false, error: "No URL provided" }, { status: 400 });
        let targetUrl: string;
        try { targetUrl = new URL(site.startsWith("http") ? site : `https://${site}`).href; }
        catch { return Response.json({ installed: false, error: "Invalid URL" }, { status: 400 }); }
        try {
          const res = await fetch(targetUrl, { headers: { "User-Agent": "StartupBar-Verifier/1.0 (+https://startupbar.co)", "Accept": "text/html" }, signal: AbortSignal.timeout(8000) });
          if (!res.ok) return Response.json({ installed: false, error: `Site returned ${res.status}` });
          const html = await res.text();
          const installed = html.includes("startupbar.co/widget") || html.includes("widget/loader.js") || html.includes("data-startup-id");
          return Response.json({ installed }, { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unreachable";
          return Response.json({ installed: false, error: `Could not reach site: ${message}` });
        }
      },
    },
  },
});
