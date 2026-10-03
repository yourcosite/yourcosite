import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDraftSite } from "@/lib/supabase/onboardingSite";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json();
  const styleId = body.styleId || "warm";
  const accentColor = body.accentColor || "#C6FF5E";
  const secondaryColors = Array.isArray(body.secondaryColors) ? body.secondaryColors : [];

  const draft = await getOrCreateDraftSite(supabase, user.id);

  const { data: site, error } = await supabase
    .from("sites")
    .update({ style_id: styleId, accent_color: accentColor, secondary_colors: secondaryColors })
    .eq("id", draft.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ site });
}
