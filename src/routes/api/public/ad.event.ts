import { createFileRoute } from "@tanstack/react-router";
import { isBotRequest } from "@/lib/bot-filter";

// Counts banner views/clicks. Views debit the campaign budget, so bots are
// dropped and the campaign id must be a running campaign (checked in SQL).
export const Route = createFileRoute("/api/public/ad/event")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { id?: string; kind?: string } = {};
        try { body = await request.json(); } catch { return new Response("bad", { status: 400 }); }
        const id = String(body.id ?? "");
        const kind = body.kind === "click" ? "click" : body.kind === "view" ? "view" : null;
        if (!/^[0-9a-f-]{36}$/i.test(id) || !kind) return new Response("bad", { status: 400 });
        if (isBotRequest(request)) return new Response(null, { status: 204 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.rpc("record_ad_event", { _campaign: id, _kind: kind });
        return new Response(null, { status: 204 });
      },
    },
  },
});
