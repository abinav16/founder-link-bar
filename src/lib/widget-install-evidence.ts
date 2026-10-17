/** CSP permission and slot placeholders are not proof of a native iframe. */
export function hasNativeWidgetFrame(html: string): boolean {
  return /<iframe\b[^>]*\bsrc\s*=\s*["']https?:\/\/(?:www\.)?startupbar\.co\/widget\/bar(?:[?"'#]|\s)/i.test(html);
}

/**
 * A heartbeat is sent by the running widget itself, so a recent one proves
 * the bar is installed even when a static page scan cannot see it (bundled
 * SPA loaders, modulepreload chunks, installs only on inner pages).
 */
export const HEARTBEAT_PROOF_WINDOW_MS = 24 * 60 * 60_000;

export function heartbeatProvesInstall(lastHeartbeatAt: string | null, now: number): boolean {
  if (!lastHeartbeatAt) return false;
  const age = now - new Date(lastHeartbeatAt).getTime();
  return age >= 0 && age < HEARTBEAT_PROOF_WINDOW_MS;
}

/** Same-origin script URLs a page loads: <script src>, modulepreload and preload-as-script links. */
export function collectScriptUrls(html: string, pageUrl: URL, limit = 8): URL[] {
  const raw: string[] = [];
  for (const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) raw.push(m[1]);
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    const rel = tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
    const as = tag.match(/\bas\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
    const isScript = rel.split(/\s+/).includes("modulepreload") || (rel.split(/\s+/).includes("preload") && as === "script");
    if (!isScript) continue;
    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href) raw.push(href);
  }
  const seen = new Set<string>();
  const out: URL[] = [];
  for (const s of raw) {
    let u: URL;
    try {
      u = new URL(s, pageUrl);
    } catch {
      continue;
    }
    if (u.origin !== pageUrl.origin || seen.has(u.href)) continue;
    seen.add(u.href);
    out.push(u);
    if (out.length >= limit) break;
  }
  return out;
}

/** The fallback page must be on the startup's own domain (or a subdomain). */
export function isSameSite(candidate: string, site: string): boolean {
  try {
    const a = new URL(candidate).hostname.replace(/^www\./, "").toLowerCase();
    const b = new URL(site).hostname.replace(/^www\./, "").toLowerCase();
    return a === b || a.endsWith(`.${b}`);
  } catch {
    return false;
  }
}
