// Bot / scraper filtering for counted impressions and clicks.
//
// Context: a single member site started producing ~1,500 hits per hour with a
// brand-new session id on every request, no referrer, one country and almost
// zero clicks. That is automated traffic (crawlers, uptime monitors, scrapers,
// headless previewers). The bar still renders for those requests, they just
// must not be counted, otherwise network CTR collapses.

const BOT_UA =
  /(bot|crawl|spider|slurp|scrape|curl|wget|python-requests|httpclient|okhttp|axios|node-fetch|go-http|java\/|libwww|headless|phantomjs|puppeteer|playwright|selenium|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|slackbot|linkedinbot|twitterbot|bingpreview|ahrefs|semrush|mj12|dotbot|petalbot|yandex|baidu|applebot|gptbot|claudebot|ccbot|perplexity|amazonbot|bytespider)/i;

export function isBotRequest(request: Request): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  // No UA at all is never a real browser loading our script.
  if (!ua.trim()) return true;
  if (BOT_UA.test(ua)) return true;
  // Chrome/Edge client hints: headless Chrome omits sec-ch-ua entirely while
  // real Chromium always sends it alongside sec-fetch-* on subresource calls.
  const secFetch = request.headers.get("sec-fetch-site");
  const chUa = request.headers.get("sec-ch-ua");
  if (/chrome\/\d/i.test(ua) && !chUa && !secFetch) return true;
  return false;
}

// Per-host hourly cap on *counted* traffic. A genuinely busy member site
// rarely exceeds this; an automated flood does so within minutes.
export const HOST_HOURLY_CAP = 400;

type CacheEntry = { hour: number; count: number; overCap: boolean };
const cache = new Map<string, CacheEntry>();

/**
 * Returns true when this host has already exceeded the hourly counted cap.
 * Uses a short in-memory cache so we don't add a COUNT query per pageview.
 */
export async function isOverHostCap(
  supabase: {
    from: (t: string) => any;
  },
  host: string | null,
  table: "impressions" | "clicks" = "impressions",
): Promise<boolean> {
  if (!host) return false;
  const hour = Math.floor(Date.now() / 3_600_000);
  const key = `${table}:${host}:${hour}`;
  const hit = cache.get(key);

  if (hit && hit.hour === hour) {
    hit.count += 1;
    if (hit.overCap) return true;
    // Re-check against the database every 50 counted rows.
    if (hit.count % 50 !== 0) return false;
  }

  const since = new Date(hour * 3_600_000).toISOString();
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("host_startup_id", host)
    .gte("created_at", since);

  const total = Number(count ?? 0);
  const overCap = total >= HOST_HOURLY_CAP;
  cache.set(key, { hour, count: total, overCap });

  // Keep the map from growing forever across hours.
  if (cache.size > 500) {
    for (const [k, v] of cache) if (v.hour !== hour) cache.delete(k);
  }

  return overCap;
}
