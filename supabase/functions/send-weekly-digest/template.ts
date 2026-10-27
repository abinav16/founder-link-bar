// Inline neutral tokens keep the email consistent in clients without stylesheet support.
const theme = {
  background: "#ffffff",
  foreground: "#111111",
  muted: "#666666",
  border: "#e5e5e5",
  sans: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[character] ?? character;
  });
}

function safeUrl(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch { return ""; }
}

export function startupLogo(logoUrl: string | null, websiteUrl: string): string {
  const customLogo = safeUrl(logoUrl);
  if (customLogo) return customLogo;
  try {
    const domain = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
  } catch { return "https://startupbar.co/favicon.png"; }
}

export function shell(firstName: string, intro: string, sections: string, unsubUrl: string, firstVerified = false): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <title>Your StartupBar weekly stats</title>
  <style>@media screen and (max-width:480px){.email-content{padding:28px 20px!important}.metric-value{font-size:26px!important}.metric-label{font-size:11px!important}}</style>
</head>
<body style="margin:0;padding:0;background:${theme.background};font-family:${theme.sans};font-style:normal;color:${theme.foreground};letter-spacing:0;">
  <div style="display:none;max-height:0;overflow:hidden;">Your startups. Your impressions, clicks and network rank. The last seven days on StartupBar.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${theme.background};"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;"><tr><td class="email-content" style="padding:40px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="44" style="vertical-align:middle;"><a href="https://startupbar.co" style="text-decoration:none;"><img src="https://startupbar.co/favicon.png" width="36" height="36" alt="StartupBar" style="display:block;border:0;object-fit:contain;" /></a></td>
        <td style="vertical-align:middle;font-size:19px;font-weight:700;">StartupBar</td>
      </tr></table>
      <div style="height:1px;background:${theme.border};margin:26px 0 32px;"></div>
      <p style="margin:0 0 10px;font-size:12px;font-weight:500;color:${theme.muted};">Weekly summary · Last 7 days</p>
      <h1 style="margin:0 0 20px;font-family:${theme.sans};font-size:32px;line-height:1.2;font-weight:700;font-style:normal;">${firstVerified ? 'Your first verified signup.' : 'Your weekly stats.'}</h1>
      <p style="margin:0 0 6px;font-size:15px;line-height:1.7;">Hi ${escapeHtml(firstName)},</p>
      <p style="margin:0 0 34px;font-size:15px;line-height:1.7;color:${theme.muted};">${intro}</p>
      ${sections}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 34px;"><tr><td bgcolor="${theme.foreground}" style="background:${theme.foreground};border-radius:6px;">
        <a href="https://startupbar.co/dashboard" style="display:inline-block;padding:14px 22px;font-size:14px;line-height:20px;font-weight:600;text-decoration:none;color:${theme.background};">View your dashboard &rarr;</a>
      </td></tr></table>
      <p style="margin:0 0 24px;font-size:14px;font-weight:600;">Founders helping founders.</p>
      <div style="height:1px;background:${theme.border};margin:0 0 22px;"></div>
      <p style="margin:0 0 8px;font-size:12px;line-height:1.7;color:${theme.muted};">You're receiving weekly stats for your startups on StartupBar.</p>
      <p style="margin:0 0 8px;font-size:12px;line-height:1.7;color:${theme.muted};"><a href="${escapeHtml(unsubUrl)}" style="color:${theme.muted};text-decoration:underline;">Unsubscribe from weekly stats</a>. You'll still receive important account emails.</p>
      <p style="margin:0;font-size:12px;line-height:1.7;color:${theme.muted};"><a href="https://startupbar.co" style="color:${theme.muted};">StartupBar</a> · <a href="https://startupbar.co/pricing" style="color:${theme.muted};">Pricing</a> · <a href="https://startupbar.co/privacy" style="color:${theme.muted};">Privacy</a> · <a href="https://startupbar.co/terms" style="color:${theme.muted};">Terms &amp; Conditions</a></p>
    </td></tr></table>
  </td></tr></table>
