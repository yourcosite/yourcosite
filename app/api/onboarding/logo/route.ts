import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateDraftSite } from "@/lib/supabase/onboardingSite";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

// Ladda upp en logga, separat från den generella bild-dropzonen i steg 3 —
// det var lätt att den hamnade i en hög med "ett gäng bilder" annars. Gör
// det alltid helt uppenbart vad som är loggan i resten av flödet.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Ingen fil hittades." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Använd PNG, JPG, SVG eller WEBP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Filen är större än 2 MB." }, { status: 400 });
  }

  const draft = await getOrCreateDraftSite(supabase, user.id);

  const ext = file.name.split(".").pop() || "png";
  const path = `${user.id}/logo-${Date.now()}.${ext}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("logos")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: "Kunde inte ladda upp loggan: " + uploadError.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from("logos").getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("sites")
    .update({ logo_url: pub.publicUrl })
    .eq("id", draft.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ logoUrl: pub.publicUrl });
}

// Tar bort en vald logga (kunden ändrade sig).
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const draft = await getOrCreateDraftSite(supabase, user.id);
  const { error } = await supabase.from("sites").update({ logo_url: null }).eq("id", draft.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
