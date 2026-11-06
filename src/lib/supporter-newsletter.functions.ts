import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSupporterNewsletter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ startupId: z.string().uuid() }).parse(value))
  .handler(async ({ data, context }) => {
    const { data: credit, error } = await context.supabase.from("supporter_newsletter_entitlements")
      .select("id,sponsorship_id,claimed_at").eq("startup_id", data.startupId).eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error("Could not load your complimentary spot.");
    if (!credit) return null;
    let sendDate: string | null = null;
    if (credit.sponsorship_id) {
      const { data: booking } = await context.supabase.from("newsletter_sponsorships").select("send_date").eq("id", credit.sponsorship_id).maybeSingle();
      sendDate = booking?.send_date ?? null;
    }
    return { claimed: !!credit.sponsorship_id, sendDate };
  });

export const claimSupporterNewsletter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ startupId: z.string().uuid(), sendDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(value))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("claim_supporter_newsletter", { _startup_id: data.startupId, _send_date: data.sendDate });
    if (error) throw new Error(error.code === "23505" ? "This Sunday was just booked. Please choose another." : "Could not book this spot. Check your listing is approved and your Supporter membership is active.");
    return { id };
  });