import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent } from "@/lib/contentModel";
import { isSkinId } from "@/lib/skins";
import { applyHomeRecipe, isHomeRecipeId } from "@/lib/homeRecipes";

// Sparar vilken av de tre stilvarianterna (lib/themeVariants.ts) kunden
// valde på /forslag. Innehållet (texterna) är redan genererat — det här
// ändrar bara theme.font/backgroundMode på den sajt kunden precis fick.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json();
  const { font, backgroundMode, buttonStyle, headerLayout, heroLayout, aboutLayout, gridLayout, ctaLayout, skin, homeRecipe } = body;

  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id, content")
    .eq("owner_id", user.id)
    .not("content", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (siteError || !site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: "Hittade ingen genererad sajt." }, { status: 400 });
  }

  // Förstasidans sektionsordning enligt det valda förslagets recept
  // (lib/homeRecipes.ts) — bara ordningen ändras, inget innehåll.
  const content = isHomeRecipeId(homeRecipe) ? applyHomeRecipe(site.content, homeRecipe) : site.content;
  content.theme.font = font === "serif" ? "serif" : "sans";
  content.theme.backgroundMode = ["light", "warm", "dark"].includes(backgroundMode)
    ? backgroundMode
    : "light";
  content.theme.buttonStyle = ["pill", "square", "underline"].includes(buttonStyle)
    ? buttonStyle
    : "pill";
  content.theme.headerLayout = ["left", "centered-stacked", "split"].includes(headerLayout)
    ? headerLayout
    : "left";
  content.theme.heroLayout = ["centered", "split-left", "split-right", "overlay-bottom", "fade-bottom", "collage", "quad", "editorial", "beam"].includes(heroLayout)
    ? heroLayout
    : "centered";
  content.theme.aboutLayout = ["text-left", "centered", "stats-split", "image-full", "image-stats"].includes(aboutLayout)
    ? aboutLayout
    : "text-left";
  content.theme.gridLayout = ["cards", "alternating-rows", "list", "numbered", "bento", "icon-row", "divided-columns", "intro-divided"].includes(gridLayout)
    ? gridLayout
    : "cards";
  content.theme.ctaLayout = ["centered", "split", "image-bleed", "dark-split"].includes(ctaLayout)
    ? ctaLayout
    : "centered";

  // Färg-/typografipaketet (lib/skins.ts): sätts för de nya varianterna och
  // TAS BORT när kunden istället väljer en klassisk variant — annars skulle
  // ett tidigare val ligga kvar och färga den nya.
  if (isSkinId(skin)) content.theme.skin = skin;
  else delete content.theme.skin;

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
