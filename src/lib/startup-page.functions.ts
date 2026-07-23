import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function getClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
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

export interface StartupPageData {
  id: string;
  slug: string;
  name: string;
  description: string;
  website_url: string;
  logo_url: string | null;
  created_at: string;
  founder_name: string | null;
  founder_quote: string | null;
  founder_avatar_url: string | null;
  iframe_blocked: boolean | null;
  impressions: number;
  clicks: number;
  impressions_given: number;
  referrers: Array<{
    startup_id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    website_url: string;
    cnt: number;
  }>;
  pulse: number;
}

export const getStartupPage = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }): Promise<StartupPageData | null> => {
    const supabase = getClient();
    const { data: s } = await supabase
      .from("startups")
      .select(
        "id, slug, name, description, website_url, logo_url, created_at, founder_name, founder_quote, founder_avatar_url, iframe_blocked"
      )
      .eq("slug", data.slug)
      .eq("status", "approved")
      .maybeSingle();
    if (!s) return null;

    const [totalsRes, refRes, pulseRes] = await Promise.all([
      supabase.rpc("public_startup_totals" as any, { _ids: [s.id] }),
      supabase.rpc("public_startup_referrers" as any, { _startup_id: s.id }),
      supabase.rpc("public_startup_pulse" as any, { _startup_id: s.id }),
    ]);
    const t = ((totalsRes.data ?? []) as any[])[0] ?? {};
    return {
      ...(s as any),
      impressions: Number(t.impressions ?? 0),
      clicks: Number(t.clicks ?? 0),
      impressions_given: Number(t.impressions_given ?? 0),
      referrers: ((refRes.data ?? []) as any[]).map((r) => ({
        startup_id: r.startup_id,
        name: r.name,
        slug: r.slug,
        logo_url: r.logo_url,
        website_url: r.website_url,
        cnt: Number(r.cnt),
      })),
      pulse: Number(pulseRes.data ?? 0),
    };
  });

export const getStartupPulse = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<number> => {
    const supabase = getClient();
    const { data: n } = await supabase.rpc("public_startup_pulse" as any, { _startup_id: data.id });
    return Number(n ?? 0);
  });
