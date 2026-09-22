import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Permanent account deletion.
 *
 * Removes the person's listings and all rows that hang off them, records a
 * permanent opt out so a future list import can never resurrect the address,
 * then deletes the login itself.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = (authUser?.user?.email ?? "").trim().toLowerCase();

    const { data: owned } = await supabaseAdmin.from("startups").select("id").eq("user_id", userId);
    const startupIds = (owned ?? []).map((s) => s.id);

    if (startupIds.length > 0) {
      await supabaseAdmin.from("saved_startups").delete().in("startup_id", startupIds);
      await supabaseAdmin.from("startup_stats_daily").delete().in("startup_id", startupIds);
      await supabaseAdmin.from("startup_stats_totals").delete().in("startup_id", startupIds);
      await supabaseAdmin.from("site_visits").delete().in("startup_id", startupIds);
      await supabaseAdmin.from("impressions").delete().in("shown_startup_id", startupIds);
      await supabaseAdmin.from("impressions").delete().in("host_startup_id", startupIds);
      await supabaseAdmin.from("clicks").delete().in("shown_startup_id", startupIds);
      await supabaseAdmin.from("clicks").delete().in("host_startup_id", startupIds);
      await supabaseAdmin.from("featured_slots").delete().in("startup_id", startupIds);
      await supabaseAdmin.from("featured_waitlist").delete().in("startup_id", startupIds);
      await supabaseAdmin.from("bid_entries").update({ startup_id: null }).in("startup_id", startupIds);
      await supabaseAdmin.from("application_events").delete().in("startup_id", startupIds);
      await supabaseAdmin.from("startups").delete().in("id", startupIds);
    }

    await supabaseAdmin.from("saved_startups").delete().eq("user_id", userId);
    await supabaseAdmin.from("featured_waitlist").delete().eq("user_id", userId);
    await supabaseAdmin.from("application_events").delete().eq("applicant_user_id", userId);
    await supabaseAdmin.from("payments").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    if (email) {
      // Permanent opt out: survives the account so re-imports cannot revive it.
      await supabaseAdmin.from("suppressed_emails").upsert(
        {
          email,
          reason: "unsubscribe",
          metadata: { reason_code: "account_deleted", permanent: true },
        },
        { onConflict: "email", ignoreDuplicates: true },
      );
      await supabaseAdmin.from("email_unsubscribe_tokens").delete().eq("email", email);
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
