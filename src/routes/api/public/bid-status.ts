import { createFileRoute } from "@tanstack/react-router";
import { fulfilBid, getDodoPayment } from "@/lib/bid-fulfil.server";

export const Route = createFileRoute("/api/public/bid-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const json = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });

        const url = new URL(request.url);
        const bidId = (url.searchParams.get("bid") ?? "").trim();
        const paymentId = (url.searchParams.get("payment_id") ?? "").trim();
        if (!bidId) return json({ error: "Missing bid" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: bid } = await supabaseAdmin
          .from("bids")
          .select("id, status, entry_id, amount_cents, name, display_url, dodo_payment_id")
          .eq("id", bidId)
          .maybeSingle();

        if (!bid) return json({ error: "Not found" }, 404);

        if (bid.status === "paid") {
          const { data: entry } = await supabaseAdmin
            .from("bid_entries")
            .select("id, total_cents")
            .eq("id", bid.entry_id ?? "")
            .maybeSingle();
          const { data: board } = await supabaseAdmin.rpc("public_bid_board" as never);
          const rank =
            (board as any[] | null)?.find((r) => r.id === bid.entry_id)?.rank ?? null;
          return json({
            status: "paid",
            name: bid.name,
            display_url: bid.display_url,
            amount_cents: bid.amount_cents,
            total_cents: entry?.total_cents ?? bid.amount_cents,
            rank,
          });
        }

        // Not confirmed by the webhook yet — ask Dodo directly.
        // Prefer the payment ID captured when checkout was created. Some Dodo
        // redirects leave the `{payment_id}` placeholder untouched; trusting
        // that URL value first makes an otherwise-paid bid poll forever.
        const returnPaymentId = paymentId === "{payment_id}" ? "" : paymentId;
        const lookupId = bid.dodo_payment_id || returnPaymentId;
        const payment = lookupId ? await getDodoPayment(lookupId) : null;
        const status = String(payment?.status ?? "").toLowerCase();
        const paid = status === "succeeded" || status === "completed" || status === "paid";
        // The bid id travels in metadata; fall back to the stored payment id so a
        // provider that drops metadata cannot block fulfilment.
        const isMine =
          payment?.metadata?.bid_id === bidId ||
          (!payment?.metadata?.bid_id && bid.dodo_payment_id === lookupId);

        if (payment && paid && isMine) {
          const result = await fulfilBid(
            bidId,
            lookupId,
            payment?.customer?.email ?? null,
            Number(payment?.total_amount ?? payment?.settlement_amount) || null,
            false,
          );
          if (result.ok) {
            return json({
              status: "paid",
              name: bid.name,
              display_url: bid.display_url,
              amount_cents: Number(payment?.total_amount) || bid.amount_cents,
              total_cents: result.total_cents,
              rank: result.rank,
            });
          }
        }

        return json({ status: "pending" }, 202);
      },
    },
  },
});
