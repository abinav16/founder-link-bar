import { supabase } from "@/integrations/supabase/client";

/** Total sidebar slots: 1-4 = left rail, 5-8 = right rail. */
export const FEATURED_SLOT_COUNT = 8;
/** Monthly price, USD. Placeholder until the Dodo product price is fixed. */
export const FEATURED_PRICE_USD = 29;
export const FEATURED_DAYS = 30;

export type FeaturedSlot = {
  slot_index: number;
  startup_id: string;
  name: string;
  slug: string | null;
  website_url: string;
  logo_url: string | null;
  description: string;
  founder_name: string | null;
  expires_at: string;
};

export async function fetchFeaturedSlots(): Promise<FeaturedSlot[]> {
  const { data, error } = await supabase.rpc("public_featured_slots" as never);
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
  const { data, error } = await supabase.rpc("get_my_startups" as never);
  if (error) return [];
  return ((data ?? []) as unknown as MyStartup[]).filter((s) => s.status === "approved");
}

export function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export function railSlots(side: "left" | "right"): number[] {
  return side === "left" ? [1, 2, 3, 4] : [5, 6, 7, 8];
}
