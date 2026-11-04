import { useEffect, useState } from "react";
import { Check, Mail, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Details = {
  startupId: string; name: string; url: string; desc: string; category: string; placement: "top" | "bottom";
  validate: () => string | null;
};

export function detectInAppBrowser(ua: string): string | null {
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook";
  if (/LinkedInApp/i.test(ua)) return "LinkedIn";
  if (/Twitter|TwitterAndroid/i.test(ua)) return "X";
  if (/musical_ly|TikTok|BytedanceWebview/i.test(ua)) return "TikTok";
  return null;
}

/** Guest-only: emails the install snippet + a resume link so founders can finish on desktop. */
export function EmailSnippetHandoff(props: Details) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [inApp, setInApp] = useState<string | null>(null);
  const [hideTip, setHideTip] = useState(false);
  useEffect(() => { setInApp(detectInAppBrowser(navigator.userAgent)); }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const invalid = props.validate();
    if (invalid) { setError(invalid); return; }
    if (!/^\S+@\S+\.\S{2,}$/.test(email.trim())) { setError("Enter a valid email"); return; }
    setState("sending");
    const { data, error: err } = await supabase.functions.invoke("send-email", {
      body: { type: "save-snippet", data: { email: email.trim(), startupId: props.startupId, name: props.name, url: props.url, desc: props.desc, category: props.category, placement: props.placement } },
    });
    if (err || data?.error) {
      let msg = data?.error as string | undefined;
      try { msg ??= (await (err as { context?: Response })?.context?.json())?.error; } catch { /* ignore */ }
      setError(msg ?? "Couldn't send right now. Try again.");
      setState("idle");
      return;
    }
    setState("sent");
  }

  return (
    <div className="space-y-3">
      {inApp && !hideTip && (
        <div className="flex items-start gap-2 rounded-lg border border-header-ink/10 bg-header-ink/[0.03] p-3 text-xs leading-relaxed text-header-ink/70">
          <span className="flex-1">Browsing inside {inApp}? Tap <strong>•••</strong> and choose <strong>Open in browser</strong>, or email yourself the setup below.</span>
          <button type="button" aria-label="Dismiss tip" onClick={() => setHideTip(true)} className="text-header-ink/40 hover:text-header-ink"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      <div className="rounded-xl border border-header-ink/10 p-4">
        {state === "sent" ? (
          <div className="flex items-start gap-3" role="status">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-header-ink text-header-surface"><Check className="h-3.5 w-3.5" /></span>
            <div>
              <p className="text-sm font-semibold text-header-ink">We sent your snippet to {email.trim()}</p>
              <p className="mt-1 text-xs leading-relaxed text-header-ink/55">Open it on your laptop at your code editor. Your details are saved, so you can install and finish in 30 seconds.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={send} noValidate>
            <p className="flex items-center gap-2 text-sm font-semibold text-header-ink"><Mail className="h-4 w-4" />On your phone or away from your desk?</p>
            <p className="mt-1 text-xs leading-relaxed text-header-ink/55">We'll email your snippet and a 1-click link to finish on desktop. No sign-in needed now.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input type="email" inputMode="email" autoComplete="email" placeholder="you@startup.com" aria-label="Your email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
              <Button type="submit" variant="outline" disabled={state === "sending"} className="h-10 shrink-0">
                {state === "sending" ? "Sending…" : "Email me my snippet"}
              </Button>
            </div>
            {error && <p className="mt-2 text-xs text-destructive" role="alert">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
