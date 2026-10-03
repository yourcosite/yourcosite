import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDraftSite } from "@/lib/supabase/onboardingSite";

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

  if (pages.length === 0) {
    return NextResponse.json({ error: "Minst en sida krävs." }, { status: 400 });
  }

  const draft = await getOrCreateDraftSite(supabase, user.id);

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

  return NextResponse.json({ ok: true });
}
