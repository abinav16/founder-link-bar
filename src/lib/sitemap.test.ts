import { describe, expect, it } from "vitest";
import { collectSitemapSlugs, PUBLIC_SITEMAP_PATHS, renderSitemap } from "./sitemap";

describe("public sitemap", () => {
  it("includes Advertise but excludes private campaign and account pages", () => {
    expect(PUBLIC_SITEMAP_PATHS).toContain("/advertise");
    expect(PUBLIC_SITEMAP_PATHS).toContain("/docs/mcp");
    for (const path of ["/advertise/new", "/dashboard", "/account", "/admin", "/auth", "/widget/bar", "/.lovable/oauth/consent"]) expect(PUBLIC_SITEMAP_PATHS).not.toContain(path);
  });
  it("uses the public origin, encodes slugs and never fabricates lastmod", () => {
    const xml = renderSitemap(["one & two"]);
    expect(xml).toContain("https://startupbar.co/advertise");
    expect(xml).toContain("https://startupbar.co/startup/one%20%26%20two");
    expect(xml).not.toContain("<lastmod>");
  });
  it("lists the public MCP guide exactly once at its canonical URL", () => {
    const xml = renderSitemap([]);
    expect(xml.match(/<loc>https:\/\/startupbar\.co\/docs\/mcp<\/loc>/g)).toHaveLength(1);
  });
  it("reads beyond one page without losing startups", async () => {
    const rows = Array.from({ length: 1201 }, (_, i) => ({ slug: `startup-${i}` }));
    const calls: number[] = [];
    const result = await collectSitemapSlugs(async (from, to) => { calls.push(from); return { data: rows.slice(from, to + 1), error: null }; });
    expect(calls).toEqual([0, 500, 1000]);
    expect(result).toHaveLength(1201);
    expect(result[1200]).toBe("startup-1200");
  });
  it("does not silently publish partial results after a lookup failure", async () => {
    await expect(collectSitemapSlugs(async from => from === 0 ? { data: Array.from({ length: 500 }, (_, i) => ({ slug: String(i) })), error: null } : { data: null, error: new Error("unavailable") })).rejects.toThrow("Public startup sitemap lookup failed");
  });
});