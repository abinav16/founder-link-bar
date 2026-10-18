const theme = {
  background: '#ffffff', foreground: '#111111', muted: '#666666', border: '#e5e5e5',
  sans: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif",
};

export function shell(opts: { heading: string; bodyHtml: string; signoff?: string }) {
  const heading = opts.heading.replace(/[&<>"']/g, (c) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c] ?? c));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${heading}</title></head>
<body style="margin:0;padding:0;background:${theme.background};color:${theme.foreground};font-family:${theme.sans};font-style:normal;letter-spacing:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;"><tr><td style="padding:40px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="44"><a href="https://startupbar.co"><img src="https://startupbar.co/favicon.png" width="36" height="36" alt="StartupBar" style="display:block;border:0;object-fit:contain;"></a></td><td style="font-size:19px;font-weight:700;">StartupBar</td></tr></table>
<div style="height:1px;background:${theme.border};margin:26px 0 32px;"></div>
<h1 style="margin:0 0 24px;font-size:32px;line-height:1.2;font-weight:700;overflow-wrap:anywhere;">${heading}</h1>
${opts.bodyHtml}
<p style="margin:28px 0 0;font-size:14px;line-height:1.7;color:${theme.muted};">${opts.signoff ?? 'Abinav from StartupBar'}</p>
<p style="margin:24px 0;font-size:14px;font-weight:600;">Founders helping founders.</p>
<div style="height:1px;background:${theme.border};margin:0 0 22px;"></div>
<p style="margin:0;font-size:12px;line-height:1.7;color:${theme.muted};"><a href="https://startupbar.co" style="color:${theme.muted};">StartupBar</a> · <a href="https://startupbar.co/privacy" style="color:${theme.muted};">Privacy</a></p>
</td></tr></table></td></tr></table></body></html>`;
}