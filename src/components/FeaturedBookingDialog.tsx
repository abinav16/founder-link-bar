import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { StartupFavicon } from "@/components/StartupFavicon";
import {
  FEATURED_DAYS,
  FEATURED_PRICE_USD,
  FEATURED_SLOT_COUNT,
  daysLeft,
  fetchFeaturedSlots,
  fetchMyApprovedStartups,
  type FeaturedSlot,
  type MyStartup,
} from "@/lib/featured";

type Phase = "loading" | "signin" | "no-startup" | "choose" | "waitlist" | "verifying" | "success";

const RETURN_KEY = "startupbar:featured-pending";

export function FeaturedBookingDialog({
  open,
  onOpenChange,
  initialSlot,
  preselectStartupId,
  watchReturn = false,
  onBooked,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialSlot?: number;
  preselectStartupId?: string;
  watchReturn?: boolean;
  onBooked?: () => void;
}) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("loading");
  const [slots, setSlots] = useState<FeaturedSlot[]>([]);
  const [startups, setStartups] = useState<MyStartup[]>([]);
  const [startupId, setStartupId] = useState<string>(preselectStartupId ?? "");
  const [slot, setSlot] = useState<number>(initialSlot ?? 0);
  const [busy, setBusy] = useState(false);
  const [wonSlot, setWonSlot] = useState<number | null>(null);
  const resumed = useRef(false);

  const taken = useMemo(() => new Map(slots.map((s) => [s.slot_index, s])), [slots]);
  const allTaken = slots.length >= FEATURED_SLOT_COUNT;

  // Resume after returning from the payment page.
  useEffect(() => {
    if (!watchReturn || resumed.current || typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const paymentId = p.get("payment_id");
    if (!p.get("featured") || !paymentId) return;
    resumed.current = true;
    onOpenChange(true);
    setPhase("verifying");
    void verifyAndWait(paymentId);
    // Clean the URL so a refresh doesn't re-trigger.
    p.delete("featured");
    p.delete("payment_id");
    const qs = p.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchReturn]);

  useEffect(() => {
    if (!open || phase === "verifying" || phase === "success") return;
    let cancelled = false;
    (async () => {
      setPhase("loading");
      const [{ data: auth }, s] = await Promise.all([
        supabase.auth.getSession(),
        fetchFeaturedSlots(),
      ]);
      if (cancelled) return;
      setSlots(s);
      if (!auth.session) {
        setPhase("signin");
        return;
      }
      const mine = await fetchMyApprovedStartups();
      if (cancelled) return;
      setStartups(mine);
      if (mine.length === 0) {
        setPhase("no-startup");
        return;
      }
      setStartupId((cur) => cur || preselectStartupId || mine[0].id);
      setPhase(s.length >= FEATURED_SLOT_COUNT ? "waitlist" : "choose");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselectStartupId]);

  useEffect(() => {
    if (initialSlot) setSlot(initialSlot);
  }, [initialSlot]);

  async function verifyAndWait(paymentId: string) {
    // The webhook is the source of truth; poll briefly for the row it writes.
    for (let i = 0; i < 15; i++) {
      const { data } = await supabase
        .from("featured_slots" as never)
        .select("slot_index, status")
        .eq("dodo_payment_id", paymentId)
        .maybeSingle();
      const row = data as unknown as { slot_index: number; status: string } | null;
      if (row && row.status === "active") {
        sessionStorage.removeItem(RETURN_KEY);
        setWonSlot(row.slot_index);
        setPhase("success");
        setSlots(await fetchFeaturedSlots());
        onBooked?.();
        setTimeout(() => onOpenChange(false), 2600);
        return;
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
    toast.error("Payment received. Your slot is being set up and will appear shortly.");
    onOpenChange(false);
  }

  async function startCheckout() {
    if (!startupId || !slot) {
      toast.error("Pick a slot first.");
      return;
    }
    setBusy(true);
    const base = `${window.location.origin}${window.location.pathname}`;
    const returnUrl = `${base}?featured=1`;
    sessionStorage.setItem(RETURN_KEY, JSON.stringify({ slot, startupId }));
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.functions.invoke("create-dodo-checkout", {
      body: {
        kind: "featured",
        slot_index: slot,
        startup_id: startupId,
        name: u.user?.user_metadata?.full_name,
        return_url: returnUrl,
      },
    });
    setBusy(false);
    if (error || !data?.payment_link) {
      toast.error("Could not start checkout. Please try again.");
      return;
    }
    window.location.href = data.payment_link;
  }

  async function joinWaitlist() {
    if (!startupId) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("featured_waitlist" as never)
      .insert({ startup_id: startupId, user_id: u.user?.id } as never);
    setBusy(false);
    if (error) {
      toast.error("Could not join the waitlist.");
      return;
    }
    toast.success("You're on the waitlist. We'll email you the moment a slot frees up.");
    onOpenChange(false);
  }

  function goSignIn() {
    sessionStorage.setItem("startupbar:auth-next", window.location.pathname);
    onOpenChange(false);
    navigate({ to: "/auth" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-[oklch(0.72_0.13_75)]" />
            Feature your startup
          </DialogTitle>
        </DialogHeader>

        {phase === "loading" && (
          <div className="flex items-center justify-center py-12 text-black/40">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {phase === "signin" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-black/60">
              Featured slots are for network members. Sign in to book one.
            </p>
            <button
              onClick={goSignIn}
              className="w-full rounded-md bg-black py-2.5 text-sm font-medium text-white"
            >
              Sign in
            </button>
          </div>
        )}

        {phase === "no-startup" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-black/60">
              Featured slots are available to approved network members. Add your startup first,
              then come back to book a slot.
            </p>
            <Link
              to="/apply"
              onClick={() => onOpenChange(false)}
              className="block w-full rounded-md bg-black py-2.5 text-center text-sm font-medium text-white"
            >
              Apply to the network
            </Link>
          </div>
        )}

        {(phase === "choose" || phase === "waitlist") && startups.length > 1 && (
          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wider text-black/40">
              Startup
            </span>
            <div className="flex flex-col gap-1.5">
              {startups.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStartupId(s.id)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    startupId === s.id
                      ? "border-black bg-black/[0.03]"
                      : "border-black/10 hover:border-black/25"
                  }`}
                >
                  <StartupFavicon url={s.website_url} name={s.name} logoUrl={s.logo_url} size={20} />
                  <span className="truncate font-medium text-black">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "choose" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wider text-black/40">
                Pick a slot
              </span>
              <div className="grid grid-cols-2 gap-3">
                {(["left", "right"] as const).map((side) => (
                  <div key={side} className="space-y-1.5">
                    <span className="block text-[10px] uppercase tracking-widest text-black/30">
                      {side} rail
                    </span>
                    {(side === "left" ? [1, 2, 3, 4] : [5, 6, 7, 8]).map((i) => {
                      const booked = taken.get(i);
                      const active = slot === i;
                      return (
                        <button
                          key={i}
                          disabled={!!booked}
                          onClick={() => setSlot(i)}
                          className={`w-full rounded-md border px-2.5 py-2 text-left text-xs transition-colors ${
                            booked
                              ? "cursor-not-allowed border-black/8 bg-black/[0.03] text-black/35"
                              : active
                                ? "border-[oklch(0.72_0.13_75)] bg-[oklch(0.72_0.13_75_/_0.08)] text-black"
                                : "border-black/12 text-black/60 hover:border-black/30"
                          }`}
                        >
                          <span className="block font-medium">Slot {i}</span>
                          <span className="block text-[10px]">
                            {booked ? `Frees up in ${daysLeft(booked.expires_at)}d` : "Available"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md bg-black/[0.03] px-3 py-2 text-sm">
              <span className="text-black/60">{FEATURED_DAYS} days featured</span>
              <span className="font-semibold text-black">${FEATURED_PRICE_USD}</span>
            </div>

            <button
              onClick={startCheckout}
              disabled={busy || !slot}
              className="w-full rounded-md bg-black py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy ? "Redirecting to payment…" : slot ? `Book slot ${slot}` : "Select a slot"}
            </button>
            <p className="text-center text-[11px] leading-relaxed text-black/35">
              Featured placement is presentation only. It never changes widget delivery,
              impressions or clicks.
            </p>
          </div>
        )}

        {phase === "waitlist" && (
          <div className="space-y-4">
            <p className="text-sm text-black/60">
              All {FEATURED_SLOT_COUNT} slots are booked right now. Join the waitlist and we'll
              email you the moment one frees up. No payment is taken today.
            </p>
            <button
              onClick={joinWaitlist}
              disabled={busy || !startupId}
              className="w-full rounded-md bg-black py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy ? "Joining…" : "Join the waitlist"}
            </button>
          </div>
        )}

        {phase === "verifying" && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-black/40" />
            <p className="text-sm text-black/60">Confirming your payment…</p>
          </div>
        )}

        {phase === "success" && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[oklch(0.72_0.13_75_/_0.15)]">
              <Check className="h-7 w-7 animate-[scale-in_0.3s_ease-out] text-[oklch(0.62_0.13_75)]" />
            </span>
            <p className="text-base font-medium text-black">
              You&apos;re live in slot {wonSlot}
            </p>
            <p className="text-sm text-black/50">Featured for the next {FEATURED_DAYS} days.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
