import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";
import type { Database } from "@/integrations/supabase/types";

function runtimeEnv(name: string) {
  const runtime = globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> }; Deno?: { env?: { get?: (name: string) => string | undefined } } };
  return runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
}
function configuredEnv(names: string[]) {
  for (const name of names) { const value = runtimeEnv(name)?.trim(); if (value) return value; }
}
function projectUrl() {
  const url = configuredEnv(["SUPABASE_URL", "VITE_SUPABASE_URL"]) ?? import.meta.env.VITE_SUPABASE_URL;
  if (!url) throw new Error("Missing database configuration.");
  return url;
}
function publishableKey() {
  const direct = configuredEnv(["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"]);
  if (direct) return direct;
  try {
    const parsed: unknown = JSON.parse(runtimeEnv("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const dictionary = parsed as Record<string, unknown>;
      const key = [dictionary.default, ...Object.values(dictionary)].find((v): v is string => typeof v === "string" && v.trim().startsWith("sb_publishable_"));
      if (key) return key.trim();
    }
  } catch { /* Use a configured fallback. */ }
  const fallback = configuredEnv(["SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"]) ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!fallback) throw new Error("Missing database configuration.");
  return fallback;
}
export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token) throw new Error("Sign in to connect your account.");
  return createClient<Database>(projectUrl(), publishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}