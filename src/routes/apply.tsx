import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StartupFavicon } from "@/components/StartupFavicon";
import {
  ArrowRight, ArrowLeft, ExternalLink,
  Copy, Check, CheckCircle2, XCircle, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/apply")({
  head: () => ({
    meta: [
      { title: "Apply — StartupBar" },
      { name: "description", content: "Submit your startup to join the StartupBar network. Get featured on other founders' sites and grow together through free traffic exchange." },
      { property: "og:title", content: "Apply — StartupBar" },
      { property: "og:description", content: "Submit your startup to join the StartupBar network and get featured on other founders' sites." },
    ],
    links: [{ rel: "canonical", href: "/apply" }],
  }),
  ssr: false,
  component: Apply,
});

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  website_url: z.string().trim().url().max(200),
  description: z.string().trim().min(10).max(100),
});

function BarPreview({ name, url, desc }: { name: string; url: string; desc: string }) {
  const displayName = name || "Your Startup";
  const displayDesc = desc || "Your one-liner goes here";
  const favicon = url ? `https://www.google.com/s2/favicons?domain=${url}&sz=32` : null;
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]">
      <div className="flex h-8 items-center gap-1.5 border-b border-black/6 bg-black/[0.02] px-3">
        <div className="h-2 w-2 rounded-full bg-red-400/70" />
        <div className="h-2 w-2 rounded-full bg-yellow-400/70" />
        <div className="h-2 w-2 rounded-full bg-green-400/70" />
        <div className="ml-2 text-[10px] text-black/25">somefounder.com</div>
      </div>
      <div className="flex h-9 items-center gap-2.5 border-b border-black/6 bg-white px-4">
        <span className="rounded-sm bg-black px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-white">STARTUPBAR</span>
        {favicon && <img src={favicon} alt="" className="h-4 w-4 rounded-sm object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />}
        <span className="text-[13px] font-medium text-black">{displayName}</span>
        <span className="hidden truncate text-[12px] text-black/40 sm:block">— {displayDesc}</span>
        <span className="ml-auto flex items-center gap-1 text-[12px] text-black/50">Visit <ExternalLink className="h-3 w-3" /></span>
      </div>
      <div className="space-y-2 px-4 py-6">
        <div className="h-3 w-2/3 rounded-full bg-black/5" />
        <div className="h-3 w-1/2 rounded-full bg-black/5" />
        <div className="mt-4 h-3 w-full rounded-full bg-black/5" />
        <div className="h-3 w-5/6 rounded-full bg-black/5" />
        <div className="h-3 w-4/6 rounded-full bg-black/5" />
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-black">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-black/40">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-black/12 bg-white px-4 py-3 text-sm text-black placeholder:text-black/25 outline-none ring-0 transition focus:border-black/30 focus:ring-2 focus:ring-black/8";

const DRAFT_KEY = "startupbar:apply-draft";

function readDraft(): { step: 1 | 2; name: string; url: string; desc: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      step: parsed.step === 2 ? 2 : 1,
      name: parsed.name ?? "",
      url: parsed.url ?? "",
      desc: parsed.desc ?? "",
    };
  } catch { return null; }
}

function readInitialFromUrl() {
  if (typeof window === "undefined") return { step: 1 as 1 | 2, name: "", url: "", desc: "", paid: false, paymentId: "" };
  const p = new URLSearchParams(window.location.search);
  if (p.get("paid") === "true") {
    return {
      step: 2 as 1 | 2,
      name: p.get("name") ?? "",
      url: p.get("url") ?? "",
      desc: p.get("desc") ?? "",
      paid: true,
      paymentId: p.get("payment_id") ?? "",
    };
  }
  const draft = readDraft();
  if (draft) {
    return { step: draft.step, name: draft.name, url: draft.url, desc: draft.desc, paid: false, paymentId: "" };
  }
  return { step: 1 as 1 | 2, name: "", url: "", desc: "", paid: false, paymentId: "" };
}

