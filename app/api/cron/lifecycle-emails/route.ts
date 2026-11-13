import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailLayout, sendEmail } from "@/lib/email";
import { getT } from "@/lib/i18n/server";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { unsubscribeUrl } from "@/lib/unsubscribe";
import { withErrorLog } from "@/lib/errorLog";

// Automatiska mejl till nya kunder. Körs varje timme av Vercel Cron
// (vercel.json) och skickar:
//   welcome  – direkt när kontot är skapat
//   tips     – dagen efter (24 timmar eller mer efter registrering)
//   nudge    – efter en vecka, om ingen sajt är publicerad
// Varje mejl skickas högst en gång per kund (tabellen lifecycle_emails).
// Kunder som skapade konto före STARTDATUM får inga mejl, så ingen
// befintlig kund översköljs när funktionen sätts igång.
const START = new Date("2026-11-13T17:00:00Z");
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const BASE = "https://www.yourcosite.com";
const MAX_PER_RUN = 60;

type Kind = "welcome" | "tips" | "nudge";
type Profile = { id: string; email: string | null; full_name: string | null; language: string | null; created_at: string };

function build(kind: Kind, p: Profile) {
  const locale: Locale = isLocale(p.language) ? p.language : "sv";
  const t = getT(locale);
  const first = (p.full_name || "").trim().split(/\s+/)[0] || "";
  const hello = first ? t("Hej {name}!", { name: first }) : t("Hej!");
  const footer =
    t("Du får det här mejlet för att du har skapat ett konto hos YourCoSite. Svara gärna på mejlet om du undrar något.") +
    "\n" +
    t("Vill du inte ha fler tipsmejl? Avanmäl dig här: {url}", { url: unsubscribeUrl(p.id) });
  const common = { footer, poweredBy: "YourCoSite", lang: locale, button: { label: t("Fortsätt bygga din sajt"), url: `${BASE}/dashboard` } };

  if (kind === "welcome") {
    return {
      subject: t("Välkommen till YourCoSite"),
      title: t("Välkommen till YourCoSite"),
      intro: `${hello}\n${t("Kul att du är här. Du bygger din hemsida genom ett samtal med Millie, vår assistent. Berätta om din verksamhet, så bygger hon första versionen åt dig.")}`,
      extra: { heading: t("Så kommer du igång"), text: t("1. Berätta om din verksamhet för Millie.\n2. Titta på förslaget och be henne ändra det du vill, med vanliga ord.\n3. Klicka på Publicera när du är nöjd.") },
      ...common,
    };
  }
  if (kind === "tips") {
    return {
      subject: t("Tre tips för en bättre sajt"),
      title: t("Tre tips för en bättre sajt"),
      intro: `${hello}\n${t("Här är tre saker som brukar göra stor skillnad när du bygger din sajt.")}`,
      extra: {
        heading: t("Tips från Millie"),
        text: t("1. Bifoga din logga och dina egna bilder i chatten med gemet, så använder Millie dem.\n2. Klicka på Mallar bredvid Historik för att se alla layouter och vad de heter. Då vet du exakt vad du ska be om.\n3. Öppna Förbättra för tips som hjälper dig synas på Google."),
      },
      ...common,
    };
  }
  return {
    subject: t("Din sajt väntar på att publiceras"),
    title: t("Din sajt väntar på dig"),
    intro: `${hello}\n${t("Det har gått en vecka sedan du skapade ditt konto, och din sajt är inte publicerad än. Det går fort att komma i mål.")}`,
    extra: {
      heading: t("Det här återstår"),
      text: t("1. Gå igenom sidorna och be Millie ändra det som inte känns rätt.\n2. Klicka på Publicera i redigeraren, så får sajten en egen adress.\n3. Vill du ha din egen domän kan du koppla den direkt i samma fönster.\nKör du fast? Svara på det här mejlet, så hjälper vi dig."),
    },
    ...common,
  };
}

async function GET_handler(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Behörighet saknas." }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const since = new Date(Math.max(START.getTime(), now - 14 * DAY)).toISOString();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, email, full_name, language, created_at")
    .eq("role", "customer")
    .eq("email_opt_out", false)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) {
    console.error("[lifecycle] kunde inte läsa profiler", error.message);
    return NextResponse.json({ error: error.message + " (kör supabase/andringar-spark.sql)" }, { status: 500 });
  }
  const list = ((profiles ?? []) as Profile[]).filter((p) => p.email);
  if (list.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const ids = list.map((p) => p.id);
  const { data: logged } = await admin.from("lifecycle_emails").select("user_id, kind").in("user_id", ids);
  const done = new Set((logged ?? []).map((r: { user_id: string; kind: string }) => `${r.user_id}:${r.kind}`));
  const { data: live } = await admin.from("sites").select("owner_id").eq("status", "live").in("owner_id", ids);
  const hasLive = new Set((live ?? []).map((r: { owner_id: string }) => r.owner_id));

  const due: { kind: Kind; p: Profile }[] = [];
  for (const p of list) {
    const age = now - new Date(p.created_at).getTime();
    if (!done.has(`${p.id}:welcome`) && age < 3 * DAY) due.push({ kind: "welcome", p });
    if (!done.has(`${p.id}:tips`) && age >= DAY && age < 4 * DAY) due.push({ kind: "tips", p });
    if (!done.has(`${p.id}:nudge`) && age >= 7 * DAY && !hasLive.has(p.id)) due.push({ kind: "nudge", p });
  }

  let sent = 0;
  const failed: string[] = [];
  for (const { kind, p } of due.slice(0, MAX_PER_RUN)) {
    // Reservera först (primärnyckeln hindrar dubbletter om två körningar överlappar).
    const { error: lockErr } = await admin.from("lifecycle_emails").insert({ user_id: p.id, kind });
    if (lockErr) continue;
    const m = build(kind, p);
    const html = emailLayout({ title: m.title, intro: m.intro, rows: [], extra: m.extra, footer: m.footer, button: m.button, poweredBy: m.poweredBy, lang: m.lang });
    const text = [m.title, "", m.intro, "", m.extra.heading, m.extra.text, "", `${m.button.label}: ${m.button.url}`, "", m.footer].join("\n");
    const res = await sendEmail({
      to: p.email as string,
      subject: m.subject,
      html,
      text,
      replyTo: process.env.ALERT_EMAIL || "hej@cskb.se",
      headers: { "List-Unsubscribe": `<${unsubscribeUrl(p.id)}>` },
    });
    if (res.sent) sent++;
    else {
      // Misslyckades: släpp reservationen så nästa körning försöker igen.
      await admin.from("lifecycle_emails").delete().eq("user_id", p.id).eq("kind", kind);
      failed.push(`${kind}:${res.reason ?? "okänt fel"}`);
    }
  }
  return NextResponse.json({ ok: true, due: due.length, sent, failed: failed.slice(0, 5) });
}

export const GET = withErrorLog("GET /api/cron/lifecycle-emails", GET_handler);
