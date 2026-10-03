import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDraftSite } from "@/lib/supabase/onboardingSite";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json();
  const name = (body.name || "").trim();
  const industry = (body.industry || "").trim();
  const description = (body.description || "").trim();
  const tone = body.tone || "Personlig";

  if (!name) {
    return NextResponse.json({ error: "Företagsnamn krävs." }, { status: 400 });
  }

  const draft = await getOrCreateDraftSite(supabase, user.id);

  const { data: site, error } = await supabase
    .from("sites")
    .update({ name, industry, description, tone })
    .eq("id", draft.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ site });
}
