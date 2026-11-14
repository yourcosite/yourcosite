import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withErrorLog } from "@/lib/errorLog";

// Ger kunden sajtens kalenderlänk (skapas första gången) och kan byta ut den.
// Kräver att supabase/kalenderflode.sql är körd.
export const dynamic = "force-dynamic";

const newToken = () => randomBytes(24).toString("hex");

async function handle(request: Request, regenerate: boolean) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const url = new URL(request.url);
  let siteId = url.searchParams.get("site") || "";
  if (regenerate) {
    const body = await request.json().catch(() => ({}));
    siteId = typeof body.siteId === "string" ? body.siteId : "";
  }
  if (!/^[0-9a-f-]{36}$/i.test(siteId)) return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });

  const { data: site } = await supabase.from("sites").select("id").eq("id", siteId).eq("owner_id", user.id).maybeSingle();
  if (!site) return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 404 });

  const admin = createAdminClient();
  const { data: row, error } = await admin.from("sites").select("calendar_token").eq("id", siteId).maybeSingle();
  if (error) return NextResponse.json({ error: t("Kalenderlänken är inte aktiverad än.") }, { status: 500 });
  let token = (row as any)?.calendar_token as string | null;
  if (!token || regenerate) {
    token = newToken();
    const { error: upErr } = await admin.from("sites").update({ calendar_token: token }).eq("id", siteId);
    if (upErr) return NextResponse.json({ error: t("Kunde inte skapa kalenderlänken.") }, { status: 500 });
  }
  return NextResponse.json({ ok: true, token });
}

export const GET = withErrorLog("GET /api/booking/calendar-feed", (req: Request) => handle(req, false));
export const POST = withErrorLog("POST /api/booking/calendar-feed", (req: Request) => handle(req, true));
