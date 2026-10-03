import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDraftSite, draftLimitResponse } from "@/lib/supabase/onboardingSite";

type IncomingPage = {
  label: string;
  path: string;
  brief?: string;
};

// Sparar kundens sidval för onboarding-utkastet. Vi tar bort de gamla
// sidraderna och skriver in de valda på nytt — enklast eftersom kunden kan
// lägga till/ta bort/döpa om fritt i steg 3 innan den här rutten anropas.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json();
  const pages: IncomingPage[] = Array.isArray(body.pages) ? body.pages : [];
  // Kundens godkännande att AI:n får fylla ut text där briefen inte täcker
  // allt. Förval true (annars blir sidor med tom brief orimligt tunna).
  const allowAiTextFill = body.allowAiTextFill !== false;

  if (pages.length === 0) {
    return NextResponse.json({ error: "Minst en sida krävs." }, { status: 400 });
  }

  let draft;
  try {
    draft = await getOrCreateDraftSite(supabase, user.id);
  } catch (e) {
    const limitResponse = draftLimitResponse(e);
    if (limitResponse) return limitResponse;
    throw e;
  }

  await supabase.from("site_pages").delete().eq("site_id", draft.id);

  const rows = pages.map((p, i) => ({
    site_id: draft.id,
    label: p.label,
    path: p.path,
    brief: p.brief || "",
    sort_order: i,
  }));

  const { error } = await supabase.from("site_pages").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: siteError } = await supabase
    .from("sites")
    .update({ allow_ai_text_fill: allowAiTextFill })
    .eq("id", draft.id);
  if (siteError) return NextResponse.json({ error: siteError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
