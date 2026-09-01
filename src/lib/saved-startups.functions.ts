import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSavedStartups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_startups")
      .select("startup_id, created_at, startups(id, name, slug, website_url, logo_url, description, status)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
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
        .insert({ startup_id: data.startup_id })
        .select("id")
        .single();
      if (error && error.code !== "23505") throw new Error(error.message);
      return true;
    }
    const { error } = await context.supabase
      .from("saved_startups")
      .delete()
      .eq("startup_id", data.startup_id);
    if (error) throw new Error(error.message);
    return false;
  });
