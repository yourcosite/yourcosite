import { NextResponse } from "next/server";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withErrorLog } from "@/lib/errorLog";
import { rateLimited, TOO_MANY } from "@/lib/rateLimit";
import { generateShowcaseImage } from "@/lib/showcaseImage";

export const maxDuration = 60;

// Kundens val att visa sajten på YourCoSites startsida (sites.show_on_homepage).
// Bara kundens egna sajter, och bara publicerade sajter kan visas.
async function owned(userId: string, siteId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("sites").select("id, status").eq("id", siteId).eq("owner_id", userId).maybeSingle();
  return data;
}

async function GET_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });
  const siteId = new URL(request.url).searchParams.get("siteId") || "";
  if (!(await owned(user.id, siteId))) return NextResponse.json({ error: t("Hittade inte sajten.") }, { status: 404 });
  const { data } = await createAdminClient().from("sites").select("show_on_homepage").eq("id", siteId).maybeSingle();
  return NextResponse.json({ show: !!(data as any)?.show_on_homepage });
}

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const siteId = typeof body.siteId === "string" ? body.siteId : "";
  const show = body.show === true;
  const refresh = body.refresh === true;
  const site = await owned(user.id, siteId);
  if (!site) return NextResponse.json({ error: t("Hittade inte sajten.") }, { status: 404 });
  const { error } = await createAdminClient().from("sites").update({ show_on_homepage: show }).eq("id", siteId);
  if (error) return NextResponse.json({ error: t("Något gick fel.") }, { status: 500 });
  // Skärmdump av sajten till startsidans kort: när rutan kryssas i, och på begäran.
  let image: string | null = null;
  if (show && (refresh || body.capture !== false)) {
    if (await rateLimited(`showcase:user:${user.id}`, 6, 3600)) return NextResponse.json({ error: t(TOO_MANY) }, { status: 429 });
    image = await generateShowcaseImage(siteId);
  }
  return NextResponse.json({ show, image });
}

export const GET = withErrorLog("GET /api/sites/showcase", GET_handler);
export const POST = withErrorLog("POST /api/sites/showcase", POST_handler);
export const dynamic = "force-dynamic";
