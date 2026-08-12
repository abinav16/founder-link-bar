import { supabase } from "@/integrations/supabase/client";

/** Total sidebar slots: 1-4 = left rail, 5-8 = right rail. */
export const FEATURED_SLOT_COUNT = 8;
/** Monthly subscription price, USD (recurring every 30 days). */
export const FEATURED_PRICE_USD = 79;
export const FEATURED_DAYS = 30;
/** Human label for the billing cadence. */
export const FEATURED_BILLING_LABEL = "per month";


export type FeaturedSlot = {
  slot_index: number;
  startup_id: string;
  name: string;
  slug: string | null;
  website_url: string;
  logo_url: string | null;
  description: string;
  founder_name: string | null;
  founder_avatar_url: string | null;
  expires_at: string;
};

export async function fetchFeaturedSlots(): Promise<FeaturedSlot[]> {
  const { data, error } = await supabase.rpc("public_featured_slots");
  if (error) {
    console.error("[featured] slots load failed", error);
    return [];
  }
  return (data ?? []) as unknown as FeaturedSlot[];
}

export type MyStartup = {
  id: string;
  name: string;
  website_url: string;
  logo_url: string | null;
  description: string;
  status: string;
};

export async function fetchMyApprovedStartups(): Promise<MyStartup[]> {
  const { data, error } = await supabase.rpc("get_my_startups");
  if (error) return [];
  return ((data ?? []) as unknown as MyStartup[]).filter((s) => s.status === "approved");
}

export function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export function railSlots(side: "left" | "right"): number[] {
  return side === "left" ? [1, 2, 3, 4] : [5, 6, 7, 8];
}

export type MyFeaturedSlot = {
  id: string;
  slot_index: number;
  startup_id: string | null;
  status: string;
  expires_at: string;
  cancel_at_period_end: boolean;
};

/** Active featured slots owned by the signed-in user (RLS-scoped). */
export async function fetchMyFeaturedSlots(): Promise<MyFeaturedSlot[]> {
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return [];
  const { data, error } = await supabase
    .from("featured_slots")
    .select("id, slot_index, startup_id, status, expires_at, cancel_at_period_end")
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());
  if (error) return [];
  return (data ?? []) as unknown as MyFeaturedSlot[];
}

/** Turn off auto-renewal. The slot stays live until expires_at. */
export async function cancelFeaturedSlot(slotId: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("create-dodo-checkout", {
    body: { action: "cancel_featured", slot_id: slotId },
  });
  if (error || !data?.ok) return { ok: false, error: data?.error ?? "Could not cancel the promotion." };
  return { ok: true };
}
