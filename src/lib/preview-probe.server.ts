export interface EmbedProbeResult {
  /** Framable URL to load in the mock window, or null when it must fall back. */
  url: string | null;
  /** Host to display in the fake address bar. */
  host: string;
}

const PRIVATE_HOST =
  /^(localhost$|127\.|10\.|192\.168\.|169\.254\.|0\.|\[?::1\]?$|172\.(1[6-9]|2\d|3[01])\.)/i;

function variants(raw: string): string[] {
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let u: URL;
  try {
    u = new URL(withProto);
  } catch {
    return [];
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return [];
  if (PRIVATE_HOST.test(u.hostname)) return [];
  const host = u.hostname;
  const apex = host.replace(/^www\./i, "");
  const www = host.startsWith("www.") ? host : `www.${host}`;
  const order = host.startsWith("www.") ? [host, apex] : [host, www];
  return order.map((h) => {
    const c = new URL(u.toString());
    c.hostname = h;
    c.protocol = "https:";
    return c.toString();
  });
}

async function framable(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    if (res.status >= 400) return null;
    const xfo = (res.headers.get("x-frame-options") ?? "").toLowerCase();
    if (xfo.includes("deny") || xfo.includes("sameorigin")) return null;
    const csp = (res.headers.get("content-security-policy") ?? "").toLowerCase();
    const m = csp.match(/frame-ancestors([^;]*)/);
    if (m) {
      const tokens = m[1].trim().split(/\s+/).filter(Boolean);
      const permissive = tokens.some((t) => t === "*" || t === "https:" || t === "http:");
      if (!permissive) return null;
    }
    // Use the final URL after redirects so we never frame a redirect chain.
    return res.url || url;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function probeBestEmbedUrl(raw: string): Promise<EmbedProbeResult> {
  const list = variants(raw.trim());
  let host = raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
  if (!list.length) return { url: null, host };
  try {
    host = new URL(list[0]).hostname.replace(/^www\./i, "");
  } catch {
    /* keep fallback host */
  }
  for (const candidate of list) {
    const ok = await framable(candidate);
    if (ok) return { url: ok, host };
  }
  return { url: null, host };
}
