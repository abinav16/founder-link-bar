export const SITEMAP_BASE_URL = "https://startupbar.co";
export const PUBLIC_SITEMAP_PATHS = ["/", "/network", "/leaderboard", "/startupbid", "/advertise", "/apply", "/pricing", "/faq", "/terms", "/privacy"] as const;

type PublicSlug = { slug: string | null };

/** Paginate public reads and reject incomplete results rather than publish partial XML. */
export async function collectSitemapSlugs(readPage: (from: number, to: number) => PromiseLike<{ data: PublicSlug[] | null; error: unknown }>): Promise<string[]> {
  const slugs = new Set<string>();
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await readPage(from, from + pageSize - 1);
    if (error || !data) throw new Error("Public startup sitemap lookup failed");
    for (const row of data) if (row.slug) slugs.add(row.slug);
    if (data.length < pageSize) return [...slugs];
  }
}

const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function renderSitemap(slugs: string[]): string {
  const paths = [...PUBLIC_SITEMAP_PATHS, ...slugs.map(slug => `/startup/${encodeURIComponent(slug)}`)];
  // No authoritative page-specific content timestamps are available; omit lastmod.
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(path => `  <url><loc>${escapeXml(SITEMAP_BASE_URL + path)}</loc></url>`).join("\n")}\n</urlset>`;
}