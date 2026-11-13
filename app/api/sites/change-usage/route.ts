import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChangeUsage } from "@/lib/changeLimit";
import { withErrorLog } from "@/lib/errorLog";

// Hur många ändringar kunden använt den här månaden, för mätaren i redigeraren.
async function GET_handler() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ enabled: false }, { status: 401 });
  return NextResponse.json(await getChangeUsage(supabase, user.id, user.created_at));
}

export const GET = withErrorLog("GET /api/sites/change-usage", GET_handler);
