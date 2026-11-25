import { saveSiteVersion } from "@/lib/siteVersions";
import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { parseFieldPath, setFieldText, statIndex } from "@/lib/fieldPath";
import { withErrorLog } from "@/lib/errorLog";

// Manuell borttagning i chattredigeraren, utan AI: en hel sektion, en text,
// en knapp/länk, en hel ruta (kort, fråga, omdöme, nyckeltal) eller en bild.
// Allt går att ångra med Ångra-knappen (versionen sparas först).
export const dynamic = "force-dynamic";

const LIST_KEYS = ["items", "testimonials", "quotes", "faqs", "questions"];

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const siteId = typeof body.siteId === "string" ? body.siteId : null;
  const mode = body.mode;
  if (typeof body.pagePath !== "string" || typeof body.sectionId !== "string" || !["section", "field", "item", "image"].includes(mode)) {
    return NextResponse.json({ error: t("Det gick inte att avgöra vad som ska tas bort.") }, { status: 400 });
  }
  if (body.sectionId === "__header__") {
    return NextResponse.json({ error: t("Sidhuvudet går inte att ta bort här. Be Millie ändra det.") }, { status: 400 });
  }

  const site = await getCurrentPublishedSite(supabase, user.id, siteId);
  if (site) await saveSiteVersion(supabase, site as any, "remove");
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  }
  const content: SiteContent = JSON.parse(JSON.stringify(site.content));
  const page = content.pages.find((p) => p.path === body.pagePath);
  const idx = page ? page.sections.findIndex((s) => s.id === body.sectionId) : -1;
  if (!page || idx < 0) return NextResponse.json({ error: t("Hittade inte det du vill ta bort.") }, { status: 400 });
  const section = page.sections[idx] as any;
  const fail = (m: string) => NextResponse.json({ error: m }, { status: 400 });
  const field: string = typeof body.field === "string" ? body.field : "";

  if (mode === "section") {
    page.sections.splice(idx, 1);
  } else if (mode === "image") {
    if (body.kind === "hero") {
      delete section.imageUrl;
      delete section.imageFocus;
    } else if (body.kind === "gridItem" || body.kind === "galleryItem") {
      const i = Number(body.itemIndex);
      const item = Array.isArray(section.items) ? section.items[i] : undefined;
      if (!item) return fail(t("Hittade inte bilden på sidan."));
      if (body.kind === "galleryItem") section.items.splice(i, 1);
      else { delete item.imageUrl; delete item.focus; }
    } else return fail(t("Det gick inte att avgöra vilken bild det gäller."));
  } else if (mode === "item") {
    // Hela rutan (kort, fråga, omdöme) som markerad text hör till.
    const m = /^(?:items|testimonials|quotes|faqs|questions)\.(\d+)\./.exec(field) || /^items\.(\d+)\./.exec(field);
    const n = m ? Number(m[1]) : statIndex(field);
    if (n === null || n === undefined) return fail(t("Det här hör inte till en ruta som går att ta bort."));
    if (statIndex(field) !== null) {
      if (!Array.isArray(section.stats) || !section.stats[n]) return fail(t("Hittade inte nyckeltalet."));
      section.stats.splice(n, 1);
    } else {
      const key = LIST_KEYS.find((k) => Array.isArray(section[k]) && section[k][n]);
      if (!key) return fail(t("Hittade inte rutan."));
      section[key].splice(n, 1);
    }
  } else {
    // Enskild text, knapp eller länk.
    if (statIndex(field) !== null) {
      const n = statIndex(field) as number;
      if (!Array.isArray(section.stats) || !section.stats[n]) return fail(t("Hittade inte nyckeltalet."));
      section.stats.splice(n, 1);
    } else if (field === "ctaLabel" || field === "ctaLink") {
      delete section.ctaLabel; delete section.ctaLink; delete section.ctaNewTab;
    } else if (/^items\.(\d+)\.(ctaLabel|ctaLink|link|linkLabel)$/.test(field)) {
      const n = Number(/^items\.(\d+)\./.exec(field)![1]);
      const item = section.items?.[n];
      if (!item) return fail(t("Hittade inte länken."));
      delete item.ctaLabel; delete item.ctaLink; delete item.link; delete item.linkLabel; delete item.newTab; delete item.ctaNewTab;
    } else if (parseFieldPath(field)) {
      if (!setFieldText(section, field, "")) return fail(t("Hittade inte texten på sidan."));
    } else return fail(t("Den här texten går inte att ta bort här. Be Millie om hjälp."));
  }

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content });
}

export const POST = withErrorLog("POST /api/sites/remove", POST_handler);
