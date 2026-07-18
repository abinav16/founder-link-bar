// Lightweight User-Agent parser shared by public tracking endpoints.
// Not a full UA library — just the buckets we display in dashboards.
export function parseUA(ua: string): { device: string; os: string; browser: string } {
  const u = (ua || "").toLowerCase();
  let device = "desktop";
  if (/ipad|tablet/.test(u)) device = "tablet";
  else if (/mobi|iphone|android/.test(u)) device = "mobile";

  let os = "unknown";
  if (/windows/.test(u)) os = "Windows";
  else if (/mac os x|macintosh/.test(u)) os = "macOS";
  else if (/iphone|ipad|ios/.test(u)) os = "iOS";
  else if (/android/.test(u)) os = "Android";
  else if (/linux/.test(u)) os = "Linux";

  let browser = "unknown";
  if (/edg\//.test(u)) browser = "Edge";
  else if (/chrome\//.test(u) && !/edg\//.test(u)) browser = "Chrome";
  else if (/safari\//.test(u) && !/chrome\//.test(u)) browser = "Safari";
  else if (/firefox\//.test(u)) browser = "Firefox";

  return { device, os, browser };
}

export async function lookupCountry(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  try {
    const res = await fetch(`https://ipapi.co/${ip}/country/`, {
      headers: { "User-Agent": "startupbar-widget-tracker" },
    });
    if (!res.ok) return null;
    const txt = (await res.text()).trim();
    return /^[A-Z]{2}$/.test(txt) ? txt : null;
  } catch {
    return null;
  }
}

export function extractCountry(request: Request): string | null {
  const cf = request.headers.get("cf-ipcountry");
  if (cf && cf !== "XX" && cf !== "T1") return cf.toUpperCase();
  return null;
}

export function extractIp(request: Request): string | null {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() ||
    null
  );
}
