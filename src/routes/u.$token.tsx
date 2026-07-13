import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Check, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/u/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Unsubscribe · StartupBar" },
      { name: "description", content: "Manage your StartupBar email preferences." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: UnsubscribePage,
});

type State =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "confirm"; email: string }
  | { kind: "done"; email: string; unsubscribed: boolean }
  | { kind: "error"; message: string };

function UnsubscribePage() {
  const { token } = Route.useParams();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/unsubscribe?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          if (cancelled) return;
          setState({ kind: "invalid" });
          return;
        }
        const json = (await res.json()) as { email: string; unsubscribed: boolean };
        if (cancelled) return;
        setState(
          json.unsubscribed
            ? { kind: "done", email: json.email, unsubscribed: true }
            : { kind: "confirm", email: json.email },
        );
      } catch {
        if (!cancelled) setState({ kind: "error", message: "Network error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function mutate(action: "unsubscribe" | "resubscribe") {
    setBusy(true);
    try {
      const res = await fetch(`/api/public/unsubscribe?token=${encodeURIComponent(token)}&action=${action}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Request failed");
      const json = (await res.json()) as { email: string; unsubscribed: boolean };
      setState({ kind: "done", email: json.email, unsubscribed: json.unsubscribed });
    } catch (e) {
      setState({ kind: "error", message: String(e).slice(0, 200) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#f7f7f6] flex flex-col">
      <header className="border-b border-black/8 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center gap-2">
          <div className="h-2 w-6 rounded-sm bg-black" />
          <Link to="/" className="text-sm font-semibold tracking-tight text-black">StartupBar</Link>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-black/8 bg-white p-8 shadow-sm">
          {state.kind === "loading" && (
            <div className="flex items-center gap-2 text-sm text-black/60">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}

          {state.kind === "invalid" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-black">
                <AlertTriangle className="h-5 w-5" />
                <h1 className="text-lg font-semibold">Link expired or invalid</h1>
              </div>
              <p className="text-sm text-black/60">
                This unsubscribe link isn't valid. If you keep getting emails you didn't want, reply to any StartupBar email and we'll take you off the list manually.
              </p>
            </div>
          )}

          {state.kind === "error" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-black">
                <AlertTriangle className="h-5 w-5" />
                <h1 className="text-lg font-semibold">Something went wrong</h1>
              </div>
              <p className="text-sm text-black/60">{state.message}</p>
            </div>
          )}

          {state.kind === "confirm" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-black">Unsubscribe from StartupBar updates?</h1>
                <p className="mt-2 text-sm text-black/60">
                  We'll stop sending marketing emails and the weekly stats digest to{" "}
                  <span className="font-medium text-black">{state.email}</span>.
                </p>
              </div>
              <div className="rounded-lg border border-black/8 bg-[#faf9f7] px-4 py-3 text-xs text-black/60 leading-relaxed">
                You'll still receive important account emails — application approvals, rejections, warnings, and payment receipts.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => mutate("unsubscribe")}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/85 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Unsubscribe
                </button>
                <Link
                  to="/"
                  className="inline-flex items-center rounded-lg border border-black/12 px-4 py-2 text-sm text-black/70 hover:bg-black/5"
                >
                  Keep me subscribed
                </Link>
              </div>
            </div>
          )}

          {state.kind === "done" && state.unsubscribed && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-black">
                <Check className="h-5 w-5" />
                <h1 className="text-lg font-semibold">You've been unsubscribed</h1>
              </div>
              <p className="text-sm text-black/60">
                <span className="font-medium text-black">{state.email}</span> won't get marketing emails or the weekly digest from StartupBar anymore. Important account emails will still be sent.
              </p>
              <button
                onClick={() => mutate("resubscribe")}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/12 px-3 py-1.5 text-xs font-medium text-black/70 hover:bg-black/5 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Changed your mind? Resubscribe
              </button>
            </div>
          )}

          {state.kind === "done" && !state.unsubscribed && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-black">
                <Check className="h-5 w-5" />
                <h1 className="text-lg font-semibold">You're subscribed again</h1>
              </div>
              <p className="text-sm text-black/60">
                <span className="font-medium text-black">{state.email}</span> will receive StartupBar updates going forward.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
