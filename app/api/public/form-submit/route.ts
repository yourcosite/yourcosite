import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Tar emot ett inskick från en "contactForm"-sektion (components/
// SitePreview.tsx, ContactFormBlock). Publik rutt (besökare på en
// kundsajt är aldrig inloggade hos oss) — service role krävs därför,
// med en egen koll att siteId faktiskt är en riktig sajt, samma mönster
// som /api/analytics/track.
const MAX_FIELD_LENGTH = 300;
const MAX_MESSAGE_LENGTH = 5000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const siteId = typeof body.siteId === "string" ? body.siteId : "";
  if (!siteId) return NextResponse.json({ error: "Saknar siteId." }, { status: 400 });

  const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
  if (!message) return NextResponse.json({ error: "Skriv ett meddelande." }, { status: 400 });

  const pagePath =
    typeof body.pagePath === "string" && body.pagePath ? body.pagePath.slice(0, MAX_FIELD_LENGTH) : "/";
  const sectionId = typeof body.sectionId === "string" ? body.sectionId.slice(0, MAX_FIELD_LENGTH) : "";
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, MAX_FIELD_LENGTH) : null;
  const email =
    typeof body.email === "string" && body.email.trim() ? body.email.trim().slice(0, MAX_FIELD_LENGTH) : null;

  const admin = createAdminClient();
  const { data: site } = await admin.from("sites").select("id").eq("id", siteId).maybeSingle();
  if (!site) return NextResponse.json({ error: "Okänd sajt." }, { status: 404 });

  const { error } = await admin.from("site_form_submissions").insert({
    site_id: siteId,
    page_path: pagePath,
    section_id: sectionId,
    name,
    email,
    message,
  });
  if (error) return NextResponse.json({ error: "Kunde inte spara meddelandet." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
