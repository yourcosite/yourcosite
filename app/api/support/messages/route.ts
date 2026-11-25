import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocale } from "@/lib/i18n/server";
import { translateText } from "@/lib/translate";
import { rateLimited, TOO_MANY } from "@/lib/rateLimit";
import { withErrorLog } from "@/lib/errorLog";
import { sendEmail, escapeHtml } from "@/lib/email";

// Tar emot meddelanden kunder skickar direkt till oss via kundportalen —
// "Kontakta oss" i kontomenyn (components/AccountHeader.tsx) eller knappen
// Millie visar i chattredigeraren när ett önskemål inte går att utföra
// (components/ContactSupportModal.tsx). Landar i support_messages, som
// staff ser i /admin/meddelanden — se supabase/schema.sql.
const ALLOWED_SOURCES = ["konto", "chattredigerare", "ovrigt"] as const;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_CONTEXT_LENGTH = 4000;

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  if (await rateLimited(`support:user:${user.id}`, 30, 86400)) {
    return NextResponse.json({ error: t(TOO_MANY) }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: t("Skriv ett meddelande.") }, { status: 400 });
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: t("Meddelandet är för långt.") }, { status: 400 });
  }

  const source = ALLOWED_SOURCES.includes(body.source) ? body.source : "konto";
  const context =
    typeof body.context === "string" && body.context.trim()
      ? body.context.trim().slice(0, MAX_CONTEXT_LENGTH)
      : null;

  // siteId kommer från klienten, men bara den egna sajten accepteras —
  // annars används den bara om kunden faktiskt äger den (RLS på "sites"
  // via den vanliga klienten, inte admin-klienten, kollar det åt oss).
  let siteId: string | null = null;
  if (typeof body.siteId === "string" && body.siteId) {
    const { data: ownedSite } = await supabase
      .from("sites")
      .select("id")
      .eq("id", body.siteId)
      .single();
    if (ownedSite) siteId = ownedSite.id;
  }

  // Kunden skriver på sitt språk; personalen läser en svensk översättning
  // (originalet sparas alltid orört bredvid). Misslyckas översättningen
  // sparas meddelandet ändå.
  const language = getLocale();
  const messageSv = language === "sv" ? null : await translateText(message, language, "sv");
  const contextSv = language === "sv" || !context ? null : await translateText(context, language, "sv");

  const admin = createAdminClient();
  const row = {
    user_id: user.id,
    site_id: siteId,
    source,
    context: contextSv ? `${contextSv}\n\n— Original (${language}):\n${context}` : context,
    message,
  };
  let { error } = await admin.from("support_messages").insert({ ...row, language, message_sv: messageSv });
  // Före supabase/sprak.sql saknas språkkolumnerna: spara då utan dem.
  if (error && /language|message_sv/.test(error.message)) {
    ({ error } = await admin.from("support_messages").insert(row));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mejla oss direkt (ALERT_EMAIL, annars hej@cskb.se). Misslyckas mejlet är
  // meddelandet ändå sparat och syns i /admin/meddelanden.
  try {
    const [{ data: p }, siteRes] = await Promise.all([
      admin.from("profiles").select("full_name, company_name, email, phone").eq("id", user.id).maybeSingle(),
      siteId ? admin.from("sites").select("name").eq("id", siteId).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const kind = source === "chattredigerare" ? "Önskemål från chattredigeraren" : "Meddelande från kontomenyn";
    const who = (p as any)?.company_name || (p as any)?.full_name || user.email || "okänd kund";
    const email = (p as any)?.email || user.email || "";
    const rows: [string, string][] = [
      ["Typ", kind],
      ["Kund", `${(p as any)?.full_name || "-"}${(p as any)?.company_name ? `, ${(p as any).company_name}` : ""}`],
      ["E-post", email || "-"],
      ["Telefon", (p as any)?.phone || "-"],
      ["Sajt", (siteRes.data as any)?.name || "-"],
      ["Språk", language],
    ];
    const shown = messageSv || message;
    const textBody = [...rows.map(([k, v]) => `${k}: ${v}`), "", shown, ...(messageSv ? ["", `Original (${language}):`, message] : []), ...(context ? ["", "Sammanhang:", context] : []), "", "https://www.yourcosite.com/admin/meddelanden"].join("\n");
    await sendEmail({
      to: process.env.ALERT_EMAIL || "hej@cskb.se",
      subject: `${source === "chattredigerare" ? "Önskemål" : "Support"}: ${who}`,
      text: textBody,
      html:
        rows.map(([k, v]) => `<p style="margin:0 0 4px"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</p>`).join("") +
        `<p style="margin:14px 0 4px"><strong>Meddelande</strong></p><p style="margin:0;white-space:pre-wrap">${escapeHtml(shown)}</p>` +
        (messageSv ? `<p style="margin:12px 0 4px;color:#666"><strong>Original (${escapeHtml(language)})</strong></p><p style="margin:0;white-space:pre-wrap;color:#666">${escapeHtml(message)}</p>` : "") +
        (context ? `<p style="margin:12px 0 4px;color:#666"><strong>Sammanhang</strong></p><p style="margin:0;white-space:pre-wrap;color:#666">${escapeHtml(context.slice(0, 1500))}</p>` : "") +
        `<p style="margin:16px 0 0"><a href="https://www.yourcosite.com/admin/meddelanden">Öppna meddelandena</a></p>`,
      ...(email ? { replyTo: email } : {}),
    });
  } catch {}
  return NextResponse.json({ ok: true });
}

export const POST = withErrorLog("POST /api/support/messages", POST_handler);
