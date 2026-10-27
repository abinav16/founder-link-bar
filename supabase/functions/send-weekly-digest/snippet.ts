/** Static evidence only: JS-generated anchors are not raw-HTML backlinks. */
export function hasLatestSnippet(html: string, startupId: string): boolean {
  const uncommented = html.replace(/<!--[\s\S]*?-->/g, '');
  const source = uncommented.replace(/<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi, '<script $1></script>');
  const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];
  const loader = [...source.matchAll(/<script\b[^>]*>/gi)].some(([tag]) => {
    try {
      const url = new URL(attr(tag, 'src') ?? '');
      return url.origin === 'https://startupbar.co' && url.pathname === '/widget/loader.js' && attr(tag, 'data-startup-id') === startupId;
    } catch { return false; }
  });
  // An inline injector can be legitimate install evidence, but the credit
  // itself must still be an actual static anchor outside script content.
  const inlineLoader = [...uncommented.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].some(([, js]) =>
    /createElement\(\s*['"]script['"]\s*\)/.test(js) &&
    js.includes('https://startupbar.co/widget/loader.js') &&
    [...js.matchAll(/setAttribute\(\s*['"]data-startup-id['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g)].some(([, value]) => value === startupId),
  );
  const credit = [...source.matchAll(/<a\b[^>]*>[\s\S]*?<\/a\s*>/gi)].some(([tag]) => {
    try {
      const url = new URL(attr(tag, 'href') ?? '');
      const text = tag.replace(/<[^>]*>/g, '').trim();
      return url.origin === 'https://startupbar.co' && url.pathname === '/' && !url.search && !url.hash && text === 'StartupBar';
    } catch { return false; }
  });
  return (loader || inlineLoader) && credit;
}

export function needsSnippetReminder(detectedAt: string | null | undefined): boolean {
  return !detectedAt;
}

// Never follow stored or redirected URLs into local/private network addresses.
export function safeSnippetUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) return null;
    if (!host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':') || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)) return null;
    return url;
  } catch { return null; }
}

export async function checkLatestSnippet(
  startupId: string,
  websiteUrl: string,
  lastPageUrl: string | null,
  fetcher: typeof fetch = fetch,
): Promise<{ detected: boolean; complete: boolean; sourceUrl: string | null }> {
  const root = safeSnippetUrl(websiteUrl);
  if (!root) return { detected: false, complete: false, sourceUrl: null };
  const urls = [root];
  const inner = lastPageUrl ? safeSnippetUrl(lastPageUrl) : null;
  const domain = root.hostname.replace(/^www\./, '');
  if (inner && (inner.hostname.replace(/^www\./, '') === domain || inner.hostname.endsWith(`.${domain}`)) && inner.href !== root.href) urls.push(inner);
  let complete = true;
  for (const start of urls) {
    try {
      let url = start;
      for (let redirect = 0; redirect <= 3; redirect++) {
        const response = await fetcher(url.href, {
          redirect: 'manual',
          headers: { 'User-Agent': 'StartupBar-Verifier/1.0 (+https://startupbar.co)', Accept: 'text/html' },
          signal: AbortSignal.timeout(5000),
        });
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          const next = location ? safeSnippetUrl(new URL(location, url).href) : null;
          if (!next || redirect === 3) throw new Error('Unsafe or excessive redirect');
          url = next;
          continue;
        }
        if (!response.ok || !(response.headers.get('content-type') ?? '').includes('text/html')) throw new Error('Page unavailable');
        // Limit response reading, rather than buffering an arbitrary-size site.
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Empty response');
        const decoder = new TextDecoder();
        let html = '', bytes = 0;
        try {
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            bytes += chunk.value.byteLength;
            if (bytes > 2_000_000) throw new Error('Page too large');
            html += decoder.decode(chunk.value, { stream: true });
          }
          html += decoder.decode();
        } finally { await reader.cancel(); }
        if (hasLatestSnippet(html, startupId)) return { detected: true, complete: true, sourceUrl: url.href };
        break;
      }
    } catch { complete = false; }
  }
  return { detected: false, complete, sourceUrl: null };
}