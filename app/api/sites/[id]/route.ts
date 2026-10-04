import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, uniquePagePath, type SiteContent } from "@/lib/contentModel";

// Lägger till, döper om eller tar bort en SIDA direkt — till skillnad från
// /api/sites/edit (Millie i chatten, som tolkar fri text och kan ändra
// sektionsinnehåll) är det här en ren CRUD-väg för sidlistan själv, använd
// av "Sidor"-panelen (app/sidor/page.tsx). Ingen AI inblandad: kunden
// skriver namnet, koden gör sökvägen av det, sparas direkt.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const { data: site, error: fetchError } = await supabase
    .from("sites")
    .select("id, content")
    .eq("id", params.id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: "Hittade ingen sajt." }, { status: 404 });
  }
  const content = site.content as SiteContent;

  const body = await request.json();
  const action = body.action;
  let updatedPages = content.pages;
  let newPath: string | null = null;

  if (action === "add") {
    const label = typeof body.label === "string" ? body.label.trim().slice(0, 60) : "";
    if (!label) return NextResponse.json({ error: "Skriv ett namn för sidan." }, { status: 400 });
    newPath = uniquePagePath(content.pages, label);
    updatedPages = [...content.pages, { path: newPath, label, sections: [] }];
  } else if (action === "rename") {
    const path = typeof body.path === "string" ? body.path : "";
    const label = typeof body.label === "string" ? body.label.trim().slice(0, 60) : "";
    if (!label) return NextResponse.json({ error: "Skriv ett namn för sidan." }, { status: 400 });
    const exists = content.pages.some((p) => p.path === path);
    if (!exists) return NextResponse.json({ error: "Hittade ingen sida med den sökvägen." }, { status: 404 });
    updatedPages = content.pages.map((p) => (p.path === path ? { ...p, label } : p));
  } else if (action === "delete") {
    const path = typeof body.path === "string" ? body.path : "";
    if (path === "/") return NextResponse.json({ error: "Startsidan går inte att ta bort." }, { status: 400 });
    updatedPages = content.pages.filter((p) => p.path !== path);
    if (updatedPages.length === content.pages.length) {
      return NextResponse.json({ error: "Hittade ingen sida med den sökvägen." }, { status: 404 });
    }
  } else {
    return NextResponse.json({ error: "Okänt kommando." }, { status: 400 });
  }

  const updatedContent: SiteContent = { ...content, pages: updatedPages };
  const { error: saveError } = await supabase
    .from("sites")
    .update({ content: updatedContent })
    .eq("id", site.id);
  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });

  return NextResponse.json({ content: updatedContent, newPath });
}

// Låter en kund ta bort sin egen sajt (utkast eller live) permanent.
// RLS ("Ägare kan ta bort sina sajter") säkerställer att man bara kan ta
// bort sina egna — sidor, filer och aktivitet som hänger på sajten tas
// bort automatiskt via on-delete-cascade i databasen.
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const { error } = await supabase.from("sites").delete().eq("id", params.id).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
