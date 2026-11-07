import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CLICK_PACKS, perClick } from "@/lib/checkout-plans";
import { confirmOrderPayment, createBoostCheckout, getMyClickBoosts } from "@/lib/checkout-order.functions";

const BOOSTS_KEY = ["my-click-boosts"];

/** Handles the return from a click-pack checkout once per page. */
function useBoostReturn() {
  const qc = useQueryClient();
  useEffect(() => {
    const url = new URL(window.location.href);
    const pid = url.searchParams.get("payment_id");
    if (!pid || url.searchParams.get("boost") !== "1") return;
    url.searchParams.delete("payment_id");
    url.searchParams.delete("boost");
    window.history.replaceState(null, "", url.toString());
    confirmOrderPayment({ data: { paymentId: pid } }).then((r) => {
      if (r.status === "paid") toast.success("Payment received. Your clicks are on their way and you're now featured.");
      else if (r.status === "pending") toast("Payment is processing. Your clicks start as soon as it clears.");
      else toast.error("We couldn't confirm that payment yet. If you were charged, it will appear shortly.");
      qc.invalidateQueries({ queryKey: BOOSTS_KEY });
    });
  }, [qc]);
}

export function BoostClicksButton({ startupId, startupName }: { startupId: string; startupName: string }) {
  const [open, setOpen] = useState(false);
  const [clicks, setClicks] = useState(500);
  const [busy, setBusy] = useState(false);
  useBoostReturn();
  const { data: boosts = [] } = useQuery({ queryKey: BOOSTS_KEY, queryFn: () => getMyClickBoosts(), staleTime: 30_000 });
  const active = boosts.filter((b) => b.startup_id === startupId);
  const bought = active.reduce((s, b) => s + b.clicks_purchased, 0);
  const done = active.reduce((s, b) => s + b.clicks_delivered, 0);

  const pay = async () => {
    setBusy(true);
    try {
      const ret = new URL(window.location.href);
      ret.search = "";
      ret.searchParams.set("boost", "1");
      const r = await createBoostCheckout({ data: { startupId, clicks, returnUrl: ret.toString() } });
      if (r.ok) { window.location.href = r.paymentLink; return; }
      toast.error(r.reason === "addons_unavailable" ? "Click packs aren't available right now." : "Couldn't start checkout. Please try again.");
    } catch {
      toast.error("Couldn't start checkout. Please try again.");
    }
    setBusy(false);
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {bought > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
          Featured · {done.toLocaleString()} / {bought.toLocaleString()} clicks
        </span>
      )}
      <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        <Zap className="h-3.5 w-3.5" /> {bought > 0 ? "Add clicks" : "Get guaranteed clicks"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guaranteed clicks for {startupName}</DialogTitle>
            <DialogDescription>
              Pay once. You get priority in the bar across member sites and a featured card on the Network page until every click arrives. Only real, bot-filtered clicks count.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Click pack">
            {CLICK_PACKS.map((p) => {
              const sel = p.clicks === clicks;
              return (
                <button
                  key={p.clicks}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => setClicks(p.clicks)}
                  className={`rounded-lg border p-3 text-left transition-colors ${sel ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground/40"}`}
                >
                  <div className="text-sm font-semibold">{p.clicks.toLocaleString()} clicks</div>
                  <div className="mt-0.5 text-lg font-semibold">${p.priceUsd}</div>
                  <div className="text-xs text-muted-foreground">${perClick(p).toFixed(2)} per click{p.popular ? " · Most chosen" : ""}</div>
                </button>
              );
            })}
          </div>
          <Button type="button" onClick={pay} disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay $${CLICK_PACKS.find((p) => p.clicks === clicks)?.priceUsd} once`}
          </Button>
        </DialogContent>
      </Dialog>
    </span>
  );
}
