import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, uniquePagePath, type SiteContent } from "@/lib/contentModel";
import { parentPathOf, movePage, reparentPage, placePage } from "@/lib/pageTree";

// Lägger till, döper om eller tar bort en SIDA direkt — till skillnad från
// /api/sites/edit (Millie i chatten, som tolkar fri text och kan ändra
// sektionsinnehåll) är det här en ren CRUD-väg för sidlistan själv, använd
// av "Sidor"-panelen (app/sidor/page.tsx). Ingen AI inblandad: kunden
// skriver namnet, koden gör sökvägen av det, sparas direkt.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const { data: site, error: fetchError } = await supabase
    .from("sites")
    .select("id, content")
    .eq("id", params.id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 404 });
  }
  const content = site.content as SiteContent;

  const body = await request.json();
  const action = body.action;
  let updatedPages = content.pages;
  let newPath: string | null = null;

  if (action === "add") {
    const label = typeof body.label === "string" ? body.label.trim().slice(0, 60) : "";
    if (!label) return NextResponse.json({ error: t("Skriv ett namn för sidan.") }, { status: 400 });
    // Valfri huvudsida: den nya sidan blir en undersida under den. Bara en
    // nivå stöds, och startsidan kan inte vara huvudsida.
    const parentPath = typeof body.parentPath === "string" && body.parentPath ? body.parentPath : undefined;
    if (parentPath) {
      if (parentPath === "/" || !content.pages.some((p) => p.path === parentPath)) {
        return NextResponse.json({ error: t("Hittade ingen sådan huvudsida.") }, { status: 400 });
      }
      if (parentPathOf(parentPath, content.pages)) {
        return NextResponse.json({ error: t("En undersida kan inte ha egna undersidor.") }, { status: 400 });
      }
    }
    newPath = uniquePagePath(content.pages, label, undefined, parentPath);
    // Undersidor läggs direkt efter sin huvudsida (och dess andra undersidor).
    const newPage = { path: newPath, label, sections: [] };
    if (parentPath) {
      const lastIdx = Math.max(
        content.pages.findIndex((p) => p.path === parentPath),
        ...content.pages.map((p, i) => (parentPathOf(p.path, content.pages) === parentPath ? i : -1))
      );
      updatedPages = [...content.pages.slice(0, lastIdx + 1), newPage, ...content.pages.slice(lastIdx + 1)];
    } else {
      updatedPages = [...content.pages, newPage];
    }
  } else if (action === "rename") {
    const path = typeof body.path === "string" ? body.path : "";
    const label = typeof body.label === "string" ? body.label.trim().slice(0, 60) : "";
    if (!label) return NextResponse.json({ error: t("Skriv ett namn för sidan.") }, { status: 400 });
    const exists = content.pages.some((p) => p.path === path);
    if (!exists) return NextResponse.json({ error: t("Hittade ingen sida med den sökvägen.") }, { status: 404 });
    updatedPages = content.pages.map((p) => (p.path === path ? { ...p, label } : p));
  } else if (action === "move") {
    const path = typeof body.path === "string" ? body.path : "";
    const dir = body.direction === "up" || body.direction === "down" ? body.direction : null;
    if (!dir) return NextResponse.json({ error: t("Okänd riktning.") }, { status: 400 });
    const moved = movePage(content.pages, path, dir);
    if (!moved || moved.length !== content.pages.length) {
      return NextResponse.json({ error: t("Sidan går inte att flytta åt det hållet.") }, { status: 400 });
    }
    updatedPages = moved;
  } else if (action === "reparent") {
    const path = typeof body.path === "string" ? body.path : "";
    const parentPath = typeof body.parentPath === "string" && body.parentPath ? body.parentPath : null;
    const res = reparentPage(content.pages, path, parentPath);
    if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });
    updatedPages = res.pages;
    newPath = res.newPath;
  } else if (action === "place") {
    const path = typeof body.path === "string" ? body.path : "";
    const target = typeof body.targetPath === "string" ? body.targetPath : "";
    const pos = body.position === "before" || body.position === "after" || body.position === "into" ? body.position : null;
    if (!pos) return NextResponse.json({ error: t("Okänd placering.") }, { status: 400 });
    const res = placePage(content.pages, path, target, pos);
    if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });
    if (res.pages.length !== content.pages.length) return NextResponse.json({ error: t("Något gick fel vid flytten.") }, { status: 500 });
    updatedPages = res.pages;
    newPath = res.newPath;
  } else if (action === "delete") {
    const path = typeof body.path === "string" ? body.path : "";
    if (path === "/") return NextResponse.json({ error: t("Startsidan går inte att ta bort.") }, { status: 400 });
    // En huvudsida tas bort tillsammans med sina undersidor.
    updatedPages = content.pages.filter((p) => p.path !== path && parentPathOf(p.path, content.pages) !== path);
    if (updatedPages.length === content.pages.length) {
      return NextResponse.json({ error: t("Hittade ingen sida med den sökvägen.") }, { status: 404 });
    }
  } else {
    return NextResponse.json({ error: t("Okänt kommando.") }, { status: 400 });
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
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const { error } = await supabase.from("sites").delete().eq("id", params.id).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
