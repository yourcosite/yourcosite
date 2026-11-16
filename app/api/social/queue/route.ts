import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkSyncSecret } from "@/lib/socialSync";
import { withErrorLog } from "@/lib/errorLog";

// Publiceringssystemet hämtar här inlägg som är godkända (att schemalägga) och
// de som nyligen ändrat status (för att ta tillbaka dem om du ångrat dig).
export const dynamic = "force-dynamic";

async function GET_handler(request: Request) {
  const denied = checkSyncSecret(request);
  if (denied) return denied;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("social_posts")
    .select("id, status, caption, first_comment, image_url, scheduled_at")
    .in("status", ["approved", "draft", "rejected"])
    .order("scheduled_at", { ascending: true })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    posts: (data ?? []).map((p: any) => ({
      id: p.id,
      status: p.status,
      caption: p.caption,
      firstComment: p.first_comment,
      imageUrl: p.image_url,
      scheduledAt: p.scheduled_at,
    })),
  });
}
export const GET = withErrorLog("GET /api/social/queue", GET_handler);
