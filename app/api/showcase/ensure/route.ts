import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimited, clientIp } from "@/lib/rateLimit";
import { generateShowcaseImage } from "@/lib/showcaseImage";
import { withErrorLog } from "@/lib/errorLog";

// Startsidan anropar den här när sajten som visas saknar skärmdump. Skapar
// bara en bild för den sajt som redan visas, och högst några gånger per timme
// totalt, så den kan inte användas för att belasta servern.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  if (await rateLimited(`showcase-ensure:ip:${clientIp(request)}`, 5, 3600) || (await rateLimited("showcase-ensure:all", 4, 3600))) {
    return NextResponse.json({ ok: false });
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("sites")
    .select("*")
    .eq("status", "live")
    .eq("show_on_homepage", true)
    .not("content", "is", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(1);
  const site = data?.[0];
  if (!site || site.showcase_image_url) return NextResponse.json({ ok: true });
  const url = await generateShowcaseImage(site.id);
  return NextResponse.json({ ok: !!url });
}

export const POST = withErrorLog("POST /api/showcase/ensure", POST_handler);
