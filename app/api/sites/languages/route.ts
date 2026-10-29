import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { withErrorLog } from "@/lib/errorLog";
import { isLocale } from "@/lib/i18n/config";
import { translateMany } from "@/lib/translate";
import { MAX_EXTRA_LANGUAGES, hashText, missingTexts, type SiteTranslations } from "@/lib/siteTranslateCore";

// Fler språk på kundens sajt. Huvudspråket (sites.language) är alltid sanningen;
// varje extra språk är ett minne från originaltext till översättning i
// sites.translations. "add" och "update" översätter bara texter som saknas i
// minnet, så att uppdatera efter en ändring kostar nästan ingenting.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = body.action;
  const lang = body.language;
  if ((action !== "add" && action !== "update" && action !== "remove") || !isLocale(lang)) {
    return NextResponse.json({ error: t("Ogiltigt värde.") }, { status: 400 });
  }
  const site = await getCurrentPublishedSite(supabase, user.id, typeof body.siteId === "string" ? body.siteId : null);
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 400 });
  }
  if (!("translations" in site)) {
    return NextResponse.json({ error: t("Språkfunktionen är inte aktiverad än. Kontakta oss så ordnar vi det.") }, { status: 501 });
  }
  const base: string = site.language || "sv";
  if (lang === base) return NextResponse.json({ error: t("Det är redan sajtens huvudspråk.") }, { status: 400 });

  const translations: SiteTranslations = { ...((site.translations as SiteTranslations) || {}) };

  if (action === "remove") {
    delete translations[lang];
  } else {
    if (action === "add" && !translations[lang] && Object.keys(translations).length >= MAX_EXTRA_LANGUAGES) {
      return NextResponse.json({ error: t("Du kan ha högst {n} extra språk.", { n: MAX_EXTRA_LANGUAGES }) }, { status: 400 });
    }
    if (action === "update" && !translations[lang]) {
      return NextResponse.json({ error: t("Språket är inte tillagt.") }, { status: 400 });
    }
    const content = site.content as SiteContent;
    const memo: Record<string, string> = { ...(translations[lang]?.memo || {}) };
    const todo = missingTexts(content, memo);
    const result = await translateMany(todo, base, lang);
    if (!result) return NextResponse.json({ error: t("Översättningen misslyckades. Försök igen om en stund.") }, { status: 502 });
    todo.forEach((s, i) => { memo[hashText(s)] = result[i]; });
    translations[lang] = { memo, translatedAt: new Date().toISOString() };
  }

  const { error } = await supabase.from("sites").update({ translations }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ translations });
}

export const POST = withErrorLog("POST /api/sites/languages", POST_handler);
