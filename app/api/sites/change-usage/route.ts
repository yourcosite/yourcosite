import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChangeUsage } from "@/lib/changeLimit";
import { withErrorLog } from "@/lib/errorLog";

// Hur många ändringar sajten använt den här månaden, för mätaren i redigeraren.
async function GET_handler(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ enabled: false }, { status: 401 });
  const siteId = new URL(request.url).searchParams.get("siteId");
  if (siteId) {
    const { data: siteRow } = await supabase.from("sites").select("created_at").eq("id", siteId).eq("owner_id", user.id).maybeSingle();
    if (siteRow) return NextResponse.json(await getChangeUsage(supabase, user.id, siteRow.created_at, siteId));
  }
  return NextResponse.json(await getChangeUsage(supabase, user.id, user.created_at));
}

export const GET = withErrorLog("GET /api/sites/change-usage", GET_handler);

export const dynamic = "force-dynamic";
