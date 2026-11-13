import { escapeHtml } from "@/lib/email";

// Mejlmall i YourCoSites utseende (mörkt sidhuvud med loggan, grön knapp och
// gröna stegnummer) för de automatiska mejlen. Tabellbaserad med inline-stil
// så den fungerar i Gmail, Outlook och Apple Mail. Loggan är en PNG
// (public/email/logo.png), eftersom mejlprogram inte visar SVG.

const GREEN = "#C6FF5E";
const GREEN_INK = "#0C1004";
const INK = "#17171A";

export type BrandedStep = { title: string; text: string };

export function brandedEmail(opts: {
  lang: string;
  title: string;
  intro: string;
  sectionHeading?: string;
  steps?: BrandedStep[];
  note?: { heading: string; text: string };
  button: { label: string; url: string };
  footer: string;
  footerLinks: { label: string; url: string }[];
}): string {
  const e = escapeHtml;
  const steps = (opts.steps ?? [])
    .map(
      (s, i) => `<tr>
<td width="44" valign="top" style="padding:0 0 18px"><table cellpadding="0" cellspacing="0"><tr><td width="30" height="30" align="center" valign="middle" bgcolor="${GREEN}" style="background:${GREEN};border-radius:15px;font-size:14px;font-weight:700;color:${GREEN_INK};width:30px;height:30px">${i + 1}</td></tr></table></td>
<td valign="top" style="padding:0 0 18px"><div style="font-size:15.5px;font-weight:700;color:${INK};line-height:1.35">${e(s.title)}</div><div style="font-size:14.5px;line-height:1.55;color:#4a4a46;margin-top:3px">${e(s.text)}</div></td>
</tr>`
    )
    .join("");
  const note = opts.note
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 6px"><tr><td bgcolor="#F0FADB" style="background:#F0FADB;border-radius:12px;padding:16px 18px;border-left:4px solid ${GREEN}"><div style="font-size:14px;font-weight:700;color:${INK};margin-bottom:4px">${e(opts.note.heading)}</div><div style="font-size:14px;line-height:1.55;color:#3a3a37">${e(opts.note.text)}</div></td></tr></table>`
    : "";
  const links = opts.footerLinks
    .map((l) => `<a href="${e(l.url)}" style="color:#6b6a66;text-decoration:underline">${e(l.label)}</a>`)
    .join(" &middot; ");

  return `<!doctype html><html lang="${e(opts.lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#EFEFEA;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#EFEFEA"><tr><td align="center" style="padding:28px 14px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td bgcolor="${INK}" style="background:${INK};padding:22px 32px">
<table cellpadding="0" cellspacing="0"><tr>
<td valign="middle"><img src="https://www.yourcosite.com/email/logo.png" width="36" height="36" alt="" style="display:block;border:0"></td>
<td valign="middle" style="padding-left:11px;font-family:Georgia,'Times New Roman',serif;font-size:23px;font-weight:700;color:#ffffff;letter-spacing:.2px">YourCoSite</td>
</tr></table></td></tr>
<tr><td bgcolor="${GREEN}" height="5" style="background:${GREEN};height:5px;line-height:5px;font-size:0">&nbsp;</td></tr>
<tr><td style="padding:34px 32px 8px">
<h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:27px;line-height:1.25;color:${INK}">${e(opts.title)}</h1>
<p style="margin:0 0 26px;font-size:15.5px;line-height:1.6;color:#3a3a37;white-space:pre-line">${e(opts.intro)}</p>
${opts.sectionHeading ? `<div style="margin:0 0 16px;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#3B5300">${e(opts.sectionHeading)}</div>` : ""}
<table width="100%" cellpadding="0" cellspacing="0">${steps}</table>
${note}
<table cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr><td bgcolor="${GREEN}" style="background:${GREEN};border-radius:999px"><a href="${e(opts.button.url)}" style="display:inline-block;padding:15px 30px;font-size:15px;font-weight:700;color:${GREEN_INK};text-decoration:none">${e(opts.button.label)}</a></td></tr></table>
</td></tr>
<tr><td style="padding:22px 32px 28px">
<div style="border-top:1px solid #ECEBE6;padding-top:18px;font-size:12.5px;line-height:1.6;color:#8a8984">${e(opts.footer)}<br>${links}</div>
</td></tr>
</table></td></tr></table></body></html>`;
}
