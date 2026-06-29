import { createFileRoute } from "@tanstack/react-router";

const PRIVATE_IP_RE = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|169\.254\.|::1$|fc|fd)/i;

function isSafeUrl(raw: string): { safe: boolean; href: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return { safe: false, href: "" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return { safe: false, href: "" };
  if (PRIVATE_IP_RE.test(parsed.hostname)) return { safe: false, href: "" };
  return { safe: true, href: parsed.href };
}

const NO_STORE = { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" };

export const Route = createFileRoute("/api/public/verify-install")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const site = url.searchParams.get("url");

        if (!site) {
          return Response.json({ installed: false, error: "No URL provided" }, { status: 400, headers: NO_STORE });
        }

        const { safe, href: targetUrl } = isSafeUrl(site);
        if (!safe) {
          return Response.json({ installed: false, error: "Invalid URL" }, { status: 400, headers: NO_STORE });
        }

        try {
          const res = await fetch(targetUrl, {
            headers: {
              "User-Agent": "StartupBar-Verifier/1.0 (+https://startupbar.co)",
              "Accept": "text/html",
            },
            signal: AbortSignal.timeout(8000),
          });

          if (!res.ok) {
            return Response.json({ installed: false, error: `Site returned ${res.status}` }, { headers: NO_STORE });
          }

          const html = await res.text();
          const installed =
            html.includes("startupbar.co/widget") ||
            html.includes("widget/loader.js") ||
            html.includes("data-startup-id");

          return Response.json({ installed }, { headers: NO_STORE });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unreachable";
          return Response.json({ installed: false, error: `Could not reach site: ${message}` }, { headers: NO_STORE });
        }
      },
    },
  },
});
