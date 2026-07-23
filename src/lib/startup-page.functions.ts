import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function getClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export interface StartupReferrer {
  startup_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string;
  cnt: number;
}

export interface StartupPageData {
  id: string;
  slug: string;
  name: string;
  website_url: string;
  description: string;
  logo_url: string | null;
  created_at: string;
  user_id: string | null;
  founder_name: string | null;
  founder_quote: string | null;
  founder_avatar_url: string | null;
  iframe_blocked: boolean | null;
  impressions: number;
  clicks: number;
  impressions_given: number;
  clicks_given: number;
  referrers: StartupReferrer[];
  pulse: number;
}

async function probeIframeBlocked(rawUrl: string): Promise<boolean> {
  const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    let res: Response;
    try {
      res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    } catch {
      res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
    }
    if (!res.ok && res.status >= 400) return true;
    const xfo = (res.headers.get("x-frame-options") ?? "").toLowerCase();
    if (xfo.includes("deny") || xfo.includes("sameorigin")) return true;
    const csp = (res.headers.get("content-security-policy") ?? "").toLowerCase();
    const m = csp.match(/frame-ancestors([^;]*)/);
    if (m) {
      const value = m[1].trim();
      // permissive if contains * (and not just *.something)
      const tokens = value.split(/\s+/).filter(Boolean);
      const permissive = tokens.some((t) => t === "*" || t === "https:" || t === "http:");
      if (!permissive) return true;
    }
    return false;
  } catch {
    return true;
  } finally {
    clearTimeout(timer);
  }
}

export const getStartupPage = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }): Promise<StartupPageData | null> => {
    const supabase = getClient();
    const { data: s } = await supabase
      .from("startups")
      .select("id, slug, name, website_url, description, logo_url, created_at, user_id, founder_name, founder_quote, founder_avatar_url, iframe_blocked" as any)
      .eq("slug", data.slug)
      .eq("status", "approved")
      .maybeSingle();
    if (!s) return null;
    const row = s as any;

    const [totalsRes, referrersRes, pulseRes] = await Promise.all([
      supabase.rpc("public_startup_totals" as any, { _ids: [row.id] }),
      supabase.rpc("public_startup_referrers" as any, { _startup_id: row.id }),
      supabase.rpc("public_startup_pulse" as any, { _startup_id: row.id }),
    ]);

    const t = ((totalsRes.data as any) ?? [])[0] ?? {};
    const refs = ((referrersRes.data as any) ?? []) as StartupReferrer[];
    const pulse = Number(pulseRes.data ?? 0);

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      website_url: row.website_url,
      description: row.description,
      logo_url: row.logo_url,
      created_at: row.created_at,
      user_id: row.user_id ?? null,
      founder_name: row.founder_name ?? null,
      founder_quote: row.founder_quote ?? null,
      founder_avatar_url: row.founder_avatar_url ?? null,
      iframe_blocked: row.iframe_blocked ?? null,
      impressions: Number(t.impressions ?? 0),
      clicks: Number(t.clicks ?? 0),
      impressions_given: Number(t.impressions_given ?? 0),
      clicks_given: Number(t.clicks_given ?? 0),
      referrers: refs.map((r) => ({ ...r, cnt: Number(r.cnt) })),
      pulse,
    };
  });

export const getStartupEmbedStatus = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<boolean> => {
    const supabase = getClient();
    const { data: s } = await supabase
      .from("startups")
      .select("id, website_url, iframe_blocked" as any)
      .eq("id", data.id)
      .eq("status", "approved")
      .maybeSingle();

    if (!s) return true;
    const row = s as any;
    if (row.iframe_blocked !== null && row.iframe_blocked !== undefined) return Boolean(row.iframe_blocked);

    const iframeBlocked = await probeIframeBlocked(row.website_url);
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("startups").update({ iframe_blocked: iframeBlocked } as any).eq("id", row.id);
    } catch { /* non-fatal */ }
    return iframeBlocked;
  });

export const getStartupPulse = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<number> => {
    const supabase = getClient();
    const { data: n } = await supabase.rpc("public_startup_pulse" as any, { _startup_id: data.id });
    return Number(n ?? 0);
  });