</body>
</html>`;
}

function stat(label: string, value: string | number): string {
  return `<td width="33.33%" style="width:33.33%;vertical-align:top;padding:0 8px 0 0;">
    <div class="metric-label" style="font-size:12px;line-height:1.5;color:${theme.muted};margin-bottom:8px;">${label}</div>
    <div class="metric-value" style="font-size:30px;line-height:1.2;font-weight:600;color:${theme.foreground};overflow-wrap:anywhere;">${value}</div>
  </td>`;
}

export function section(s: {
  startupName: string;
  websiteUrl: string;
  logoUrl: string | null;
  impressions: number;
  clicks: number;
  ctr: string;
  rank: string;
  impressionsDelta: string;
  signupTracking?: { enabled: boolean; verified: number; reported: number } | null;
  needsSnippetUpdate?: boolean;
}): string {
  let domain = "";
  try { domain = new URL(s.websiteUrl.startsWith("http") ? s.websiteUrl : `https://${s.websiteUrl}`).hostname.replace(/^www\./, ""); } catch { /* No domain label for invalid URLs. */ }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed;margin:0 0 30px;border-bottom:1px solid ${theme.border};">
    <tr><td style="padding:0 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;"><tr>
        <td width="54" style="width:54px;vertical-align:middle;"><img src="${escapeHtml(startupLogo(s.logoUrl, s.websiteUrl))}" width="40" height="40" alt="${escapeHtml(s.startupName)} logo" style="display:block;object-fit:contain;border-radius:6px;border:0;" /></td>
        <td style="vertical-align:middle;overflow-wrap:anywhere;">
          <div style="font-size:17px;line-height:1.4;font-weight:600;">${escapeHtml(s.startupName)}</div>
          <div style="font-size:12px;line-height:1.5;color:${theme.muted};margin-top:3px;">${escapeHtml(domain)}</div>
        </td>
        <td width="76" align="right" style="width:76px;vertical-align:middle;font-size:12px;color:${theme.muted};">Rank ${escapeHtml(s.rank)}</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:0 0 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;"><tr>
      ${stat("Impressions", s.impressions.toLocaleString("en-US"))}
      ${stat("Clicks", s.clicks.toLocaleString("en-US"))}
      ${stat("Click-through rate", escapeHtml(s.ctr) + "%")}
    </tr></table></td></tr>
    <tr><td style="padding:0 0 24px;font-size:12px;line-height:1.6;color:${theme.muted};">${escapeHtml(s.impressionsDelta)} impressions compared with last week</td></tr>
    ${s.signupTracking?.enabled ? `<tr><td style="padding:0 0 24px;border-top:1px solid ${theme.border};"><p style="margin:18px 0 12px;font-size:14px;font-weight:600;">Signups from the network</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;"><tr>${stat('Verified signups', s.signupTracking.verified || '—')}${stat('Success-page reports', s.signupTracking.reported || '—')}${stat('Attribution window', '30 days')}</tr></table><p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:${theme.muted};">Verified signups are reported by your signed signup system; page reports are browser signals, not verified accounts. Counts use this week’s reporting dates. “—” means no confirmations this week; it does not prove no signups occurred.</p></td></tr>` : ''}
    ${s.needsSnippetUpdate ? `<tr><td style="padding:0 0 24px;border-top:1px solid ${theme.border};"><p style="margin:18px 0 8px;font-size:14px;font-weight:600;">Update your embed snippet</p><p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:${theme.muted};">We haven’t verified the refreshed widget snippet on this startup’s website yet. It includes a StartupBar credit link. <a href="https://startupbar.co/dashboard" style="color:${theme.foreground};text-decoration:underline;">Copy your refreshed code from your dashboard &rarr;</a> and replace the old snippet.</p><p style="margin:0;font-size:12px;line-height:1.7;color:${theme.muted};">If you have already updated your snippet, please ignore this reminder.</p></td></tr>` : ''}
  </table>`;
}