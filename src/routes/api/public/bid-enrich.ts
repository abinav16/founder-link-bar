import { createFileRoute } from "@tanstack/react-router";
import { enrichEntry } from "@/lib/bid-fulfil.server";

/** Fired by the client right after a bid is confirmed paid. Kept out of the
 *  payment poll so confirmation stays fast, while the row still gets its real
 *  title/description instead of a bare domain. */
export const Route = createFileRoute("/api/public/bid-enrich")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const json = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });

        let bidId = "";
        try {
          bidId = String(((await request.json()) as any)?.bid_id ?? "").trim();
        } catch {
          /* ignore */
        }
        if (!bidId) return json({ error: "Missing bid" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: bid } = await supabaseAdmin
          .from("bids")
          .select("id, status, entry_id")
          .eq("id", bidId)
          .maybeSingle();

        // Only paid bids can trigger an outbound scrape.
        if (!bid || bid.status !== "paid" || !bid.entry_id) return json({ ok: false }, 202);

        await enrichEntry(bid.entry_id);
        return json({ ok: true });
      },
    },
  },
});
