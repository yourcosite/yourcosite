import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, escapeHtml } from "@/lib/email";
import { rateLimited, clientIp, TOO_MANY } from "@/lib/rateLimit";
import { withErrorLog } from "@/lib/errorLog";

// Anropas av registreringssidan direkt efter att kontot skapats och skickar
// ett mejl till oss (ALERT_EMAIL, annars hej@cskb.se) om den nya kunden.
// Anroparen är inte inloggad än (e-posten är ofta inte bekräftad), så
// skyddet är: kontot måste finnas och vara nyskapat, och varje konto kan
// bara ge ett mejl (profiles.signup_notified_at sätts innan mejlet skickas).
async function POST_handler(request: Request) {
  if (await rateLimited(`signup-notify:ip:${clientIp(request)}`, 10, 3600)) {
    return NextResponse.json({ error: TOO_MANY }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  // Den som först sätter markeringen får skicka mejlet.
  const { data: p } = await admin
    .from("profiles")
    .update({ signup_notified_at: new Date().toISOString() })
    .eq("id", userId)
    .is("signup_notified_at", null)
    .gte("created_at", since)
    .select("email, full_name, phone, company_name, org_number, country, language, address_city")
    .maybeSingle();
  if (!p) return NextResponse.json({ ok: true });

  const rows: [string, string][] = [
    ["Namn", p.full_name || "-"],
    ["Företag", p.company_name || "-"],
    ["Organisationsnummer", p.org_number || "-"],
    ["E-post", p.email || "-"],
    ["Telefon", p.phone || "-"],
    ["Ort", p.address_city || "-"],
    ["Land", p.country || "-"],
    ["Språk", p.language || "-"],
  ];
  await sendEmail({
    to: process.env.ALERT_EMAIL || "hej@cskb.se",
    subject: `Ny kund i YourCoSite: ${p.company_name || p.full_name || p.email}`,
    text: ["En ny kund har skapat konto.", "", ...rows.map(([k, v]) => `${k}: ${v}`), "", "https://www.yourcosite.com/admin/kunder"].join("\n"),
    html:
      `<p style="margin:0 0 12px">En ny kund har skapat konto.</p>` +
      rows.map(([k, v]) => `<p style="margin:0 0 4px"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</p>`).join("") +
      `<p style="margin:12px 0 0"><a href="https://www.yourcosite.com/admin/kunder">Öppna kundlistan</a></p>`,
    ...(p.email ? { replyTo: p.email } : {}),
  });
  return NextResponse.json({ ok: true });
}

export const POST = withErrorLog("POST /api/auth/notify-signup", POST_handler);
export const dynamic = "force-dynamic";
