import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Row = { id: string; advertiser_name: string; destination_url: string; desktop_image_url: string; mobile_image_url: string; status: string; budget_cents: number; spent_cents: number; impressions: number; clicks: number };

export function AdminBannerReview() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => ((await supabase.rpc("admin_ad_campaigns")).data ?? []) as unknown as Row[],
  });
  const review = async (id: string, approve: boolean) => {
    const reason = approve ? null : window.prompt("Reason for rejection (shown to the advertiser)") ?? "";
    if (!approve && !reason) return;
    const { error } = await supabase.rpc("admin_review_ad", { _id: id, _approve: approve, _reason: reason ?? undefined });
    if (error) toast.error(error.message); else toast.success(approve ? "Banner is live" : "Banner rejected — refund it in Dodo");
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
  };
  if (!data.length) return null;
  return (
    <section className="mb-8 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Banner ads</h2>
      <ul className="mt-4 space-y-3">
        {data.map((c) => (
          <li key={c.id} className="grid gap-3 rounded-xl border border-border p-3 md:grid-cols-[300px_120px_1fr_auto] md:items-center">
            <img src={c.desktop_image_url} alt="" className="aspect-[6/1] w-full rounded object-cover" />
            <img src={c.mobile_image_url} alt="" className="aspect-[2/1] w-full rounded object-cover" />
            <div className="min-w-0 text-sm">
              <p className="font-semibold">{c.advertiser_name} · {c.status}</p>
              <a href={c.destination_url} target="_blank" rel="noreferrer" className="block truncate text-muted-foreground underline">{c.destination_url}</a>
              <p className="text-muted-foreground">${(Number(c.spent_cents) / 100).toFixed(2)} / ${c.budget_cents / 100} · {c.impressions} views · {c.clicks} clicks</p>
            </div>
            <div className="flex gap-2">
              {c.status !== "running" && c.status !== "finished" && <Button size="sm" onClick={() => review(c.id, true)}>Approve</Button>}
              {c.status !== "rejected" && c.status !== "finished" && <Button size="sm" variant="outline" onClick={() => review(c.id, false)}>Reject</Button>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
