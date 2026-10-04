import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent } from "@/lib/contentModel";

// Sparar vilken av de tre stilvarianterna (lib/themeVariants.ts) kunden
// valde på /forslag. Innehållet (texterna) är redan genererat — det här
// ändrar bara theme.font/backgroundMode på den sajt kunden precis fick.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json();
  const { font, backgroundMode, buttonStyle, headerLayout, heroLayout } = body;

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

  const content = site.content;
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
  content.theme.heroLayout = ["centered", "split-left", "split-right", "overlay-bottom", "fade-bottom"].includes(heroLayout)
    ? heroLayout
    : "centered";

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
