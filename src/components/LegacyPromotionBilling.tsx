import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelLegacyFeaturedSubscription, fetchLegacyFeaturedSubscriptions } from "@/lib/legacy-featured";

export function LegacyPromotionBilling({ startupId }: { startupId: string }) {
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["legacy-promotion-billing"],
    queryFn: fetchLegacyFeaturedSubscriptions,
    staleTime: 30_000,
  });
  const subscription = subscriptions.find((row) => row.startup_id === startupId);
  if (!subscription) return null;

  async function stopRenewal() {
    if (!subscription || busy) return;
    setBusy(true);
    try {
      await cancelLegacyFeaturedSubscription(subscription.id);
      await qc.invalidateQueries({ queryKey: ["legacy-promotion-billing"] });
      toast.success("Renewal stopped. No further subscription renewals will be charged.");
    } catch {
      toast.error("Could not stop renewal. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const endDate = new Date(subscription.expires_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
  return (
    <section className="mt-6 border-t border-border pt-5" aria-label="Legacy promotion billing">
      <h3 className="text-sm font-medium text-foreground">Legacy promotion billing</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        This product is retired. {subscription.cancel_at_period_end
          ? `Renewal is off; the current billing period ends ${endDate} (UTC).`
          : `Your previous subscription is still set to renew on ${endDate} (UTC).`}
      </p>
      {!subscription.cancel_at_period_end && (
        <Button type="button" variant="outline" className="mt-3" disabled={busy} onClick={() => void stopRenewal()}>
          {busy ? <Loader2 className="animate-spin" /> : <XCircle />}
          {busy ? "Stopping renewal…" : "Stop renewal"}
        </Button>
      )}
    </section>
  );
}