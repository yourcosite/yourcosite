import { NextResponse } from "next/server";
import { getT } from "@/lib/i18n/server";
import { sendEmail, escapeHtml } from "@/lib/email";
import { rateLimited, clientIp, TOO_MANY } from "@/lib/rateLimit";
import { withErrorLog } from "@/lib/errorLog";

// Kontaktformuläret på /kontakt: skickar ett mejl till oss (ALERT_EMAIL,
// annars hej@cskb.se) med den som skrev som svarsadress.
async function POST_handler(request: Request) {
  const t = getT();
  if (await rateLimited(`contact:ip:${clientIp(request)}`, 5, 3600)) {
    return NextResponse.json({ error: t(TOO_MANY) }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  // Gömt fält som bara robotar fyller i: låtsas att det gick bra.
  if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ ok: true });

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 4000) : "";
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: t("Fyll i namn, e-post och meddelande.") }, { status: 400 });
  }

  const lines = [`Namn: ${name}`, `E-post: ${email}`, "", message];
  const res = await sendEmail({
    to: process.env.ALERT_EMAIL || "hej@cskb.se",
    subject: `Kontaktformulär: ${name}`,
    text: lines.join("\n"),
    html: lines.map((l) => `<p style="margin:0 0 8px;white-space:pre-line">${escapeHtml(l)}</p>`).join(""),
    replyTo: email,
  });
  if (!res.sent) {
    // Orsaken visas tillfälligt för felsökning av mejlkopplingen.
    return NextResponse.json({ error: `${t("Det gick inte att skicka just nu. Mejla oss gärna direkt på hej@cskb.se.")} (${res.reason || "okänt fel"})` }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

export const POST = withErrorLog("POST /api/public/contact", POST_handler);
