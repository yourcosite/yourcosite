import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";

// Bildredigeraren i chattredigeraren (components/ImageEditorModal.tsx):
// webbläsaren beskär/vrider/justerar bilden, laddar upp resultatet till
// kundens egen uppladdningsmapp och anropar sedan den här rutten, som byter
// adressen på EXAKT den markerade bilden. Inget går via AI:n.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json();
  const siteId = typeof body.siteId === "string" ? body.siteId : null;
  const sel = body.selection;
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : "";
  // Bara kundens egen uppladdning är tillåten — aldrig en godtycklig adress.
  if (!imageUrl.startsWith("https://") || !imageUrl.includes(`/uploads/${user.id}/`)) {
    return NextResponse.json({ error: "Ogiltig bildadress." }, { status: 400 });
  }
  if (
    !sel ||
    typeof sel.pagePath !== "string" ||
    typeof sel.sectionId !== "string" ||
    !["hero", "gridItem", "galleryItem"].includes(sel.kind)
  ) {
    return NextResponse.json({ error: "Det gick inte att avgöra vilken bild som ska bytas." }, { status: 400 });
  }

  const site = await getCurrentPublishedSite(supabase, user.id, siteId);
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: "Hittade ingen sajt." }, { status: 400 });
  }

  const content: SiteContent = JSON.parse(JSON.stringify(site.content));
  const page = content.pages.find((p) => p.path === sel.pagePath);
  const section = page?.sections.find((s) => s.id === sel.sectionId) as any;
  if (!section) return NextResponse.json({ error: "Hittade inte bilden på sidan." }, { status: 400 });

  if (sel.kind === "hero") {
    section.imageUrl = imageUrl;
  } else {
    const idx = Number(sel.itemIndex);
    const item = Array.isArray(section.items) ? section.items[idx] : undefined;
    if (!item) return NextResponse.json({ error: "Hittade inte bilden på sidan." }, { status: 400 });
    item.imageUrl = imageUrl;
  }

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ content });
}
