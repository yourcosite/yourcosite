import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { isAllowedImageUrl } from "@/lib/stockPhotos";

// "Ångra" i chattredigeraren: webbläsaren håller de senaste versionerna av
// sajten och skickar tillbaka en av dem hit. Eftersom innehållet kommer från
// webbläsaren valideras det strikt: giltig struktur, och varje bildadress
// måste vara kundens egen uppladdning, en Unsplash-bild, en lokal sökväg
// eller en adress som redan finns i sajten.
export const dynamic = "force-dynamic";

function collectUrls(value: unknown, out: string[]) {
  if (typeof value === "string") {
    if (/^https?:\/\//.test(value)) out.push(value);
  } else if (Array.isArray(value)) {
    for (const v of value) collectUrls(v, out);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Länkar (ctaLink, link, url) är inte bilder — bara bild-fält granskas.
      if (/image|logo|photo|collage/i.test(k) && k !== "photoCredits") collectUrls(v, out);
      else if (v && typeof v === "object") collectUrls(v, out);
    }
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json();
  const siteId = typeof body.siteId === "string" ? body.siteId : null;
  const snapshot = body.content;
  if (!isValidSiteContent(snapshot)) {
    return NextResponse.json({ error: "Den tidigare versionen gick inte att läsa." }, { status: 400 });
  }

  const site = await getCurrentPublishedSite(supabase, user.id, siteId);
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: "Hittade ingen sajt." }, { status: 400 });
  }

  const currentJson = JSON.stringify(site.content);
  const urls: string[] = [];
  // Bara fält som heter något med image/logo/photo/collage granskas.
  const walk = (v: unknown) => collectUrls(v, urls);
  walk((snapshot as SiteContent).pages);
  for (const url of urls) {
    const base = url.split("#")[0];
    if (!isAllowedImageUrl(url, user.id) && !currentJson.includes(JSON.stringify(base).slice(1, -1))) {
      return NextResponse.json({ error: "Den tidigare versionen innehåller en bild som inte går att återställa." }, { status: 400 });
    }
  }

  const restored: SiteContent = { ...(snapshot as SiteContent) };
  // Loggan och sociala länkar styrs från onboardingen, aldrig av en snapshot.
  if (site.logo_url) restored.logoUrl = site.logo_url;
  else delete restored.logoUrl;
  if (Array.isArray(site.social_links) && site.social_links.length > 0) restored.socialLinks = site.social_links;
  else delete restored.socialLinks;

  const { error } = await supabase
    .from("sites")
    .update({
      content: restored,
      accent_color: restored.theme.accentColor,
      secondary_colors: restored.theme.secondaryColors,
    })
    .eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ content: restored });
}
