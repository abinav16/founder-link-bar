export interface EmbedProbeResult {
  /** Framable URL to load in the mock window, or null when it must fall back. */
  url: string | null;
  /** Host to display in the fake address bar. */
  host: string;
  /** Site colors read from its HTML (theme-color / body styles), when found. */
  bg?: string | null;
  fg?: string | null;
}

function toHex(raw: string | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  let m = v.match(/^#([0-9a-f]{3})$/);
  if (m) return "#" + m[1].split("").map((c) => c + c).join("");
  m = v.match(/^#([0-9a-f]{6})/);
  if (m) return "#" + m[1];
  m = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?/);
  if (m) {
    if (m[4] && parseFloat(m[4]) < (m[4].endsWith("%") ? 50 : 0.5)) return null;
    return "#" + [m[1], m[2], m[3]].map((n) => Math.min(255, +n).toString(16).padStart(2, "0")).join("");
  }
  if (v === "white") return "#ffffff";
  if (v === "black") return "#000000";
  m = v.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/);
  if (m) {
    const h = (+m[1] % 360) / 60, s = +m[2] / 100, l = +m[3] / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(h % 2 - 1)), offset = l - c / 2;
    const rgb = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
    return "#" + rgb.map((n) => Math.round((n + offset) * 255).toString(16).padStart(2, "0")).join("");
  }
  return null;
}

/** Best-effort read of a page's background/text colors from its raw HTML. */
export function extractSiteColors(html: string, stylesheet = ""): { bg: string | null; fg: string | null } {
  const head = html.slice(0, 300_000);
  const styles = [...head.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((x) => x[1]).join("\n") + "\n" + stylesheet;
  const variables = new Map<string, string>();
  for (const rule of styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!rule[1].split(",").some((s) => /^(?:html|body|:root)$/.test(s.trim()))) continue;
    for (const value of rule[2].matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)) variables.set(value[1], value[2].trim());
  }
  const decl = (block: string, prop: RegExp) => {
    let value = block.match(prop)?.[1];
    for (let i = 0; value && i < 5 && value.includes("var("); i++) {
      value = value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]+))?\)/g, (_, key: string, fallback: string) => variables.get(key) ?? fallback ?? "");
    }
    return toHex(value);
  };
  const BG = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i;
  const FG = /(?:^|;)\s*color\s*:\s*([^;]+)/i;
  let bg: string | null = null, fg: string | null = null;
  for (const rule of styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!rule[1].split(",").some((s) => /^(?:html|body)$/.test(s.trim()))) continue;
    bg = decl(rule[2], BG) ?? bg;
    fg = decl(rule[2], FG) ?? fg;
  }
  const tag = head.match(/<body[^>]*style=["']([^"']*)["']/i)?.[1];
  if (tag) { bg = decl(tag, BG) ?? bg; fg = decl(tag, FG) ?? fg; }
  if (!bg) {
    const meta = head.match(/<meta[^>]+name=["']theme-color["'][^>]*>/i)?.[0];
    bg = toHex(meta?.match(/content=["']([^"']+)["']/i)?.[1]);
  }
  return { bg, fg };
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

async function readSiteStyles(html: string, pageUrl: string): Promise<string> {
  const page = new URL(pageUrl);
  const urls = [...html.matchAll(/<link\b[^>]*>/gi)].flatMap(([tag]) => {
    if (!/rel=["']stylesheet["']/i.test(tag) || /media=["'][^"']*(?:dark|print)/i.test(tag)) return [];
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) return [];
    try {
      const target = new URL(href, page);
      return target.origin === page.origin && !PRIVATE_HOST.test(target.hostname) ? [target.href] : [];
    } catch { return []; }
  }).slice(0, 3);
  return (await Promise.all(urls.map(async (url) => {
    try {
      const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(2500) });
      if (!res.ok || !res.headers.get("content-type")?.includes("text/css")) return "";
      const reader = res.body?.getReader();
      if (!reader) return "";
      const decoder = new TextDecoder();
      let css = "", size = 0;
      while (size < 300_000) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        css += decoder.decode(chunk.value, { stream: true });
      }
      await reader.cancel();
      return css.slice(0, 300_000);
    } catch { return ""; }
  }))).join("\n");
}

async function framable(url: string): Promise<{ url: string | null; html: string; pageUrl: string } | null> {
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
    const html = await res.text().catch(() => "");
    const pageUrl = res.url || url;
    const blocked = { url: null, html, pageUrl };
    const xfo = (res.headers.get("x-frame-options") ?? "").toLowerCase();
    if (xfo.includes("deny") || xfo.includes("sameorigin")) return blocked;
    const csp = (res.headers.get("content-security-policy") ?? "").toLowerCase();
    const m = csp.match(/frame-ancestors([^;]*)/);
    if (m) {
      const tokens = m[1].trim().split(/\s+/).filter(Boolean);
      const permissive = tokens.some((t) => t === "*" || t === "https:" || t === "http:");
      if (!permissive) return blocked;
    }
    // Use the final URL after redirects so we never frame a redirect chain.
    return { url: pageUrl, html, pageUrl };
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
  let colors: { bg: string | null; fg: string | null } = { bg: null, fg: null };
  for (const candidate of list) {
    const r = await framable(candidate);
    if (r?.html && !colors.bg) colors = extractSiteColors(r.html, await readSiteStyles(r.html, r.pageUrl));
    if (r?.url) return { url: r.url, host, ...colors };
  }
  return { url: null, host, ...colors };
}
