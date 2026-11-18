import { supabase } from "@/integrations/supabase/client";

// Historical billing only: never use these records to offer or display placements.
export type LegacyFeaturedSubscription = {
  id: string;
  startup_id: string | null;
  expires_at: string;
  cancel_at_period_end: boolean;
};

export async function fetchLegacyFeaturedSubscriptions(): Promise<LegacyFeaturedSubscription[]> {
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return [];
  const { data, error } = await supabase
    .from("featured_slots")
    .select("id, startup_id, expires_at, cancel_at_period_end")
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());
  if (error) throw error;
  return data ?? [];
}

export async function cancelLegacyFeaturedSubscription(id: string): Promise<void> {
  // Keep the existing owner-verified billing endpoint for pre-retirement purchases.
  const { data, error } = await supabase.functions.invoke("create-dodo-checkout", {
    body: { action: "cancel_featured", slot_id: id },
  });
  if (error || !data?.ok) throw new Error("Could not stop renewal. Please try again.");
}