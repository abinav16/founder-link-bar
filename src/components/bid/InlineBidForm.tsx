import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BID_MIN_CENTS, BID_STEP_CENTS, formatUsd, normalizeBidUrl, type BidEntry } from "@/lib/bid";
import { ArrowRight, Loader2 } from "lucide-react";

/** Minimum additional cents needed to land at `targetRank` given the live board
 *  and the user's existing entry (if any). */
function suggestedForRank(
  others: BidEntry[],
  existingTotal: number,
  targetRank: number,
): number {
  // To place at `targetRank`, the bidder must beat the entry currently sitting
  // at that rank among the *other* entries (i.e. exclude self). If there are
  // fewer entries than targetRank-1 ahead, the minimum bid is enough.
  const toBeat = others[targetRank - 1];
  if (!toBeat) {
    return Math.max(BID_MIN_CENTS - existingTotal, BID_MIN_CENTS);
  }
  const neededTotal = toBeat.total_cents + BID_STEP_CENTS;
  return Math.max(neededTotal - existingTotal, BID_MIN_CENTS);
}

/** Inline bid form for the hero — no popup: enter site, pick amount, go to checkout. */
export function InlineBidForm({ board }: { board: BidEntry[] }) {
  const [url, setUrl] = useState("");
  const [dollars, setDollars] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myStartups, setMyStartups] = useState<{ name: string; website_url: string }[]>([]);
  const [flash, setFlash] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const urlRef = useRef<HTMLInputElement | null>(null);

  // "Outbid" buttons on the board dispatch this event with the amount needed.
  useEffect(() => {
    function onOutbid(e: Event) {
      const cents = (e as CustomEvent<{ cents: number }>).detail?.cents;
      if (typeof cents === "number") setDollars(String(Math.ceil(cents / 100)));
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlash(true);
      window.setTimeout(() => urlRef.current?.focus({ preventScroll: true }), 350);
      window.setTimeout(() => setFlash(false), 2000);
    }
    window.addEventListener("sb:outbid", onOutbid as EventListener);
    return () => window.removeEventListener("sb:outbid", onOutbid as EventListener);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid || cancelled) return;
      const { data: rows } = await supabase
        .from("startups")
        .select("name, website_url")
        .eq("user_id", uid);
      if (!cancelled) setMyStartups(rows ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const target = useMemo(() => normalizeBidUrl(url), [url]);
  const amountCents = Math.round(Number(dollars || 0) * 100);

  const existing = useMemo(
    () => (target.ok ? board.find((b) => b.url_key === target.urlKey) : undefined),
    [board, target],
  );

  // Other entries (excluding the bidder's own), sorted by total desc.
  const others = useMemo(
    () =>
      board
        .filter((b) => b.url_key !== target.urlKey)
        .sort((a, b) => b.total_cents - a.total_cents),
    [board, target],
  );

  const projected = useMemo(() => {
    if (!target.ok || amountCents < BID_MIN_CENTS) return null;
    const newTotal = (existing?.total_cents ?? 0) + amountCents;
    const above = others.filter((b) => b.total_cents >= newTotal).length;
    return { newTotal, rank: above + 1 };
  }, [others, target, amountCents, existing]);

  // Suggested amounts to claim ranks #1–#4, based on the live board.
  const suggestions = useMemo(() => {
    const existingTotal = existing?.total_cents ?? 0;
    return [1, 2, 3, 4].map((rank) => ({
      rank,
      cents: suggestedForRank(others, existingTotal, rank),
    }));
  }, [others, existing]);

  // When the user has not typed an amount, default the projection pills to the
  // rank they'd get for each suggestion. Once they type, highlight the matching pill.
  const activeSuggestion = useMemo(() => {
    if (!dollars) return null;
    return suggestions.find((s) => s.cents === amountCents) ?? null;
  }, [suggestions, amountCents, dollars]);

  async function submit() {
    setError(null);
    if (!target.ok) {
      setError("Enter a valid website (example.com) or an @handle.");
      return;
    }
    if (!Number.isFinite(amountCents) || amountCents < BID_MIN_CENTS) {
      setError("Minimum bid is $5.");
      return;
    }
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch("/api/public/bid-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          url,
          amount_cents: amountCents,
          name: existing?.name || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.payment_link) {
        setError(json?.error ?? "Could not start the checkout. Please try again.");
        setBusy(false);
        return;
      }
      window.location.href = json.payment_link;
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div ref={rootRef} id="bid-form" className="mx-auto mt-6 w-full max-w-xl scroll-mt-28 text-left">
      <div
        className={`flex flex-col gap-2 rounded-3xl border bg-white p-2 transition-all duration-300 sm:flex-row sm:items-center sm:rounded-full ${
          flash
            ? "border-black shadow-[0_0_0_4px_rgba(0,0,0,0.10)]"
            : "border-black/[0.09] shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
        }`}
      >
        <input
          ref={urlRef}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="yoursite.com or @handle"
          aria-label="Your site or handle"
          className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-[15px] text-black outline-none placeholder:text-black/30 sm:px-5 sm:text-sm"
        />
        <div className="flex items-center gap-2">
          <div className="flex w-[92px] shrink-0 items-center rounded-full border border-black/10 px-3 sm:w-[116px]">
            <span className="text-sm text-black/40">$</span>
            <input
              value={dollars}
              onChange={(e) => setDollars(e.target.value.replace(/[^0-9.]/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              inputMode="decimal"
              aria-label="Bid amount in USD"
              placeholder="5"
              className="w-full min-w-0 bg-transparent py-2 pl-1.5 text-[15px] text-black outline-none placeholder:text-black/25 sm:text-sm"
            />
          </div>
          {projected && (
            <span className="hidden whitespace-nowrap rounded-full bg-black/[0.06] px-2.5 py-1 text-[11px] font-medium text-black/70 sm:inline">
              → #{projected.rank}
            </span>
          )}
          <button
            onClick={submit}
            disabled={busy}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white sm:px-6 transition-opacity hover:opacity-85 disabled:opacity-50 sm:flex-none"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Place bid
            {!busy && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {projected && (
        <div className="mt-2 flex items-center justify-center gap-1.5 sm:hidden">
          <span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-[11px] font-medium text-black/70">
            → lands at #{projected.rank}
          </span>
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
        {suggestions.map(({ rank, cents }) => {
          const isMatch = activeSuggestion?.rank === rank || amountCents === cents;
          return (
            <button
              key={rank}
              onClick={() => setDollars(String(Math.ceil(cents / 100)))}
              className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                isMatch
                  ? "border-black bg-black text-white"
                  : "border-black/12 text-black/55 hover:border-black/35 hover:text-black"
              }`}
              title={`Bid ${formatUsd(cents)} to take rank #${rank}`}
            >
              <span className="text-black/40">#</span>
              {rank} · {formatUsd(cents)}
            </button>
          );
        })}
      </div>

      {myStartups.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          <span className="text-[11px] text-black/35">Your startups:</span>
          {myStartups.map((s) => (
            <button
              key={s.website_url}
              onClick={() => setUrl(s.website_url)}
              className="rounded-full border border-black/12 px-2.5 py-1 text-[11px] text-black/60 transition-colors hover:border-black/40 hover:text-black"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <p className="mt-2.5 text-center text-[12px] text-black/45">
        {error ? (
          <span className="text-red-600">{error}</span>
        ) : existing && projected ? (
          <>
            Already #{existing.rank} with {formatUsd(existing.total_cents)} — this stacks to{" "}
            <span className="font-semibold text-black">#{projected.rank}</span> at{" "}
            {formatUsd(projected.newTotal)}.
          </>
        ) : projected ? (
          <>
            {formatUsd(amountCents)} lands you at{" "}
            <span className="font-semibold text-black">#{projected.rank}</span> — name, logo and
            description are pulled automatically from your site.
          </>
        ) : (
          <>
            Enter an amount to see where you'll place. The pills show what each rank costs right now.
            Minimum $5.
          </>
        )}
      </p>
    </div>
  );
}
