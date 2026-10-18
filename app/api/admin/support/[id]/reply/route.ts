import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { translateText } from "@/lib/translate";
import { emailLayout, sendEmail } from "@/lib/email";
import { tFor } from "@/lib/i18n/site-server";
import { isLocale, type Locale } from "@/lib/i18n/config";

// Personalens svar på ett kundmeddelande. Personalen skriver på svenska;
// svaret översätts till kundens språk (språket kunden skrev på), sparas
// i support_replies (historiken per kund) och mejlas till kunden.
export const maxDuration = 30;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const t = getT();
  const check = await requireRole(["support", "admin", "superadmin"]);
  if (check.error) return check.error;

  const body = await request.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 5000) : "";
  if (!text) return NextResponse.json({ error: t("Skriv ett svar.") }, { status: 400 });

  const admin = createAdminClient();
  const { data: msg } = await admin
    .from("support_messages")
    .select("id, user_id, message, language")
    .eq("id", params.id)
    .maybeSingle();
  if (!msg) return NextResponse.json({ error: t("Hittade inte meddelandet.") }, { status: 404 });

  const { data: customer } = await admin.from("profiles").select("email, language").eq("id", (msg as any).user_id).maybeSingle();
  const stored = (msg as any).language;
  const lang: Locale = isLocale(stored) ? stored : isLocale((customer as any)?.language) ? (customer as any).language : "sv";

  // Översätt innan något sparas eller skickas: går det inte får personalen
  // försöka igen i stället för att kunden får ett svar på fel språk.
  const bodySent = lang === "sv" ? text : await translateText(text, "sv", lang);
  if (bodySent === null) {
    return NextResponse.json({ error: t("Översättningen misslyckades. Försök igen om en stund.") }, { status: 502 });
  }

  const { data: reply, error } = await admin
    .from("support_replies")
    .insert({
      message_id: params.id,
      user_id: (msg as any).user_id,
      staff_id: check.user.id,
      language: lang,
      body_sv: text,
      body_sent: bodySent,
    })
    .select("id, created_at")
    .single();
  if (error || !reply) return NextResponse.json({ error: error?.message || t("Kunde inte spara svaret.") }, { status: 500 });

  // Mejl till kunden på kundens språk.
  const tc = tFor(lang);
  let emailed = false;
  const to = (customer as any)?.email;
  if (to) {
    const r = await sendEmail({
      to,
      subject: tc("Svar från YourCoSite support"),
      html: emailLayout({
        lang,
        poweredBy: "YourCoSite",
        title: tc("Svar från YourCoSite support"),
        intro: bodySent,
        rows: [],
        extra: { heading: tc("Ditt meddelande"), text: (msg as any).message },
      }),
      text: `${bodySent}\n\n— ${tc("Ditt meddelande")}:\n${(msg as any).message}`,
    });
    emailed = r.sent;
    if (emailed) await admin.from("support_replies").update({ emailed: true }).eq("id", (reply as any).id);
  }

  // Svaret räknas som påbörjat/klart.
  const status = body.markDone === true ? "klar" : "laser";
  await admin.from("support_messages").update({ status }).eq("id", params.id);

  return NextResponse.json({
    ok: true,
    reply: { id: (reply as any).id, created_at: (reply as any).created_at, body_sv: text, body_sent: bodySent, language: lang, emailed },
    status,
  });
}
