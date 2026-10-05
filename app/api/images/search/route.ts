import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sökning bland Unsplashs licensfria foton. Åtkomstnyckeln (Access Key) ligger
// bara som miljövariabel på servern (UNSPLASH_ACCESS_KEY i Vercel) och når
// aldrig webbläsaren eller git.
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ error: "Bildsökningen är inte påkopplad än." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim().slice(0, 100);
  const page = Math.min(Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1), 20);
  if (!query) return NextResponse.json({ photos: [], totalPages: 0 });

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", "18");
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}`, "Accept-Version": "v1" },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Kunde inte nå bildtjänsten just nu." }, { status: 502 });
  }
  if (res.status === 403 || res.status === 429) {
    return NextResponse.json({ error: "Bildsökningen är tillfälligt överbelastad — försök igen om en stund." }, { status: 429 });
  }
  if (!res.ok) return NextResponse.json({ error: "Bildsökningen misslyckades." }, { status: 502 });

  const data = await res.json();
  const photos = (Array.isArray(data.results) ? data.results : []).map((p: any) => ({
    id: String(p.id),
    thumbUrl: p.urls?.small,
    url: p.urls?.regular,
    alt: p.alt_description || p.description || "",
    photographer: p.user?.name || "Okänd fotograf",
    profileUrl: `${p.user?.links?.html}?utm_source=YourCoSite&utm_medium=referral`,
    downloadLocation: p.links?.download_location,
  }));
  return NextResponse.json({ photos, totalPages: data.total_pages || 0 });
}
