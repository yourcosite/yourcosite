// Skickar systemmejl via Resend (https://resend.com) med ett vanligt
// HTTP-anrop, så inget extra paket behövs. Två miljövariabler i Vercel:
//   RESEND_API_KEY  – nyckeln från Resend
//   EMAIL_FROM      – avsändare, t.ex. "YourCoSite <bokning@dindoman.se>"
// Saknas nyckeln skickas inget (och inget kraschar): funktionen svarar
// bara att mejlet inte skickades, så en bokning aldrig misslyckas för att
// mejlet strular.

export type EmailResult = { sent: boolean; reason?: string };

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.warn("[email] RESEND_API_KEY eller EMAIL_FROM saknas, mejl till", opts.to, "skickades inte.");
    return { sent: false, reason: "Mejltjänsten är inte kopplad ännu." };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[email] Resend svarade", res.status, detail.slice(0, 300));
      return { sent: false, reason: `Mejltjänsten svarade ${res.status}.` };
    }
    return { sent: true };
  } catch (e) {
    console.error("[email] kunde inte nå Resend", e);
    return { sent: false, reason: "Kunde inte nå mejltjänsten." };
  }
}

// Enkel, prydlig mejlmall (tabellbaserad, fungerar i alla mejlprogram).
export function emailLayout(opts: { title: string; intro: string; rows: [string, string][]; extra?: { heading: string; text: string }; brand?: { name: string; logoUrl?: string | null }; footer?: string; button?: { label: string; url: string } }): string {
  const rows = opts.rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#6b6a66;font-size:14px;vertical-align:top">${escapeHtml(k)}</td><td style="padding:6px 0;font-size:14px;color:#1a1a18;font-weight:600">${escapeHtml(v)}</td></tr>`
    )
    .join("");
  const brandHtml = opts.brand
    ? opts.brand.logoUrl && /^https:\/\//.test(opts.brand.logoUrl)
      ? `<img src="${escapeHtml(opts.brand.logoUrl)}" alt="${escapeHtml(opts.brand.name)}" style="display:block;max-height:48px;max-width:220px;margin:0 0 20px;border:0">`
      : `<div style="margin:0 0 20px;font-size:16px;font-weight:700;color:#1a1a18">${escapeHtml(opts.brand.name)}</div>`
    : "";
  const extra = opts.extra && opts.extra.text.trim() ? opts.extra : null;
  const button = opts.button
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(opts.button.url)}" style="display:inline-block;background:#1a1a18;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:999px">${escapeHtml(opts.button.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f5f4f0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:520px;background:#fff;border-radius:14px;padding:28px 28px 24px" cellpadding="0" cellspacing="0"><tr><td>
${brandHtml}<h1 style="margin:0 0 10px;font-size:21px;color:#1a1a18">${escapeHtml(opts.title)}</h1>
<p style="margin:0 0 18px;font-size:14.5px;line-height:1.55;color:#3a3a37;white-space:pre-line">${escapeHtml(opts.intro)}</p>
<table cellpadding="0" cellspacing="0">${rows}</table>
${extra ? `<div style="margin:22px 0 0;padding:14px 16px;background:#f5f4f0;border-radius:10px"><div style="font-size:13px;font-weight:700;color:#1a1a18;margin-bottom:4px">${escapeHtml(extra.heading)}</div><div style="font-size:14px;line-height:1.55;color:#3a3a37;white-space:pre-line">${escapeHtml(extra.text)}</div></div>` : ""}
${button}
${opts.footer ? `<p style="margin:24px 0 0;font-size:12.5px;line-height:1.5;color:#8a8984">${escapeHtml(opts.footer)}</p>` : ""}
<p style="margin:24px 0 0;padding-top:14px;border-top:1px solid #ecebe6;font-size:12px;color:#a09f99;text-align:center">Bokat via YourCoSite</p>
</td></tr></table></td></tr></table></body></html>`;
}
