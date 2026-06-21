import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, ExternalLink, LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — StartupBar" }] }),
  component: Dashboard,
});

interface Startup {
  id: string;
  name: string;
  website_url: string;
  description: string;
  status: "pending" | "approved" | "rejected";
}

function Dashboard() {
  const navigate = useNavigate();
  const [startup, setStartup] = useState<Startup | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ impressions: 0, clicks: 0 });
  const [current, setCurrent] = useState<Startup | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("startups")
        .select("*")
        .eq("user_id", u.user.id)
        .maybeSingle();
      setStartup((data as Startup | null) ?? null);
      if (data) {
        const [{ count: impCount }, { count: clkCount }] = await Promise.all([
          supabase.from("impressions").select("*", { count: "exact", head: true }).eq("shown_startup_id", data.id),
          supabase.from("clicks").select("*", { count: "exact", head: true }).eq("shown_startup_id", data.id),
        ]);
        setStats({ impressions: impCount ?? 0, clicks: clkCount ?? 0 });
        // Currently showing
        try {
          const res = await fetch(`/api/public/widget/pick?host=${data.id}`);
          if (res.ok) setCurrent(await res.json());
        } catch {/* ignore */}
      }
      setLoading(false);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://startupbar.co";
  const snippet = startup
    ? `<script async src="${origin}/widget/loader.js" data-startup-id="${startup.id}"></script>`
    : "";

  function copy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-2 w-6 rounded-sm bg-primary" />
            <span className="font-semibold">StartupBar</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : !startup ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <h2 className="text-xl font-semibold">No application yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Submit your startup to join the network.</p>
            <Button asChild className="mt-6"><Link to="/apply">Apply now</Link></Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-medium tracking-tight" style={{ fontFamily: "var(--font-display)" }}>{startup.name}</h1>
                <p className="text-sm text-muted-foreground">{startup.description}</p>
              </div>
              <StatusBadge status={startup.status} />
            </div>

            {startup.status === "pending" && (
              <div className="mt-6 rounded-md border border-amber-500/30 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
                Your application is under review. You'll be able to install the bar once approved.
              </div>
            )}

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Stat label="Impressions" value={stats.impressions} hint="Times your startup was shown" />
              <Stat label="Clicks" value={stats.clicks} hint="Visits driven to your site" />
            </div>

            <Card className="mt-8 p-6">
              <h2 className="font-semibold">Your embed script</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Paste this once inside the <code className="rounded bg-muted px-1 py-0.5 text-xs">&lt;head&gt;</code> of your site.
              </p>
              <div className="mt-4 overflow-x-auto rounded-md border border-border bg-muted/40 p-4 font-mono text-xs">
                {snippet}
              </div>
              <Button onClick={copy} variant="outline" size="sm" className="mt-4" disabled={startup.status !== "approved"}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {startup.status === "approved" ? "Copy script" : "Available after approval"}
              </Button>
            </Card>

            <Card className="mt-6 p-6">
              <h2 className="font-semibold">Currently showing on your site</h2>
              {current ? (
                <div className="mt-4 flex items-center gap-3 rounded-md border border-border bg-card p-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{current.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{current.description}</div>
                  </div>
                  <a href={current.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
                    Visit <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  {startup.status === "approved" ? "No partner shown yet — check back soon." : "Will appear once your startup is approved."}
                </p>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <Card className="p-6">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-4xl font-semibold tracking-tight">{value.toLocaleString()}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </Card>
  );
}

function StatusBadge({ status }: { status: Startup["status"] }) {
  const map = {
    pending: { label: "Pending review", className: "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-200" },
    approved: { label: "Approved", className: "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200" },
    rejected: { label: "Not approved", className: "bg-red-100 text-red-900 border-red-200" },
  } as const;
  const s = map[status];
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}
