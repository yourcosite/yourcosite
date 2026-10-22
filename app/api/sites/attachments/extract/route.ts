import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withErrorLog } from "@/lib/errorLog";
import { extractDocumentText } from "@/lib/docText";

// Läser ut ren text ur en bifogad PDF eller Word-fil (redan uppladdad till
// Storage av klienten, se app/redigera/page.tsx) så chattredigeraren kan
// skicka med innehållet som vanlig text till Claude. Rena textfiler (.txt,
// .md) behöver aldrig gå via servern alls — webbläsaren läser dem direkt
// (File.text()) utan omväg hit.
export const maxDuration = 30;

const MAX_CHARS = 20000;

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json();
  const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";

  // Filen måste ligga i kundens egen uppladdningsmapp i vår "uploads"-
  // bucket — annars skulle routen kunna missbrukas för att läsa in
  // godtyckliga externa filer via vår server.
  if (!fileUrl.includes(`/uploads/${user.id}/`)) {
    return NextResponse.json({ error: t("Ogiltig fil.") }, { status: 400 });
  }

  let fileRes: Response;
  try {
    fileRes = await fetch(fileUrl);
  } catch {
    return NextResponse.json({ error: t("Kunde inte hämta filen.") }, { status: 502 });
  }
  if (!fileRes.ok) {
    return NextResponse.json({ error: t("Kunde inte hämta filen.") }, { status: 502 });
  }
  const buf = Buffer.from(await fileRes.arrayBuffer());

  let text = "";
  try {
    text = await extractDocumentText(buf, mimeType, typeof body.fileName === "string" ? body.fileName : "");
  } catch (e) {
    if ((e as Error)?.message === "unsupported") {
      return NextResponse.json(
        { error: t("Den filtypen stöds inte för textutdrag — använd PDF, Word (.docx) eller en vanlig textfil.") },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: t("Kunde inte läsa innehållet i filen.") }, { status: 500 });
  }

  text = text.trim();
  if (!text) {
    return NextResponse.json({ error: t("Hittade ingen text i filen.") }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    text = text.slice(0, MAX_CHARS) + "\n\n… (avkortat)";
  }

  return NextResponse.json({ text });
}

export const POST = withErrorLog("POST /api/sites/attachments/extract", POST_handler);
