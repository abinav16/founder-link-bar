import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/apply")({
  head: () => ({ meta: [{ title: "Apply — StartupBar" }] }),
  component: Apply,
});

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  website_url: z.string().trim().url().max(200),
  description: z.string().trim().min(10).max(140),
});

function Apply() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authed) {
      navigate({ to: "/auth" });
      return;
    }
    const parsed = schema.safeParse({ name, website_url: url, description: desc });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData.user?.id;
    if (!user_id) {
      navigate({ to: "/auth" });
      return;
    }
    const { error } = await supabase.from("startups").upsert({
      user_id,
      ...parsed.data,
    }, { onConflict: "user_id" });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Application submitted.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-lg">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-2 w-6 rounded-sm bg-primary" />
          <span className="font-semibold">StartupBar</span>
        </Link>
        <h1 className="mt-8 text-3xl font-medium tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Apply your startup</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell us about your product. We approve quality startups within a day.
        </p>

        {authed === false && (
          <div className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm">
            You'll need an account to apply.{" "}
            <Link to="/auth" className="font-medium underline">Sign in or create one</Link>.
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <Label htmlFor="name">Startup name</Label>
            <Input id="name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" placeholder="Acme AI" />
          </div>
          <div>
            <Label htmlFor="url">Website URL</Label>
            <Input id="url" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} className="mt-1.5" placeholder="https://acme.ai" />
          </div>
          <div>
            <Label htmlFor="desc">One-line description</Label>
            <Textarea id="desc" required maxLength={140} value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1.5" placeholder="Turn meeting notes into action items, automatically." rows={3} />
            <div className="mt-1 text-xs text-muted-foreground">{desc.length}/140</div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Submitting…" : "Submit application"}
          </Button>
        </form>
      </div>
    </div>
  );
}
