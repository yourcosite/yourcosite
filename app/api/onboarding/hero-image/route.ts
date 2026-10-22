import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedImageUrl } from "@/lib/stockPhotos";
import { getOrCreateDraftSite, draftLimitResponse } from "@/lib/supabase/onboardingSite";
import { withErrorLog } from "@/lib/errorLog";

// Kundens eget val av HUVUDBILD — den bild som alltid blir startsidans
// hero, istället för att bara bli "den som råkar lottas först" bland de
// allmänna uppladdade fotona (se lib/assignUploadedImages.ts). Separat
// dedikerad ruta precis som loggan, så det alltid är uppenbart vilken bild
// som är vilken.
//
// Filen laddas upp direkt till Supabase Storage från webbläsaren (samma
// mönster som FileDropzone) — den här rutten bara registrerar URL:en.
async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json();
  const { fileUrl } = body;

  if (!fileUrl || typeof fileUrl !== "string") {
    return NextResponse.json({ error: t("Ingen bild-URL skickades.") }, { status: 400 });
  }
  // Samma skydd som den allmänna bilduppladdningen — bara filer i kundens
  // EGEN mapp i "uploads"-bucketen får registreras.
  if (!isAllowedImageUrl(fileUrl, user.id)) {
    return NextResponse.json({ error: t("Ogiltig filsökväg.") }, { status: 400 });
  }

  let draft;
  try {
    draft = await getOrCreateDraftSite(supabase, user.id);
  } catch (e) {
    const limitResponse = draftLimitResponse(e);
    if (limitResponse) return limitResponse;
    throw e;
  }

  const { error } = await supabase
    .from("sites")
    .update({ hero_image_url: fileUrl })
    .eq("id", draft.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ heroImageUrl: fileUrl });
}

// Tar bort valet (kunden ändrade sig) — går tillbaka till att en av de
// allmänna fotona lottas som hero istället.
async function DELETE_handler() {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  let draft;
  try {
    draft = await getOrCreateDraftSite(supabase, user.id);
  } catch (e) {
    const limitResponse = draftLimitResponse(e);
    if (limitResponse) return limitResponse;
    throw e;
  }

  const { error } = await supabase.from("sites").update({ hero_image_url: null }).eq("id", draft.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export const POST = withErrorLog("POST /api/onboarding/hero-image", POST_handler);
export const DELETE = withErrorLog("DELETE /api/onboarding/hero-image", DELETE_handler);
