import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Connect your assistant — StartupBar" },
    { name: "description", content: "Review and approve an assistant's secure access to your StartupBar account." },
    { property: "og:title", content: "Connect your assistant — StartupBar" },
    { property: "og:description", content: "Review secure assistant access to your StartupBar listings." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  validateSearch: (search: Record<string, unknown>) => ({ authorization_id: typeof search.authorization_id === "string" ? search.authorization_id : "" }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("This connection link is missing its authorization request. Start the connection again from your assistant.");
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) throw redirect({ href: `/auth?next=${encodeURIComponent(location.pathname + location.searchStr + location.hash)}` });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.searchStr).get("authorization_id");
    if (!id) throw new Error("Start the connection again from your assistant.");
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(id);
    if (error) throw new Error("This connection request is invalid or expired. Start the connection again from your assistant.");
    if (data && "redirect_url" in data && data.redirect_url) throw redirect({ href: data.redirect_url });
    const { data: session } = await supabase.auth.getSession();
    return { details: data, email: session.session?.user.email };
  },
  pendingComponent: () => <ConsentShell><p className="text-muted-foreground">Loading connection request…</p></ConsentShell>,
  errorComponent: ({ error }) => <ConsentShell><h1 className="text-2xl font-semibold">Connection unavailable</h1><p role="alert" className="mt-4 text-muted-foreground">{error instanceof Error ? error.message : "Please start the connection again from your assistant."}</p></ConsentShell>,
  component: ConsentPage,
});

function ConsentShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-background text-foreground"><SiteHeader /><main className="mx-auto w-full max-w-xl px-6 py-16 sm:py-24">{children}</main></div>;
}

function ConsentPage() {
  const { details, email } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!details || !("client" in details)) return <ConsentShell><p>Start the connection again from your assistant.</p></ConsentShell>;
  const client = details.client.name || "Your assistant";
  const scopes = details.scope.split(" ").filter(Boolean);
  async function decide(approve: boolean) {
    setBusy(true); setError("");
    try {
      const result = approve ? await supabase.auth.oauth.approveAuthorization(authorization_id) : await supabase.auth.oauth.denyAuthorization(authorization_id);
      if (result.error) throw result.error;
      if (!result.data?.redirect_url) throw new Error("The connection could not finish. Please try again.");
      window.location.assign(result.data.redirect_url);
    } catch { setError("The connection could not be updated. Please try again."); setBusy(false); }
  }
  return <ConsentShell>
    <ShieldCheck className="mb-6 h-9 w-9" />
    <h1 className="text-3xl font-semibold">Connect {client} to StartupBar</h1>
    <p className="mt-4 text-muted-foreground">This lets {client} use this app as you.</p>
    <div className="my-8 space-y-5 border-y border-border py-6">
      <div><p className="text-sm text-muted-foreground">Signed in as</p><p className="mt-1 break-all font-medium">{email}</p></div>
      <div><p className="text-sm text-muted-foreground">Client redirect address</p><p className="mt-1 break-all text-sm">{details.redirect_uri}</p></div>
      <ul className="space-y-2 text-sm">
        {scopes.map(scope => <li key={scope}>{scope === "email" ? "Share your email address" : scope === "profile" ? "Share your basic profile" : scope === "openid" ? "Confirm your identity" : `Additional permission requested: ${scope}`}</li>)}
        <li>Read your startup listings and installation status</li><li>Search approved startups in the network</li>
      </ul>
    </div>
    <p className="text-sm text-muted-foreground">This does not bypass StartupBar’s permissions. No payments, publishing, or deleting are included.</p>
    {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}
    <div className="mt-8 flex flex-wrap gap-3"><Button disabled={busy} onClick={() => decide(true)}>{busy ? "Please wait…" : "Approve connection"}</Button><Button variant="outline" disabled={busy} onClick={() => decide(false)}>Cancel connection</Button></div>
  </ConsentShell>;
}