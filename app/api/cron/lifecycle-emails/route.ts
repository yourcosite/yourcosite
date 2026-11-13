import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailLayout, sendEmail } from "@/lib/email";
import { buildLifecycleEmail as build, type LifecycleKind as Kind, type LifecycleProfile } from "@/lib/lifecycleEmails";
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
const MAX_PER_RUN = 60;

type Profile = LifecycleProfile;

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
    const html = emailLayout({ title: m.title, intro: m.intro, rows: [], extra: m.extra, footer: m.footer, footerLinks: m.footerLinks, button: m.button, poweredBy: m.poweredBy, lang: m.lang });
    const text = [m.title, "", m.intro, "", m.extra.heading, m.extra.text, "", `${m.button.label}: ${m.button.url}`, "", m.footer, ...m.footerLinks.map((l) => `${l.label}: ${l.url}`)].join("\n");
    const res = await sendEmail({
      to: p.email as string,
      subject: m.subject,
      html,
      text,
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
