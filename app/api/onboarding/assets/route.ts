import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateDraftSite } from "@/lib/supabase/onboardingSite";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per fil
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const draft = await getOrCreateDraftSite(supabase, user.id);
  const { data: assets } = await supabase
    .from("site_assets")
    .select("*")
    .eq("site_id", draft.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ assets: assets ?? [] });
}

// Laddar upp en eller flera filer samtidigt (egna foton, Word, PDF) till
// onboarding-utkastet. Varje fil sparas för sig i site_assets så kunden kan
// ta bort enskilda filer igen.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const draft = await getOrCreateDraftSite(supabase, user.id);
  const formData = await request.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "Inga filer hittades." }, { status: 400 });
  }

  const admin = createAdminClient();
  const saved: any[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const isImage = IMAGE_TYPES.includes(file.type);
    const isDocument = DOCUMENT_TYPES.includes(file.type);

    if (!isImage && !isDocument) {
      skipped.push(`${file.name} (filtyp stöds inte)`);
      continue;
    }
    if (file.size > MAX_BYTES) {
      skipped.push(`${file.name} (större än 10 MB)`);
      continue;
    }

    const ext = file.name.split(".").pop() || "bin";
    const path = `${user.id}/${draft.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from("uploads")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      skipped.push(`${file.name} (gick inte att ladda upp)`);
      continue;
    }

    const { data: pub } = admin.storage.from("uploads").getPublicUrl(path);

    const { data: row, error: insertError } = await supabase
      .from("site_assets")
      .insert({
        site_id: draft.id,
        owner_id: user.id,
        file_name: file.name,
        file_url: pub.publicUrl,
        mime_type: file.type,
        kind: isImage ? "image" : "document",
      })
      .select("*")
      .single();

    if (!insertError && row) saved.push(row);
  }

  return NextResponse.json({ assets: saved, skipped });
}
