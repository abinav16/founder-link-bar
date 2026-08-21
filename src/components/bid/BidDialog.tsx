import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BID_MIN_CENTS,
  formatUsd,
  normalizeBidUrl,
  priceToClaim,
  type BidEntry,
} from "@/lib/bid";
import { Loader2, X, ArrowRight } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  board: BidEntry[];
  /** Prefilled target, e.g. when a visitor clicks "Outbid" on a row. */
  initialUrl?: string;
  initialAmountCents?: number;
};

const PRESETS = [500, 1000, 2500, 5000, 10000];

export function BidDialog({ open, onClose, board, initialUrl, initialAmountCents }: Props) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [dollars, setDollars] = useState<string>(
    initialAmountCents ? String(initialAmountCents / 100) : "10",
  );
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myStartups, setMyStartups] = useState<{ name: string; website_url: string }[]>([]);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUrl(initialUrl ?? "");
    setDollars(initialAmountCents ? String(Math.ceil(initialAmountCents / 100)) : "10");
    setError(null);
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const uid = data.session?.user?.id;
      setSignedIn(Boolean(uid));
      if (!uid) return;
      const { data: rows } = await supabase
        .from("startups")
        .select("name, website_url")
        .eq("user_id", uid);
      if (!cancelled) setMyStartups(rows ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, initialUrl, initialAmountCents]);

  const target = useMemo(() => normalizeBidUrl(url), [url]);
  const amountCents = Math.round(Number(dollars || 0) * 100);

  const existing = useMemo(
    () => (target.ok ? board.find((b) => b.url_key === target.urlKey) : undefined),
    [board, target],
  );

  const projected = useMemo(() => {
    if (!target.ok || amountCents < BID_MIN_CENTS) return null;
    const newTotal = (existing?.total_cents ?? 0) + amountCents;
    const others = board.filter((b) => b.url_key !== target.urlKey);
    const above = others.filter((b) => b.total_cents >= newTotal).length;
    return { newTotal, rank: above + 1 };
  }, [board, target, amountCents, existing]);

  const toBeatTop = board[0] ? priceToClaim(board[0].total_cents) - (existing?.total_cents ?? 0) : BID_MIN_CENTS;

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
          name: name.trim() || existing?.name || undefined,
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/[0.08] bg-white/[0.025] p-6 text-white shadow-2xl sm:max-w-md sm:rounded-3xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-white/35 transition-colors hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-semibold tracking-tight">Place a bid</h2>
          <p className="mt-1 text-sm text-white/50">
            Bids are cumulative — every dollar you add stacks onto your total, forever.
          </p>
        </div>

        <label className="block text-[11px] font-medium uppercase tracking-wider text-white/40">
          Your site or @handle
        </label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yourstartup.com"
          autoFocus
          className="mt-2 w-full rounded-full border border-white/12 bg-white/[0.025] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/40"
        />

        {signedIn && myStartups.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="py-1 text-[11px] text-white/35">Your startups:</span>
            {myStartups.map((s) => (
              <button
                key={s.website_url}
                onClick={() => setUrl(s.website_url)}
                className="rounded-full border border-white/12 px-2.5 py-1 text-[11px] text-white/60 transition-colors hover:border-white/40 hover:text-white"
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {existing && (
          <p className="mt-2.5 text-[12px] text-white/50">
            Already on the board at <span className="font-medium text-white">#{existing.rank}</span>{" "}
            with <span className="font-medium text-white">{formatUsd(existing.total_cents)}</span>.
            Your new bid stacks on top.
          </p>
        )}

        <label className="mt-5 block text-[11px] font-medium uppercase tracking-wider text-white/40">
          Amount (USD)
        </label>
        <div className="mt-2 flex items-center rounded-full border border-white/12 bg-white/[0.025] px-4 focus-within:border-white/40">
          <span className="text-sm text-white/40">$</span>
          <input
            value={dollars}
            onChange={(e) => setDollars(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            className="w-full bg-transparent py-2.5 pl-1.5 text-sm text-white outline-none"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((cents) => (
            <button
              key={cents}
              onClick={() => setDollars(String(cents / 100))}
              className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                amountCents === cents
                  ? "border-white bg-white text-black"
                  : "border-white/12 text-white/60 hover:border-white/35"
              }`}
            >
              {formatUsd(cents)}
            </button>
          ))}
          {board[0] && toBeatTop > 0 && (
            <button
              onClick={() => setDollars(String(Math.ceil(toBeatTop / 100)))}
              className="rounded-full border border-white/25 px-3 py-1 text-[12px] text-white/70 transition-colors hover:bg-white/[0.06]"
            >
              Take #1 · {formatUsd(toBeatTop)}
            </button>
          )}
        </div>

        {!existing && target.ok && (
          <>
            <label className="mt-5 block text-[11px] font-medium uppercase tracking-wider text-white/40">
              Display name (optional)
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={target.name}
              className="mt-2 w-full rounded-full border border-white/12 bg-white/[0.025] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/40"
            />
          </>
        )}

        {projected && (
          <div className="mt-5 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-3">
            <p className="text-[13px] text-white/60">
              After this bid you land at{" "}
              <span className="font-semibold text-white">#{projected.rank}</span> with a total of{" "}
              <span className="font-semibold text-white">{formatUsd(projected.newTotal)}</span>.
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-full border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[12.5px] text-red-600">
            {error}
          </p>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-semibold text-black transition-opacity hover:opacity-85 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Continue to payment <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-white/35">
          No account needed. Secure checkout by Dodo Payments. Bids are final and non-refundable.
        </p>
      </div>
    </div>
  );
}

