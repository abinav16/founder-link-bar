import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2, Sparkles, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { StartupFavicon } from "@/components/StartupFavicon";
import {
  FEATURED_DAYS,
  FEATURED_PRICE_USD,
  FEATURED_SLOT_COUNT,
  cancelFeaturedSlot,
  daysLeft,
  fetchFeaturedSlots,
  fetchMyApprovedStartups,
  fetchMyFeaturedSlots,
  type FeaturedSlot,
  type MyFeaturedSlot,
  type MyStartup,
} from "@/lib/featured";

/** Shared cache key so every promote surface reacts to a booking or cancel. */
export const MY_FEATURED_KEY = ["my-featured-slots"] as const;

export function useMyFeaturedSlots() {
  return useQuery({
    queryKey: MY_FEATURED_KEY,
    queryFn: fetchMyFeaturedSlots,
    staleTime: 30_000,
  });
}

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
    // Subscriptions return subscription_id; keep payment_id for older links.
    const paymentId = p.get("subscription_id") || p.get("payment_id");
    if (!p.get("featured") || !paymentId) return;
    resumed.current = true;
    onOpenChange(true);
    setPhase("verifying");
    void verifyAndWait(paymentId);
    // Clean the URL so a refresh doesn't re-trigger.
    p.delete("featured");
    p.delete("payment_id");
    p.delete("subscription_id");

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
    // Poll the webhook result and ask the authenticated checkout function to
    // verify directly with Dodo as a fallback when webhook delivery is late.
    for (let i = 0; i < 15; i++) {
      const { data } = await supabase
        .from("featured_slots")
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

      const { data: confirmation } = await supabase.functions.invoke("create-dodo-checkout", {
        body: { action: "confirm_featured", subscription_id: paymentId },
      });
      if (confirmation?.active) {
        sessionStorage.removeItem(RETURN_KEY);
        setWonSlot(Number(confirmation.slot_index));
        setPhase("success");
        setSlots(await fetchFeaturedSlots());
        onBooked?.();
        setTimeout(() => onOpenChange(false), 2600);
        return;
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
    toast.error("We could not verify the payment yet. Reopen this page from Dodo's return link to retry safely.");
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
      .from("featured_waitlist")
      .insert({ startup_id: startupId, user_id: u.user!.id });
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

  const gold = "oklch(0.72 0.13 75)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88svh] max-w-lg flex-col overflow-hidden border-black/10 p-0">
        {/* Header band */}
        <div className="relative shrink-0 border-b border-black/8 bg-[linear-gradient(180deg,oklch(0.72_0.13_75_/_0.10),transparent)] px-6 pb-4 pt-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: `linear-gradient(90deg,transparent,${gold},transparent)` }}
          />
          <DialogHeader className="space-y-1">
            <span className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[oklch(0.55_0.11_75)]">
              <Sparkles className="h-3.5 w-3.5" /> Featured placement
            </span>
            <DialogTitle
              className="text-[22px] font-normal leading-tight text-black"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
            >
              Feature your startup
            </DialogTitle>
            <p className="text-[12.5px] leading-snug text-black/50">
              A spot on the network sidebar — logo, name, founder and one-liner. Billed monthly.
            </p>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6">

          {phase === "loading" && (
            <div className="flex items-center justify-center py-14 text-black/30">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {phase === "signin" && (
            <div className="space-y-4 py-5">
              <p className="text-sm leading-relaxed text-black/60">
                Featured slots are for network members. Sign in to book one.
              </p>
              <button
                onClick={goSignIn}
                className="w-full rounded-lg bg-black py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Sign in
              </button>
            </div>
          )}

          {phase === "no-startup" && (
            <div className="space-y-4 py-5">
              <p className="text-sm leading-relaxed text-black/60">
                Featured slots are available to approved network members. Add your startup first,
                then come back to book a slot.
              </p>
              <Link
                to="/apply"
                onClick={() => onOpenChange(false)}
                className="block w-full rounded-lg bg-black py-3 text-center text-sm font-medium text-white"
              >
                Apply to the network
              </Link>
            </div>
          )}

          {(phase === "choose" || phase === "waitlist") && startups.length > 1 && (
            <div className="space-y-2.5 pt-5">
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-black/35">
                Startup
              </span>
              <div className="flex flex-col gap-2">
                {startups.map((s) => {
                  const active = startupId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setStartupId(s.id)}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                        active
                          ? "border-[oklch(0.72_0.13_75_/_0.6)] bg-[oklch(0.72_0.13_75_/_0.07)] shadow-[0_1px_0_rgba(0,0,0,0.02)]"
                          : "border-black/10 hover:border-black/25"
                      }`}
                    >
                      <StartupFavicon url={s.website_url} name={s.name} logoUrl={s.logo_url} size={22} />
                      <span className="truncate font-medium text-black">{s.name}</span>
                      {active && (
                        <Check className="ml-auto h-4 w-4 shrink-0 text-[oklch(0.6_0.12_75)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {phase === "choose" && (
            <div className="space-y-5 pt-5">
              <div className="space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-black/35">
                    Pick a slot
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-black/25">
                    {FEATURED_SLOT_COUNT - slots.length} of {FEATURED_SLOT_COUNT} open
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {(["left", "right"] as const).map((side) => (
                    <div key={side} className="space-y-1.5">
                      <span className="block text-[9px] uppercase tracking-[0.2em] text-black/25">
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
                            className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all ${
                              booked
                                ? "cursor-not-allowed border-black/6 bg-black/[0.025] text-black/30"
                                : active
                                  ? "border-[oklch(0.72_0.13_75)] bg-[oklch(0.72_0.13_75_/_0.09)] text-black shadow-[0_0_0_3px_oklch(0.72_0.13_75_/_0.10)]"
                                  : "border-black/10 text-black/55 hover:border-black/30 hover:bg-black/[0.015]"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                booked
                                  ? "bg-black/15"
                                  : active
                                    ? "bg-[oklch(0.68_0.13_75)]"
                                    : "bg-black/20"
                              }`}
                            />
                            <span className="min-w-0">
                              <span className="block text-xs font-medium leading-tight">
                                Slot {i}
                              </span>
                              <span className="block text-[10px] leading-tight opacity-70">
                                {booked ? `Free in ${daysLeft(booked.expires_at)}d` : "Available"}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[oklch(0.72_0.13_75_/_0.35)] bg-[linear-gradient(135deg,oklch(0.72_0.13_75_/_0.10),oklch(0.72_0.13_75_/_0.03))] px-4 py-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-black">Monthly subscription</span>
                  <span className="flex items-baseline gap-1">
                    <span className="text-2xl font-semibold tracking-tight text-black">
                      ${FEATURED_PRICE_USD}
                    </span>
                    <span className="text-xs text-black/45">/month</span>
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-black/45">
                  Renews automatically every {FEATURED_DAYS} days. Cancel anytime — your slot stays
                  live until the end of the paid period.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={startCheckout}
                  disabled={busy || !slot}
                  className="w-full rounded-lg bg-black py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-35"
                >
                  {busy
                    ? "Redirecting to payment…"
                    : slot
                      ? `Subscribe — slot ${slot} · $${FEATURED_PRICE_USD}/mo`
                      : "Select a slot"}
                </button>
                <p className="text-center text-[11px] leading-relaxed text-black/35">
                  Featured placement is presentation only. It never changes widget delivery,
                  impressions or clicks.
                </p>
              </div>
            </div>
          )}

          {phase === "waitlist" && (
            <div className="space-y-4 pt-5">
              <p className="text-sm leading-relaxed text-black/60">
                All {FEATURED_SLOT_COUNT} slots are booked right now. Join the waitlist and we'll
                email you the moment one frees up. No payment is taken today.
              </p>
              <button
                onClick={joinWaitlist}
                disabled={busy || !startupId}
                className="w-full rounded-lg bg-black py-3 text-sm font-medium text-white disabled:opacity-40"
              >
                {busy ? "Joining…" : "Join the waitlist"}
              </button>
            </div>
          )}

          {phase === "verifying" && (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-black/30" />
              <p className="text-sm text-black/55">Confirming your subscription…</p>
            </div>
          )}

          {phase === "success" && (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-[oklch(0.72_0.13_75_/_0.14)] shadow-[0_0_0_8px_oklch(0.72_0.13_75_/_0.06)]">
                <Check className="h-8 w-8 animate-[scale-in_0.3s_ease-out] text-[oklch(0.6_0.13_75)]" />
              </span>
              <p
                className="text-xl text-black"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
              >
                You&apos;re live in slot {wonSlot}
              </p>
              <p className="text-sm text-black/45">
                Renews every {FEATURED_DAYS} days at ${FEATURED_PRICE_USD}.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


/** Mounted once per layout: reopens the dialog after returning from payment. */
export function FeaturedReturnWatcher() {
  const [open, setOpen] = useState(false);
  return <FeaturedBookingDialog open={open} onOpenChange={setOpen} watchReturn />;
}

/** Gold "Promote" pill that opens the booking dialog for one startup. */
export function PromoteButton({ startupId, className = "" }: { startupId: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.72_0.13_75_/_0.5)] bg-[oklch(0.72_0.13_75_/_0.08)] px-3 py-1.5 text-xs font-medium text-[oklch(0.5_0.11_75)] transition-colors hover:bg-[oklch(0.72_0.13_75_/_0.16)] ${className}`}
      >
        <Sparkles className="h-3.5 w-3.5" /> Promote
      </button>
      <FeaturedBookingDialog open={open} onOpenChange={setOpen} preselectStartupId={startupId} />
    </>
  );
}
