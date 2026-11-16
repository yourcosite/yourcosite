import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { metaConfigured, publishToMeta } from "@/lib/metaPublish";
import { withErrorLog } from "@/lib/errorLog";

// Körs var femte minut av Vercel Cron (vercel.json). Publicerar godkända
// inlägg vars tid har passerat, på YourCoSites egen Facebook-sida och
// Instagram, och ingenting annat. Utan Meta-uppgifter görs ingenting.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function GET_handler(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Behörighet saknas." }, { status: 401 });
  }
  if (!metaConfigured()) return NextResponse.json({ skipped: "Meta-uppgifter saknas." });

  const admin = createAdminClient();
  const { data: due } = await admin
    .from("social_posts")
    .select("id, caption, image_url, first_comment")
    .eq("status", "approved")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(3);

  let published = 0;
  for (const p of due ?? []) {
    // Ta inlägget först så att en överlappande körning inte publicerar det två gånger.
    const { data: claimed } = await admin
      .from("social_posts")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", p.id)
      .eq("status", "approved")
      .select("id");
    if (!claimed?.length) continue;

    const out = await publishToMeta(p);
    const failed = [out.facebook?.error, out.instagram?.error].filter(Boolean);
    const bothFailed = !!out.facebook?.error && !!out.instagram?.error;
    await admin
      .from("social_posts")
      .update({
        status: bothFailed ? "error" : "published",
        result: out,
        error: failed.length ? failed.join(" | ").slice(0, 500) : null,
        published_at: bothFailed ? null : new Date().toISOString(),
      })
      .eq("id", p.id);
    if (!bothFailed) published++;
  }
  return NextResponse.json({ published });
}
export const GET = withErrorLog("GET /api/cron/social-publish", GET_handler);
