import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SavedStartup = {
  savedAt: string;
  startup: {
    id: string;
    name: string;
    slug: string | null;
    website_url: string;
    logo_url: string | null;
    description: string | null;
    status: string;
  } | null;
};

export const getSavedStartups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedStartup[]> => {
    const { data, error } = await context.supabase
      .from("saved_startups")
      .select("created_at, startup_id, startups(id, name, slug, website_url, logo_url, description, status)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      savedAt: row.created_at,
      startup: row.startups,
    }));
  });

export const isStartupSaved = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ startup_id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("saved_startups")
      .select("id")
      .eq("user_id", context.userId)
      .eq("startup_id", data.startup_id)
      .limit(1);
    if (error) throw new Error(error.message);
    return (rows ?? []).length > 0;
  });

export const toggleSavedStartup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ startup_id: z.string().uuid(), save: z.boolean() }).parse(data))
  .handler(async ({ context, data }) => {
    if (data.save) {
      const { error } = await context.supabase
        .from("saved_startups")
        .insert({ user_id: context.userId, startup_id: data.startup_id })
        .select("id")
        .single();
      if (error && error.code !== "23505") throw new Error(error.message);
      return true;
    }
    const { error } = await context.supabase
      .from("saved_startups")
      .delete()
      .eq("user_id", context.userId)
      .eq("startup_id", data.startup_id);
    if (error) throw new Error(error.message);
    return false;
  });
