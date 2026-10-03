import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDraftSite } from "@/lib/supabase/onboardingSite";

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

// Registrerar en fil som kunden redan laddat upp DIREKT till Supabase
// Storage från webbläsaren (se components/FileDropzone.tsx). Vi tar bara
// emot URL:en och sparar en rad — själva filbytena går aldrig via vår
// server, så Vercels gräns för request-storlek (~4.5 MB) spelar ingen
// roll längre, oavsett hur många filer eller hur stora de är.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const body = await request.json();
  const { fileName, fileUrl, mimeType } = body;

  if (!fileName || !fileUrl || !mimeType) {
    return NextResponse.json({ error: "Ofullständig filinformation." }, { status: 400 });
  }

  const isImage = IMAGE_TYPES.includes(mimeType);
  const isDocument = DOCUMENT_TYPES.includes(mimeType);
  if (!isImage && !isDocument) {
    return NextResponse.json({ error: "Filtypen stöds inte." }, { status: 400 });
  }

  // fileUrl måste vara en fil i kundens egen mapp i "uploads"-bucketen —
  // annars kunde man registrera en godtycklig extern URL som sin egen fil.
  if (!fileUrl.includes(`/uploads/${user.id}/`)) {
    return NextResponse.json({ error: "Ogiltig filsökväg." }, { status: 400 });
  }

  const draft = await getOrCreateDraftSite(supabase, user.id);

  const { data: row, error } = await supabase
    .from("site_assets")
    .insert({
      site_id: draft.id,
      owner_id: user.id,
      file_name: fileName,
      file_url: fileUrl,
      mime_type: mimeType,
      kind: isImage ? "image" : "document",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ asset: row });
}
