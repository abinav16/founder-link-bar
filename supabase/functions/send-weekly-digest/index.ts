import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FROM = "StartupBar <hello@startupbar.co>";
const SUBJECT = "Your StartupBar stats this week ✦";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function shell(firstName: string, intro: string, sections: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Your StartupBar stats</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="background:#000000;border-radius:12px 12px 0 0;padding:28px 32px;">
            <span style="display:inline-block;background:#ffffff;color:#000000;font-size:10px;font-weight:700;letter-spacing:0.08em;padding:4px 10px;border-radius:999px;">STARTUPBAR</span>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:32px 32px 8px;">
            <h1 style="margin:0 0 6px;font-size:26px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">Hey ${firstName} 👋</h1>
            <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6;">${intro}</p>
            ${sections}
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td>
                  <a href="https://startupbar.co/dashboard" style="display:inline-block;background:#000000;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:8px;">View full dashboard →</a>
                </td>
              </tr>
            </table>
            <div style="border-top:1px solid #f1f5f9;margin-bottom:24px;"></div>
            <p style="margin:0 0 6px;font-size:13px;color:#64748b;line-height:1.6;">
              The more sites that install StartupBar, the more impressions every founder gets. Know a founder who'd benefit?
            </p>
            <a href="https://startupbar.co" style="font-size:13px;font-weight:600;color:#0f172a;text-decoration:none;">Share StartupBar →</a>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
              You're getting this because you joined <a href="https://startupbar.co" style="color:#64748b;text-decoration:none;">StartupBar</a>.
              Sent every Monday.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function section(s: {
  startupName: string;
  impressions: number;
  clicks: number;
  ctr: string;
  rank: string;
  impressionsDelta: string;
  impressionsDeltaColor: string;
}) {
  return `<div style="margin-bottom:24px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
  <div style="background:#f8fafc;padding:12px 16px;border-bottom:1px solid #e2e8f0;">
    <span style="font-size:13px;font-weight:700;color:#0f172a;">${s.startupName}</span>
  </div>
  <div style="padding:16px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="25%" style="padding:0 6px 0 0;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 12px;">
            <div style="font-size:9px;font-weight:600;color:#94a3b8;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:5px;">IMPRESSIONS</div>
            <div style="font-size:22px;font-weight:700;color:#0f172a;line-height:1;">${s.impressions}</div>
            <div style="font-size:10px;color:${s.impressionsDeltaColor};margin-top:3px;">${s.impressionsDelta}</div>
          </div>
        </td>
        <td width="25%" style="padding:0 6px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 12px;">
            <div style="font-size:9px;font-weight:600;color:#94a3b8;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:5px;">CLICKS</div>
            <div style="font-size:22px;font-weight:700;color:#0f172a;line-height:1;">${s.clicks}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:3px;">visits</div>
          </div>
        </td>
        <td width="25%" style="padding:0 6px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 12px;">
            <div style="font-size:9px;font-weight:600;color:#94a3b8;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:5px;">CTR</div>
            <div style="font-size:22px;font-weight:700;color:#0f172a;line-height:1;">${s.ctr}%</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:3px;">click-through</div>
          </div>
        </td>
        <td width="25%" style="padding:0 0 0 6px;">
          <div style="background:#0f172a;border-radius:10px;padding:14px 12px;">
            <div style="font-size:9px;font-weight:600;color:#64748b;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:5px;">RANK</div>
            <div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1;">${s.rank}</div>
            <div style="font-size:10px;color:#64748b;margin-top:3px;">by impressions</div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</div>`;
}

async function sendEmail(to: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject: SUBJECT, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: startups, error: sErr } = await admin
      .from("startups")
      .select("id, name, user_id")
      .eq("status", "approved");
    if (sErr) throw sErr;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // Global impression counts per startup (last 7 days) for rank
    const { data: allImps } = await admin
      .from("impressions")
      .select("shown_startup_id")
      .gte("created_at", sevenDaysAgo);
    const impCount = new Map<string, number>();
    (allImps ?? []).forEach((r: any) => {
      impCount.set(r.shown_startup_id, (impCount.get(r.shown_startup_id) ?? 0) + 1);
    });

    // Group startups by founder
    const byUser = new Map<string, Array<{ id: string; name: string }>>();
    for (const s of startups ?? []) {
      if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
      byUser.get(s.user_id)!.push({ id: s.id, name: s.name });
    }

    let sent = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (const [userId, userStartups] of byUser) {
      try {
        const { data: { user } } = await admin.auth.admin.getUserById(userId);
        if (!user?.email) continue;

        const sections: string[] = [];
        for (const s of userStartups) {
          const impressions = impCount.get(s.id) ?? 0;

          const { count: clicks } = await admin
            .from("clicks")
            .select("*", { count: "exact", head: true })
            .eq("shown_startup_id", s.id)
            .gte("created_at", sevenDaysAgo);

          const { count: lastWeekImps } = await admin
            .from("impressions")
            .select("*", { count: "exact", head: true })
            .eq("shown_startup_id", s.id)
            .gte("created_at", fourteenDaysAgo)
            .lt("created_at", sevenDaysAgo);

          const rank = [...impCount.values()].filter((c) => c > impressions).length + 1;
          const ctr = impressions > 0 ? ((clicks ?? 0) / impressions * 100).toFixed(1) : "0.0";

          const lw = lastWeekImps ?? 0;
          const diff = impressions - lw;
          let delta: string;
          let color: string;
          if (diff > 0) { delta = `↑ ${diff} vs last week`; color = "#22c55e"; }
          else if (diff < 0) { delta = `↓ ${Math.abs(diff)} vs last week`; color = "#ef4444"; }
          else { delta = "— same as last week"; color = "#94a3b8"; }

          sections.push(section({
            startupName: s.name,
            impressions,
            clicks: clicks ?? 0,
            ctr,
            rank: `#${rank}`,
            impressionsDelta: delta,
            impressionsDeltaColor: color,
          }));
        }

        const fullName = (user.user_metadata?.full_name as string) || user.email.split("@")[0];
        const firstName = fullName.split(" ")[0] || "Founder";
        const intro = userStartups.length === 1
          ? `Here's how <strong style="color:#0f172a;">${userStartups[0].name}</strong> performed on the StartupBar network this week.`
          : `Here's how your <strong style="color:#0f172a;">${userStartups.length} startups</strong> performed on the StartupBar network this week.`;

        const html = shell(firstName, intro, sections.join("\n"));
        await sendEmail(user.email, html);
        sent++;
      } catch (e) {
        console.error(`Failed for user ${userId}:`, e);
        errors.push({ userId, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, errors }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
