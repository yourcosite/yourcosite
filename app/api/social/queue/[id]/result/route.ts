import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkSyncSecret } from "@/lib/socialSync";
import { withErrorLog } from "@/lib/errorLog";

// Publiceringssystemet rapporterar utfallet: published eller error.
async function POST_handler(request: Request, { params }: { params: { id: string } }) {
  const denied = checkSyncSecret(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const status = body.status === "published" ? "published" : body.status === "error" ? "error" : null;
  if (!status) return NextResponse.json({ error: "status måste vara published eller error." }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin
    .from("social_posts")
    .update({
      status,
      result: body.result ?? null,
      error: status === "error" ? String(body.error || "Okänt fel").slice(0, 500) : null,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .eq("id", params.id)
    .eq("status", "approved"); // bara godkända kan bli publicerade
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
export const POST = withErrorLog("POST /api/social/queue/[id]/result", POST_handler);
