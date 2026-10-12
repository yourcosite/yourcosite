import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { setFieldText, setLinkValue, isAllowedLink } from "@/lib/fieldPath";

// Manuell textredigering i chattredigeraren: kunden skriver om en enskild
// text själv. Inget går via AI:n.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json();
  const siteId = typeof body.siteId === "string" ? body.siteId : null;
  const sel = body.selection;
  const text = typeof body.text === "string" ? body.text : null;
  const isLink = body.kind === "link";
  if (text === null || text.length > 5000) {
    return NextResponse.json({ error: "Texten saknas eller är för lång." }, { status: 400 });
  }
  if (!sel || typeof sel.pagePath !== "string" || typeof sel.sectionId !== "string" || typeof sel.field !== "string") {
    return NextResponse.json({ error: "Det gick inte att avgöra vilken text som ska ändras." }, { status: 400 });
  }

  const site = await getCurrentPublishedSite(supabase, user.id, siteId);
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: "Hittade ingen sajt." }, { status: 400 });
  }

  const content: SiteContent = JSON.parse(JSON.stringify(site.content));
  const page = content.pages.find((p) => p.path === sel.pagePath);
  const section = page?.sections.find((s) => s.id === sel.sectionId) as any;
  if (!section) return NextResponse.json({ error: "Hittade inte texten på sidan." }, { status: 400 });
  if (isLink) {
    const value = text.trim();
    if (!isAllowedLink(value, content.pages.map((p) => p.path))) {
      return NextResponse.json({ error: "Länken måste vara en sida på sajten eller börja med https://." }, { status: 400 });
    }
    if (!setLinkValue(section, sel.field, value, typeof body.newTab === "boolean" ? body.newTab : undefined)) {
      return NextResponse.json({ error: "Det går inte att ändra länken här." }, { status: 400 });
    }
  } else if (!setFieldText(section, sel.field, text)) {
    return NextResponse.json({ error: "Den här texten går inte att ändra för hand." }, { status: 400 });
  }
  if (!isValidSiteContent(content)) {
    return NextResponse.json({ error: "Ändringen blev ogiltig." }, { status: 400 });
  }

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ content });
}
