/** One ordered attempt per URL, shared by images and the homepage canvas. */
export function startupLogoSources(websiteUrl: string, logoUrl?: string | null): string[] {
  let domain = "";
  try {
    domain = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname.replace(/^www\./, "");
  } catch { /* Invalid websites still retain their uploaded logo. */ }
  return [...new Set([
    logoUrl?.trim() || "",
    domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : "",
  ].filter(Boolean))];
}