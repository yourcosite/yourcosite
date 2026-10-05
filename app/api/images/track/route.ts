import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UNSPLASH_DOWNLOAD_PREFIX } from "@/lib/stockPhotos";

// Unsplashs API-regler kräver att vi "räknar" varje gång ett foto faktiskt
// väljs, genom att anropa fotots download_location. Ingen fil hämtas — det
// är bara en räknare hos dem.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  const { downloadLocation } = await request.json().catch(() => ({}));
  if (!accessKey || typeof downloadLocation !== "string" || !downloadLocation.startsWith(UNSPLASH_DOWNLOAD_PREFIX)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${accessKey}` }, cache: "no-store" });
  } catch {
    // Misslyckas räknaren ska kunden ändå kunna använda fotot.
  }
  return NextResponse.json({ ok: true });
}
