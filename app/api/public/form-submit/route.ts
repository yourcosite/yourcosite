import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimited, TOO_MANY } from "@/lib/rateLimit";
import { siteLocale } from "@/lib/i18n/site-server";

// Tar emot ett inskick från en "contactForm"-sektion (components/
// SitePreview.tsx, ContactFormBlock). Publik rutt (besökare på en
// kundsajt är aldrig inloggade hos oss) — service role krävs därför,
// med en egen koll att siteId faktiskt är en riktig sajt, samma mönster
// som /api/analytics/track.
const MAX_FIELD_LENGTH = 300;
const MAX_MESSAGE_LENGTH = 5000;

export async function POST(request: Request) {
  let t = getT();
  const body = await request.json().catch(() => ({}));
  if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ ok: true });
  const siteId = typeof body.siteId === "string" ? body.siteId : "";
  if (!siteId) return NextResponse.json({ error: t("Saknar siteId.") }, { status: 400 });
  if (/^[0-9a-f-]{36}$/i.test(siteId)) t = (await siteLocale(createAdminClient(), siteId)).t;

  const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
  if (!message) return NextResponse.json({ error: t("Skriv ett meddelande.") }, { status: 400 });

  const pagePath =
    typeof body.pagePath === "string" && body.pagePath ? body.pagePath.slice(0, MAX_FIELD_LENGTH) : "/";
  const sectionId = typeof body.sectionId === "string" ? body.sectionId.slice(0, MAX_FIELD_LENGTH) : "";
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, MAX_FIELD_LENGTH) : null;
  const email =
    typeof body.email === "string" && body.email.trim() ? body.email.trim().slice(0, MAX_FIELD_LENGTH) : null;

  if ((await rateLimited(`form:ip:${clientIp(request)}`, 10, 3600)) || (await rateLimited(`form:site:${siteId}`, 100, 3600))) {
    return NextResponse.json({ error: t(TOO_MANY) }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data: site } = await admin.from("sites").select("id").eq("id", siteId).maybeSingle();
  if (!site) return NextResponse.json({ error: t("Okänd sajt.") }, { status: 404 });

  const { error } = await admin.from("site_form_submissions").insert({
    site_id: siteId,
    page_path: pagePath,
    section_id: sectionId,
    name,
    email,
    message,
  });
  if (error) return NextResponse.json({ error: t("Kunde inte spara meddelandet.") }, { status: 500 });

  return NextResponse.json({ ok: true });
}
