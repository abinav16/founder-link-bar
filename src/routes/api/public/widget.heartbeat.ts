import { createFileRoute } from "@tanstack/react-router";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM = "StartupBar <hello@startupbar.co>";

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
}

function warningEmail(name: string) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111">
      <p style="font-size:20px;font-weight:600;margin:0 0 16px">Your StartupBar widget is hidden ⚠️</p>
      <p>Hey,</p>
      <p>We detected that your StartupBar widget on <strong>${name}</strong> is currently hidden from visitors.</p>
      <p>StartupBar is a mutual network — every startup shows others, every startup gets shown. Hiding the widget means you're receiving impressions from the network without giving back.</p>
      <p><strong>You have 24 hours to restore the widget visibility.</strong></p>
      <p>If this was a mistake (a CSS conflict, a theme issue), just reply and we'll help you fix it.</p>
      <p>If the widget remains hidden after 24 hours, your startup will be suspended from the network.</p>
      <p style="margin-top:32px">— Abinav<br>Founder, StartupBar</p>
    </div>
  `;
}

function suspensionEmail(name: string) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111">
      <p style="font-size:20px;font-weight:600;margin:0 0 16px">Your startup has been suspended</p>
      <p>Hey,</p>
      <p><strong>${name}</strong> has been suspended from the StartupBar network because your widget remained hidden for more than 24 hours after our warning.</p>
      <p>You will no longer receive impressions from the network.</p>
      <p>If you restore the widget and reply to this email, we'll review and consider reinstating you. But if the widget is hidden again, your account will be permanently banned.</p>
      <p style="margin-top:32px">— Abinav<br>Founder, StartupBar</p>
    </div>
  `;
}

function banEmail(name: string) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111">
      <p style="font-size:20px;font-weight:600;margin:0 0 16px">Your account has been permanently removed</p>
      <p>Hey,</p>
      <p><strong>${name}</strong> has been permanently removed from the StartupBar network.</p>
      <p>Your widget was hidden for more than 48 hours after repeated warnings. This is a permanent ban — reapplying is not possible.</p>
      <p>StartupBar is built on mutual trust. We have to protect that for everyone in the network.</p>
      <p style="margin-top:32px">— Abinav<br>Founder, StartupBar</p>
    </div>
  `;
}

export const Route = createFileRoute("/api/public/widget/heartbeat")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cors = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Cache-Control": "no-store",
        };

        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        const visible = url.searchParams.get("visible") === "true";

        if (!id) return new Response(null, { status: 400, headers: cors });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: startup, error } = await supabaseAdmin
            .from("startups")
            .select("id, name, status, widget_hidden_at, strike_count, banned, user_id")
            .eq("id", id)
            .maybeSingle();

          if (error || !startup) return new Response(null, { status: 404, headers: cors });
          if (startup.banned) return new Response(null, { status: 403, headers: cors });

          const now = new Date();
          const isApproved = startup.status === "approved";

          // For non-approved (pending/rejected) startups: just record visibility, no escalation
          if (!isApproved) {
            await supabaseAdmin
              .from("startups")
              .update({
                widget_currently_visible: visible,
                widget_last_heartbeat_at: now.toISOString(),
                widget_hidden_at: visible ? null : (startup.widget_hidden_at ?? now.toISOString()),
              })
              .eq("id", id);
            return new Response(null, { status: 200, headers: cors });
          }

          // Approved: run strike / suspension / ban escalation
          if (visible) {
            await supabaseAdmin
              .from("startups")
              .update({
                widget_hidden_at: null,
                strike_count: 0,
                widget_last_heartbeat_at: now.toISOString(),
                widget_currently_visible: true,
              })
              .eq("id", id);
          } else {
            const hiddenAt = startup.widget_hidden_at ? new Date(startup.widget_hidden_at) : null;
            const elapsedHours = hiddenAt ? (now.getTime() - hiddenAt.getTime()) / 3600000 : 0;
            const strike = startup.strike_count ?? 0;

            if (!hiddenAt) {
              await supabaseAdmin
                .from("startups")
                .update({ widget_hidden_at: now.toISOString(), strike_count: 1, widget_last_heartbeat_at: now.toISOString(), widget_currently_visible: false })
                .eq("id", id);

              const { data: user } = await supabaseAdmin.auth.admin.getUserById(startup.user_id ?? "");
              if (user?.user?.email) {
                await sendEmail(user.user.email, "Your StartupBar widget is hidden ⚠️", warningEmail(startup.name));
              }
            } else if (strike === 1 && elapsedHours >= 24) {
              await supabaseAdmin
                .from("startups")
                .update({ status: "rejected", strike_count: 2, rejection_reason: "widget_hidden", widget_last_heartbeat_at: now.toISOString(), widget_currently_visible: false })
                .eq("id", id);

              const { data: user } = await supabaseAdmin.auth.admin.getUserById(startup.user_id ?? "");
              if (user?.user?.email) {
                await sendEmail(user.user.email, "Your StartupBar startup has been suspended", suspensionEmail(startup.name));
              }
            } else if (strike >= 2 && elapsedHours >= 48) {
              await supabaseAdmin
                .from("startups")
                .update({ banned: true, status: "rejected", rejection_reason: "widget_hidden_permanent", widget_last_heartbeat_at: now.toISOString(), widget_currently_visible: false })
                .eq("id", id);

              const { data: user } = await supabaseAdmin.auth.admin.getUserById(startup.user_id ?? "");
              if (user?.user?.email) {
                await sendEmail(user.user.email, "Your StartupBar account has been permanently removed", banEmail(startup.name));
              }
            } else {
              await supabaseAdmin
                .from("startups")
                .update({ widget_last_heartbeat_at: now.toISOString(), widget_currently_visible: false })
                .eq("id", id);
            }
          }

          return new Response(null, { status: 200, headers: cors });
        } catch {
          return new Response(null, { status: 500, headers: cors });
        }
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
          },
        }),
    },
  },
});
