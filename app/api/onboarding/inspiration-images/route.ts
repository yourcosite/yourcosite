import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDraftSite, draftLimitResponse } from "@/lib/supabase/onboardingSite";

// Max antal inspirationsbilder per sajt — fler än så ger marginell nytta
// för AI:n men kostar onödigt mycket i Claude-anropet (varje bild kostar
// tokens), så vi sätter en tydlig gräns istället för att låta kunden ladda
// upp obegränsat många.
const MAX_IMAGES = 6;

// Sparar/tar bort kundens inspirationsbilder (skärmdumpar/foton av sajter
// eller stilar de gillar, onboarding steg 2) — ett komplement till
// inspiration_links. Samma mönster som /api/onboarding/hero-image: filen
// laddas upp direkt till Supabase Storage från webbläsaren, den här rutten
// bara registrerar/avregistrerar URL:en i sites.inspiration_image_urls.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json();
  const { fileUrl } = body;

  if (!fileUrl || typeof fileUrl !== "string") {
    return NextResponse.json({ error: "Ingen bild-URL skickades." }, { status: 400 });
  }
  if (!fileUrl.includes(`/uploads/${user.id}/`)) {
    return NextResponse.json({ error: "Ogiltig filsökväg." }, { status: 400 });
  }

  let draft;
  try {
    draft = await getOrCreateDraftSite(supabase, user.id);
  } catch (e) {
    const limitResponse = draftLimitResponse(e);
    if (limitResponse) return limitResponse;
    throw e;
  }

  const current: string[] = Array.isArray(draft.inspiration_image_urls)
    ? draft.inspiration_image_urls
    : [];

  if (current.length >= MAX_IMAGES) {
    return NextResponse.json(
      { error: `Max ${MAX_IMAGES} inspirationsbilder — ta bort någon för att lägga till fler.` },
      { status: 400 }
    );
  }

  const updated = [...current, fileUrl];

  const { error } = await supabase
    .from("sites")
    .update({ inspiration_image_urls: updated })
    .eq("id", draft.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inspirationImageUrls: updated });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json();
  const { fileUrl } = body;
  if (!fileUrl || typeof fileUrl !== "string") {
    return NextResponse.json({ error: "Ingen bild-URL skickades." }, { status: 400 });
  }

  let draft;
  try {
    draft = await getOrCreateDraftSite(supabase, user.id);
  } catch (e) {
    const limitResponse = draftLimitResponse(e);
    if (limitResponse) return limitResponse;
    throw e;
  }

  const current: string[] = Array.isArray(draft.inspiration_image_urls)
    ? draft.inspiration_image_urls
    : [];
  const updated = current.filter((u) => u !== fileUrl);

  const { error } = await supabase
    .from("sites")
    .update({ inspiration_image_urls: updated })
    .eq("id", draft.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inspirationImageUrls: updated });
}
