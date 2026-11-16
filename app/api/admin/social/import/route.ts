import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { withErrorLog } from "@/lib/errorLog";
import { SOCIAL_DRAFTS } from "@/content/socialPosts";

// Hämtar in nya förslag från content/socialPosts.ts som utkast. Befintliga
// (samma inboxId) lämnas orörda, så ändringar du gjort skrivs aldrig över.
export const dynamic = "force-dynamic";

async function POST_handler() {
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;
  const admin = createAdminClient();
  const { data: existing, error: readErr } = await admin.from("social_posts").select("inbox_id");
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 400 });
  const have = new Set((existing ?? []).map((r: any) => r.inbox_id));
  const fresh = SOCIAL_DRAFTS.filter((d) => !have.has(d.inboxId));
  if (fresh.length) {
    const { error } = await admin.from("social_posts").insert(
      fresh.map((d) => ({
        inbox_id: d.inboxId,
        caption: d.caption,
        first_comment: d.firstComment ?? null,
        image_url: d.imageUrl,
        scheduled_at: d.suggestedAt ?? null,
        status: "draft", // alltid utkast
      }))
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ added: fresh.length });
}
export const POST = withErrorLog("POST /api/admin/social/import", POST_handler);
