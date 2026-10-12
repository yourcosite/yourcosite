import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createShareToken, SHARE_LINK_DAYS } from "@/lib/shareToken";

// Skapar en delningslänk till förhandsvisningen av kundens egen sajt.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const siteId = typeof body.siteId === "string" ? body.siteId : "";
  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .eq("owner_id", user.id)
    .not("content", "is", null)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: "Hittade ingen sajt." }, { status: 404 });

  const origin = new URL(request.url).origin;
  const url = `${origin}/dela/${createShareToken(site.id)}`;
  return NextResponse.json({ url, days: SHARE_LINK_DAYS });
}
