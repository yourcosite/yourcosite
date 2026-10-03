import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Tar emot en sidvisning från PageviewBeacon (components/SitePreview.tsx).
// Publik rutt (besökare på en kundsajt är aldrig inloggade hos oss) —
// service role krävs därför, med en egen koll att siteId faktiskt är en
// riktig sajt, annars kunde vem som helst skriva skräprader med ett
// påhittat id. Ingen ägarkoll i övrigt behövs: det här ÄR publik
// besökstrafik, till skillnad från t.ex. support-meddelanden.
const MAX_FIELD_LENGTH = 300;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const siteId = typeof body.siteId === "string" ? body.siteId : "";
  if (!siteId) return NextResponse.json({ error: "Saknar siteId." }, { status: 400 });

  const path = typeof body.path === "string" && body.path ? body.path.slice(0, MAX_FIELD_LENGTH) : "/";
  // Bara referrerns ursprung (schema+host), aldrig hela URL:en — den kan
  // innehålla sökord, kampanjparametrar eller annat som inte behövs för en
  // enkel källa-lista och bara vore onödig datainsamling att spara rakt av.
  let referrer: string | null = null;
  if (typeof body.referrer === "string" && body.referrer) {
    try {
      referrer = new URL(body.referrer).origin.slice(0, MAX_FIELD_LENGTH);
    } catch {
      referrer = null;
    }
  }

  const admin = createAdminClient();
  const { data: site } = await admin.from("sites").select("id").eq("id", siteId).maybeSingle();
  if (!site) return NextResponse.json({ error: "Okänd sajt." }, { status: 404 });

  await admin.from("site_pageviews").insert({ site_id: siteId, path, referrer });
  return NextResponse.json({ ok: true });
}