function Apply() {
  const navigate = useNavigate();
  const initial = (typeof window !== "undefined" ? readInitialFromUrl() : { step: 1 as 1 | 2, name: "", url: "", desc: "", paid: false, paymentId: "" });
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [step, setStep] = useState<1 | 2>(initial.step);
  const [name, setName] = useState(initial.name);
  const [url, setUrl] = useState(initial.url);
  const [desc, setDesc] = useState(initial.desc);
  const [startupId] = useState(() => crypto.randomUUID());
  const [copied, setCopied] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "checking" | "found" | "not-found" | "error">("idle");
  const [verifyMsg, setVerifyMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingCount, setExistingCount] = useState(0);
  const [hasPrepaid, setHasPrepaid] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(initial.paid && !!initial.paymentId);
  const [autoSubmitPending, setAutoSubmitPending] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  // Never allow step 2 without an authenticated session — it gates the script + submission.
  useEffect(() => {
    if (authed === false && step === 2) setStep(1);
  }, [authed, step]);

  async function refreshGateData(userId: string) {
    const [{ count }, { data: prepaid }] = await Promise.all([
      supabase.from("startups").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("payments").select("id").eq("user_id", userId).eq("status", "succeeded").is("consumed_at", null).limit(1),
    ]);
    setExistingCount(count ?? 0);
    setHasPrepaid((prepaid?.length ?? 0) > 0);
  }

  useEffect(() => {
    if (!authed) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) refreshGateData(data.user.id);
    });
  }, [authed]);

  // Verify payment server-side once on return from Dodo, then auto-submit.
  useEffect(() => {
    if (!initial.paid) return;
    if (!initial.paymentId) {
      window.history.replaceState({}, "", "/apply");
      setVerifyingPayment(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke("verify-dodo-payment", {
        body: { payment_id: initial.paymentId },
      });
      if (cancelled) return;
      if (error || !data?.ok) {
        toast.error("We couldn't verify your payment. Please contact support.");
        setVerifyingPayment(false);
        window.history.replaceState({}, "", "/apply");
        return;
      }
      const { data: u } = await supabase.auth.getUser();
      if (u.user) await refreshGateData(u.user.id);
      window.history.replaceState({}, "", "/apply");
      setVerifyingPayment(false);
      setAutoSubmitPending(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After payment is verified and gate data refreshed, auto-submit the application.
  useEffect(() => {
    if (!autoSubmitPending) return;
    if (!hasPrepaid) return;
    if (loading) return;
    setAutoSubmitPending(false);
    onSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmitPending, hasPrepaid]);

  // Persist draft so the form survives the sign-in round-trip.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!name && !url && !desc) return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step, name, url, desc }));
  }, [step, name, url, desc]);

  const snippet = `<script async src="https://startupbar.co/widget/loader.js" data-startup-id="${startupId}"></script>`;

  function copySnippet() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function goToStep2(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ name, website_url: url, description: desc });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    if (!authed) {
      // Save draft at step 1 — user must sign in before reaching the install step.
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step: 1, name, url, desc }));
      sessionStorage.setItem("startupbar:auth-next", "/apply");
      navigate({ to: "/auth" });
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handlePayment() {
    setPaymentLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const returnUrl = `${window.location.origin}/apply?paid=true&name=${encodeURIComponent(name)}&url=${encodeURIComponent(url)}&desc=${encodeURIComponent(desc)}`;
    const { data, error } = await supabase.functions.invoke("create-dodo-checkout", {
      body: { email: u.user?.email, name: u.user?.user_metadata?.full_name, return_url: returnUrl },
    });
    setPaymentLoading(false);
    if (error || !data?.payment_link) {
      toast.error("Could not create payment session. Please try again.");
      return;
    }
    window.location.href = data.payment_link;
  }


  async function checkInstallation() {
    setVerifyStatus("checking");
    setVerifyMsg("");
    try {
      const res = await fetch(`/api/public/verify-install?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      if (json.installed) {
        setVerifyStatus("found");
        setVerifyMsg("Script detected on your site!");
      } else if (json.error) {
        setVerifyStatus("error");
        setVerifyMsg(json.error);
      } else {
        setVerifyStatus("not-found");
        setVerifyMsg("Not found yet — paste it in your <head> and try again.");
      }
    } catch {
      setVerifyStatus("error");
      setVerifyMsg("Could not reach verification service.");
    }
  }

  async function onSubmit() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData.user?.id;
    if (!user_id) { navigate({ to: "/auth" }); return; }

    const parsed = schema.parse({ name, website_url: url, description: desc });

    // If this is a paid additional listing, atomically consume one prepaid slot first.
    if (existingCount >= 1) {
      const { data: consumedId, error: consumeErr } = await supabase.rpc(
        "consume_prepaid_listing",
        { _user_id: user_id },
      );
      if (consumeErr || !consumedId) {
        setLoading(false);
        toast.error("No prepaid listing available. Please complete payment.");
        return;
      }
    }

    const { error } = await supabase.from("startups").insert(
      { id: startupId, user_id, ...parsed }
    );
    setLoading(false);
    if (error) { toast.error(error.message); return; }

    supabase.functions.invoke("send-email", { body: { type: "startup-submitted", data: { email: userData.user!.email, name: userData.user!.user_metadata?.full_name ?? "", startupName: parsed.name } } }).catch(() => {});
    supabase.functions.invoke("send-email", { body: { type: "admin-new-application", data: { startupName: parsed.name, startupUrl: parsed.website_url, description: parsed.description, applicantEmail: userData.user!.email } } }).catch(() => {});

    sessionStorage.removeItem(DRAFT_KEY);
    toast.success("Application submitted!");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b border-black/8">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-2 w-6 rounded-sm bg-black" />
            <span className="text-base font-semibold tracking-tight">StartupBar</span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${step === 1 ? "bg-black text-white" : "bg-black/10 text-black/50"}`}>1</span>
            <span className="text-black/20">—</span>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${step === 2 ? "bg-black text-white" : "bg-black/10 text-black/30"}`}>2</span>
          </div>

          {authed ? (
            <Link to="/dashboard" className="text-sm text-black/40 hover:text-black transition-colors">Dashboard →</Link>
          ) : (
            <Link to="/auth" className="text-sm text-black/40 hover:text-black transition-colors">
              <span className="hidden sm:inline">Already a member? </span>Sign in
            </Link>
          )}
        </div>
      </header>

      {step === 1 && (
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-14">
          <div className="grid gap-10 md:grid-cols-2 md:gap-24">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-black/35">Step 1 of 2</span>
              <h1 className="mt-4 text-3xl font-medium leading-tight tracking-tight sm:text-4xl md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
                Your startup details.
              </h1>
              <p className="mt-4 text-[15px] leading-relaxed text-black/45">
                Tell us about your product. We review every application within 24 hours.
              </p>

              {authed === false && (
                <div className="mt-6 rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-black/60">
                  You'll need an account to apply.{" "}
                  <Link to="/auth" className="font-medium text-black underline underline-offset-2">Sign in or create one →</Link>
                </div>
              )}

              <form onSubmit={goToStep2} className="mt-10 space-y-7">
                <Field label="Startup name" hint="The name shown in the bar across the network.">
                  <input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme AI" className={inputCls} />
                </Field>
                <Field label="Website URL" hint="Your homepage — where visitors land when they click.">
                  <input
                    required type="url" value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onBlur={() => {
                      const v = url.trim();
                      if (v && !v.startsWith("http://") && !v.startsWith("https://")) setUrl("https://" + v);
                    }}
                    placeholder="acme.ai" className={inputCls}
                  />
                </Field>
                <Field label="One-liner" hint="What your product does, in plain English. Max 100 chars.">
                  <textarea required maxLength={100} rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Turn meeting notes into action items, automatically." className={inputCls + " resize-none"} />
                  <div className="mt-1 text-right text-[11px] text-black/30">{desc.length} / 100</div>
                </Field>
                <button type="submit" className="group flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3.5 text-sm font-medium text-white transition-all hover:bg-black/80">
                  Next — Install the script
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <p className="text-center text-xs text-black/30">Free forever · We review within 24h · No commitment</p>
              </form>
            </div>

            <div className="hidden md:block">
              <div className="sticky top-10">
                <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-black/35">Live preview</span>
                <p className="mt-1.5 text-sm text-black/40">This is how your startup will appear on other founders' sites.</p>
                <div className="mt-5">
                  <BarPreview name={name} url={url} desc={desc} />
                </div>
                <div className="mt-8 space-y-4 border-t border-black/8 pt-8">
                  {["Your bar will show on sites across the network as soon as you're approved.", "In return, you'll show one other startup on your site — completely automatic.", "Cancel anytime by removing the script tag. No lock-in, no fees."].map((t) => (
                    <div key={t} className="flex items-start gap-3">
                      <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <p className="text-[13px] leading-relaxed text-black/45">{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {step === 2 && (

        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 md:py-16">
          <button onClick={() => setStep(1)} className="mb-8 flex items-center gap-1.5 text-sm text-black/40 hover:text-black transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>

          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-black/35">Step 2 of 2</span>
          <h1 className="mt-4 text-3xl font-medium leading-tight tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
            Install the script.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-black/45">
            Paste this once inside the <code className="rounded bg-black/8 px-1.5 py-0.5 font-mono text-sm">&lt;head&gt;</code> of your site, then verify it's live.
          </p>

          <div className="mt-8 flex items-center gap-3 rounded-xl border border-black/8 bg-black/[0.02] px-5 py-4">
            {url && <StartupFavicon url={url} name={name} size={20} className="rounded-sm" />}
            <div className="min-w-0">
              <p className="font-medium text-black">{name}</p>
              <p className="truncate text-xs text-black/40">{url}</p>
            </div>
            <button onClick={() => setStep(1)} className="ml-auto text-xs text-black/35 hover:text-black transition-colors">Edit</button>
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold text-black">Your embed code</p>
            <p className="mt-1 text-xs text-black/45">This is your unique startup ID — it won't change after you apply.</p>
            <div className="mt-3 rounded-xl border border-black/10 bg-black/[0.025]">
              <div className="flex items-center justify-between border-b border-black/8 px-4 py-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-black/30">HTML</span>
                <button onClick={copySnippet} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-black/50 hover:bg-black/8 hover:text-black transition-all">
                  {copied ? <><Check className="h-3.5 w-3.5 text-emerald-500" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                </button>
              </div>
              <div className="overflow-x-auto px-4 py-3">
                <pre className="text-[12px] font-mono text-black/60 whitespace-nowrap">{snippet}</pre>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-black/8 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-black">Verify installation</p>
                <p className="mt-0.5 text-xs text-black/40 truncate">We'll check if the script is live on <span className="font-medium text-black/60">{url}</span></p>
              </div>
              <button
                onClick={checkInstallation}
                disabled={verifyStatus === "checking"}
                className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-black/15 px-4 py-2 text-sm font-medium text-black hover:bg-black/[0.04] transition-all disabled:opacity-40"
              >
                {verifyStatus === "checking" ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…</> : "Check now"}
              </button>
            </div>

            {verifyStatus !== "idle" && verifyStatus !== "checking" && (
              <div className={`mt-4 flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm ${verifyStatus === "found" ? "bg-emerald-50 text-emerald-700" : verifyStatus === "not-found" ? "bg-amber-50 text-amber-700" : "bg-black/[0.03] text-black/50"}`}>
                {verifyStatus === "found" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>{verifyMsg}</span>
              </div>
            )}
          </div>

          <div className="mt-8 space-y-3">
            {(() => {
              const needsPayment = existingCount >= 1 && !hasPrepaid;
              const verified = verifyStatus === "found";
              const busy = loading || paymentLoading || verifyingPayment;
              const disabled = !verified || busy;
              const onClick = needsPayment ? handlePayment : onSubmit;
              const label = verifyingPayment
                ? "Verifying payment…"
                : loading
                ? "Submitting…"
                : paymentLoading
                ? "Redirecting to payment…"
                : needsPayment
                ? "Pay $9.99 & submit →"
                : "Submit application";
              return (
                <button
                  onClick={onClick}
                  disabled={disabled}
                  className="group flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3.5 text-sm font-medium text-white transition-all hover:bg-black/80 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {label}
                </button>
              );
            })()}
            <p className="text-center text-xs text-black/30">
              {verifyStatus !== "found"
                ? "Install the script and verify it's live to continue."
                : existingCount >= 1 && !hasPrepaid
                ? "Script verified ✓ — one-time $9.99 for additional listings."
                : "Script verified ✓ — you're all set."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
