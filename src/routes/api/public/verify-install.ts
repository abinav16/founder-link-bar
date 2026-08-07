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
        // Require an authenticated caller — this endpoint makes server-side
        // outbound HTTP requests to arbitrary URLs, so leaving it open would
        // let anyone use our egress as a probing proxy. Founders (from apply
        // and dashboard) and admins already send their session bearer token.
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
        if (!token) {
          return Response.json({ installed: false, error: "Unauthorized" }, { status: 401, headers: NO_STORE });
        }
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
          if (authErr || !authData?.user) {
            return Response.json({ installed: false, error: "Unauthorized" }, { status: 401, headers: NO_STORE });
          }
        } catch {
          return Response.json({ installed: false, error: "Unauthorized" }, { status: 401, headers: NO_STORE });
        }

        const url = new URL(request.url);
        const site = url.searchParams.get("url");
        const expectedId = url.searchParams.get("id");

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

          // Extract the installed startup id (if any) so we can flag mismatches
          // where the site embeds a loader for a different startup — that's why
          // heartbeats never come in even though the script tag is present.
          let installedId: string | null = null;
          let idMismatch = false;

          const html = await res.text();
          const installed =
            html.includes("startupbar.co/widget") ||
            html.includes("widget/loader.js") ||
            html.includes("data-startup-id");

          // Defense-in-depth: only flag "Hidden (CSS)" when CSS actually
          // targets our widget. The previous heuristic scanned the 400 chars
          // before the loader tag and false-positived on unrelated rules
          // (e.g. `.nav-links { display: none }` in a media query above it).
          let suspicious = false;
          if (installed) {
            const scriptRe = /<script\b([^>]*)(?:startupbar\.co\/widget|widget\/loader\.js|data-startup-id)([^>]*)>/i;
            const m = html.match(scriptRe);
            const hidingDeclRe = /display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?!\.)|height\s*:\s*0(?:px)?\b/i;

            // 1. Script tag itself hidden via inline style or `hidden` attr.
            if (m) {
              const attrs = `${m[1] ?? ""} ${m[2] ?? ""}`;
              const styleAttr = attrs.match(/\bstyle\s*=\s*["']([^"']*)["']/i);
              if (styleAttr && hidingDeclRe.test(styleAttr[1])) suspicious = true;
              if (!suspicious && /\shidden(\s|=|>|$)/i.test(attrs)) suspicious = true;
            }

            // 2. Any <style> block whose rule both references our widget and
            //    contains a hiding declaration.
            if (!suspicious) {
              const widgetSelectorRe = /startupbar|data-startup-id|startupbar-bar/i;
              const styleBlockRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
              let sb: RegExpExecArray | null;
              while (!suspicious && (sb = styleBlockRe.exec(html)) !== null) {
                const rules = sb[1].split("}");
                for (const rule of rules) {
                  const brace = rule.indexOf("{");
                  if (brace === -1) continue;
                  const selector = rule.slice(0, brace);
                  const decls = rule.slice(brace + 1);
                  if (widgetSelectorRe.test(selector) && hidingDeclRe.test(decls)) {
                    suspicious = true;
                    break;
                  }
                }
              }
            }

            // Pull the actual data-startup-id value from the script tag so we
            // can flag "installed for the wrong startup" — a common cause of
            // "script tag detected but no heartbeats ever land".
            const idRe = /<script[^>]*data-startup-id=["']([^"']+)["'][^>]*>/i;
            const idMatch = html.match(idRe);
            if (idMatch) installedId = idMatch[1];
            // Sites that inject the loader from inline JS never have a static
            // script tag, so also look for the id passed to the injector.
            if (!installedId) {
              const inlineIdRe =
                /(?:setAttribute\(\s*['"]data-startup-id['"]\s*,\s*['"]([0-9a-f-]{36})['"]|loader\.js['"]\s*,\s*['"]([0-9a-f-]{36})['"])/i;
              const inlineMatch = html.match(inlineIdRe);
              if (inlineMatch) installedId = inlineMatch[1] ?? inlineMatch[2] ?? null;
            }
            if (expectedId && installedId && installedId !== expectedId) {
              idMismatch = true;
            }
          }

          // A cookie-consent auto-blocker on the page will stop third-party
          // scripts (ours included) from loading until the visitor accepts
          // cookies — the snippet is present but never executes.
          let consentBlocked = false;
          let consentVendor: string | null = null;
          if (installed) {
            const vendors: Array<[RegExp, string]> = [
              [/app\.termly\.io\/resource-blocker[^"']*autoBlock=on/i, "Termly"],
              [/consent\.cookiebot\.com[\s\S]{0,300}?data-blockingmode\s*=\s*["']auto["']/i, "Cookiebot"],
              [/data-blockingmode\s*=\s*["']auto["'][\s\S]{0,300}?cookiebot/i, "Cookiebot"],
              [/otSDKStub\.js|cdn\.cookielaw\.org/i, "OneTrust"],
              [/cdn-cookieyes\.com|cookieyes\.com\/client_data/i, "CookieYes"],
              [/cookieconsent\.js[\s\S]{0,200}?type=["']text\/plain["']/i, "Cookie Consent"],
            ];
            for (const [re, name] of vendors) {
              if (re.test(html)) {
                consentBlocked = true;
                consentVendor = name;
                break;
              }
            }
          }

          // The loader may be installed, but only conditionally: injected from
          // inline JS (so it can be skipped on some routes) and/or hidden by a
          // CSS rule keyed on a state attribute. Either way, visitors on many
          // pages will never see the bar.
          let conditionalInstall = false;
          if (installed) {
            const staticTagRe =
              /<script[^>]+src=["'][^"']*(?:startupbar\.co\/widget|widget\/loader\.js)[^"']*["'][^>]*>/i;
            const hasStaticTag = staticTagRe.test(html);
            const inlineInjectRe =
              /(?:createElement\(\s*['"]script['"]\s*\)[\s\S]{0,400}?(?:startupbar\.co\/widget|widget\/loader\.js))|(?:load\(\s*['"][^'"]*(?:startupbar\.co\/widget|widget\/loader\.js))/i;
            if (!hasStaticTag && inlineInjectRe.test(html)) conditionalInstall = true;

            // Conditional hide rule, e.g.
            //   html[data-sb-off] iframe[src*='startupbar.co'] { display:none }
            if (!conditionalInstall) {
              const styleBlockRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
              let sb2: RegExpExecArray | null;
              while (!conditionalInstall && (sb2 = styleBlockRe.exec(html)) !== null) {
                for (const rule of sb2[1].split("}")) {
                  const brace = rule.indexOf("{");
                  if (brace === -1) continue;
                  const selector = rule.slice(0, brace);
                  const decls = rule.slice(brace + 1);
                  const targetsWidget = /startupbar|data-startup-id/i.test(selector);
                  const isConditional = /\[[^\]]+\]\s*[\s>+~]/.test(selector) || /^\s*\w*\[[^\]]+\]\s+/.test(selector);
                  if (targetsWidget && isConditional && /display\s*:\s*none|visibility\s*:\s*hidden/i.test(decls)) {
                    conditionalInstall = true;
                    break;
                  }
                }
              }
            }
          }

          // A conditional hide rule is a routing choice, not a cloaked embed —
          // don't double-report it as "Hidden (CSS)".
          if (conditionalInstall) suspicious = false;





          // Detect Content-Security-Policy that blocks the widget script,
          // its iframe, or the favicons we render inside it.
          let cspBlocked = false;
          let cspFrameBlocked = false;
          let cspImgBlocked = false;
          if (installed) {
            const policies: string[] = [];
            const headerCsp = res.headers.get("content-security-policy");
            if (headerCsp) policies.push(headerCsp);
            const metaRe = /<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*content=["']([^"']+)["'][^>]*>/gi;
            let mm: RegExpExecArray | null;
            while ((mm = metaRe.exec(html)) !== null) policies.push(mm[1]);

            const parseDirs = (policy: string): Record<string, string[]> => {
              const dirs: Record<string, string[]> = {};
              policy.split(";").forEach((raw) => {
                const parts = raw.trim().split(/\s+/);
                const name = (parts.shift() || "").toLowerCase();
                if (name) dirs[name] = parts.map((p) => p.toLowerCase());
              });
              return dirs;
            };

            const matchesStartupbar = (s: string) =>
              s === "*" ||
              s === "https:" ||
              s === "http:" ||
              s === "startupbar.co" ||
              s === "*.startupbar.co" ||
              s === "https://startupbar.co" ||
              s === "https://*.startupbar.co" ||
              s === "http://startupbar.co";

            const allowsStartupbarScript = (policy: string): boolean => {
              const dirs = parseDirs(policy);
              const sources = dirs["script-src-elem"] ?? dirs["script-src"] ?? dirs["default-src"];
              if (!sources) return true;
              return sources.some(matchesStartupbar);
            };

            const allowsStartupbarFrame = (policy: string): boolean => {
              const dirs = parseDirs(policy);
              const sources = dirs["frame-src"] ?? dirs["child-src"] ?? dirs["default-src"];
              if (!sources) return true;
              return sources.some(matchesStartupbar);
            };

            const allowsStartupbarImg = (policy: string): boolean => {
              const dirs = parseDirs(policy);
              const sources = dirs["img-src"] ?? dirs["default-src"];
              if (!sources) return true;
              // Favicon hosts used by the bar: Google s2, googleusercontent,
              // Supabase Storage (uploaded logos), and startupbar.co itself.
              return sources.some(
                (s) =>
                  s === "*" ||
                  s === "https:" ||
                  s === "http:" ||
                  s === "www.google.com" ||
                  s === "https://www.google.com" ||
                  s === "*.googleusercontent.com" ||
                  s === "https://*.googleusercontent.com" ||
                  s === "*.supabase.co" ||
                  s === "https://*.supabase.co" ||
                  matchesStartupbar(s),
              );
            };

            if (policies.length > 0) {
              cspBlocked = policies.some((p) => !allowsStartupbarScript(p));
              cspFrameBlocked = policies.some((p) => !allowsStartupbarFrame(p));
              cspImgBlocked = policies.some((p) => !allowsStartupbarImg(p));
            }
          }

          return Response.json(
            { installed, suspicious, cspBlocked, cspFrameBlocked, cspImgBlocked, installedId, idMismatch },
            { headers: NO_STORE },
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unreachable";
          return Response.json({ installed: false, error: `Could not reach site: ${message}` }, { headers: NO_STORE });
        }
      },
    },
  },
});
