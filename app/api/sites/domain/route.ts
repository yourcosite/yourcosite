import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimited, TOO_MANY } from "@/lib/rateLimit";
import { sendEmail, escapeHtml } from "@/lib/email";
import { addToVercel, checkDns, cleanDomain, removeFromVercel, requiredRecords, vercelConfigured, vercelStatus } from "@/lib/customDomain";
import { withErrorLog } from "@/lib/errorLog";

// Kundens egen domän: GET kontrollerar status, POST kopplar en domän, DELETE
// tar bort den. Bara för publicerade (live) sajter som kunden äger.
async function owned(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, siteId: string) {
  const { data } = await supabase.from("sites").select("id, name, status, slug, custom_domain, custom_domain_status").eq("id", siteId).eq("owner_id", userId).maybeSingle();
  return data;
}

async function statusFor(admin: ReturnType<typeof createAdminClient>, site: { id: string; custom_domain: string | null; slug: string | null }) {
  const domain = site.custom_domain;
  if (!domain) return { slug: site.slug, domain: null, status: null, records: [], dnsOk: false, apexOk: false, wwwOk: false, vercel: null };
  const dnsRes = await checkDns(domain);
  const vs = await vercelStatus(domain);
  // Aktiv: DNS pekar hit och (om vi kan fråga Vercel) domänen är tillagd där.
  const vercelOk = vs === null ? true : vs.added && vs.verified;
  const active = dnsRes.dnsOk && vercelOk;
  const status = active ? "active" : "pending";
  await admin.from("sites").update({ custom_domain_status: status }).eq("id", site.id);
  return { slug: site.slug, domain, status, records: requiredRecords(domain), ...dnsRes, vercel: vs, manual: !vercelConfigured() };
}

async function GET_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });
  const siteId = new URL(request.url).searchParams.get("siteId") || "";
  const site = await owned(supabase, user.id, siteId);
  if (!site) return NextResponse.json({ error: t("Hittade inte sajten.") }, { status: 404 });
  return NextResponse.json(await statusFor(createAdminClient(), site));
}

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });
  if (await rateLimited(`domain:user:${user.id}`, 20, 3600)) {
    return NextResponse.json({ error: t(TOO_MANY) }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const site = await owned(supabase, user.id, typeof body.siteId === "string" ? body.siteId : "");
  if (!site) return NextResponse.json({ error: t("Hittade inte sajten.") }, { status: 404 });
  if (site.status !== "live") {
    return NextResponse.json({ error: t("Publicera sajten först, sedan kan du koppla en egen domän.") }, { status: 400 });
  }
  const domain = cleanDomain(typeof body.domain === "string" ? body.domain : "");
  if (!domain) return NextResponse.json({ error: t("Det där ser inte ut som en domän. Skriv till exempel dittforetag.se.") }, { status: 400 });

  const admin = createAdminClient();
  const { data: taken } = await admin.from("sites").select("id").ilike("custom_domain", domain).neq("id", site.id).maybeSingle();
  if (taken) return NextResponse.json({ error: t("Den domänen används redan av en annan sajt.") }, { status: 409 });

  if (site.custom_domain && site.custom_domain !== domain) await removeFromVercel(site.custom_domain);
  const { error } = await admin.from("sites").update({ custom_domain: domain, custom_domain_status: "pending" }).eq("id", site.id);
  if (error) {
    const hint = /custom_domain|column/i.test(error.message) ? " (kör supabase/andringar-spark.sql)" : "";
    return NextResponse.json({ error: error.message + hint }, { status: 500 });
  }

  const added = await addToVercel(domain);
  if (!added.ok && added.error === "manual") {
    // Ingen Vercel-nyckel: be oss lägga till domänen för hand.
    await sendEmail({
      to: process.env.ALERT_EMAIL || "hej@cskb.se",
      subject: `Ny egen domän att lägga till i Vercel: ${domain}`,
      text: `Kund: ${user.email}\nSajt: ${site.name}\nDomän: ${domain}\n\nLägg till ${domain}${requiredRecords(domain).length > 1 ? ` och www.${domain}` : ""} i Vercel (Settings, Domains).`,
      html: `<p>Kund: ${escapeHtml(user.email || "")}</p><p>Sajt: ${escapeHtml(site.name)}</p><p>Domän: <b>${escapeHtml(domain)}</b></p><p>Lägg till domänen i Vercel (Settings, Domains).</p>`,
    });
  } else if (!added.ok) {
    return NextResponse.json({ error: added.error || t("Det gick inte att lägga till domänen.") }, { status: 502 });
  }
  return NextResponse.json(await statusFor(admin, { id: site.id, custom_domain: domain, slug: site.slug }));
}

async function DELETE_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });
  const siteId = new URL(request.url).searchParams.get("siteId") || "";
  const site = await owned(supabase, user.id, siteId);
  if (!site) return NextResponse.json({ error: t("Hittade inte sajten.") }, { status: 404 });
  if (site.custom_domain) await removeFromVercel(site.custom_domain);
  await createAdminClient().from("sites").update({ custom_domain: null, custom_domain_status: null }).eq("id", site.id);
  return NextResponse.json({ ok: true });
}

export const GET = withErrorLog("GET /api/sites/domain", GET_handler);
export const POST = withErrorLog("POST /api/sites/domain", POST_handler);
export const DELETE = withErrorLog("DELETE /api/sites/domain", DELETE_handler);
