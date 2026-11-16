import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { logActivity } from "@/lib/supabase/activityLog";
import { withErrorLog } from "@/lib/errorLog";

// Åtgärder på ett socialt inlägg: save, approve, unapprove, reject, restore, delete.
// Godkänna kräver text och en tid i framtiden. Publicerade inlägg kan inte ändras.
async function POST_handler(request: Request, { params }: { params: { id: string } }) {
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const admin = createAdminClient();

  const { data: post } = await admin.from("social_posts").select("*").eq("id", params.id).maybeSingle();
  if (!post) return NextResponse.json({ error: "Hittade inte inlägget." }, { status: 404 });
  if (post.status === "published") return NextResponse.json({ error: "Inlägget är redan publicerat." }, { status: 400 });

  const editable = post.status === "draft" || post.status === "rejected" || post.status === "error";
  const log = (what: string) => logActivity(admin, { actorId: check.user.id, actorName: check.actorName, action: what, targetType: "social", targetId: post.id, targetLabel: String(post.caption).slice(0, 60) });

  if (action === "save" || action === "approve") {
    if (!editable) return NextResponse.json({ error: "Ta tillbaka godkännandet först om du vill ändra." }, { status: 400 });
    const caption = typeof body.caption === "string" ? body.caption.trim() : post.caption;
    if (!caption) return NextResponse.json({ error: "Texten får inte vara tom." }, { status: 400 });
    const update: Record<string, unknown> = {
      caption,
      first_comment: typeof body.first_comment === "string" ? (body.first_comment.trim() || null) : post.first_comment,
      scheduled_at: body.scheduled_at ? new Date(body.scheduled_at).toISOString() : (body.scheduled_at === null ? null : post.scheduled_at),
    };
    if (action === "approve") {
      const at = update.scheduled_at ? new Date(update.scheduled_at as string).getTime() : NaN;
      if (!Number.isFinite(at) || at < Date.now() + 2 * 60 * 1000) {
        return NextResponse.json({ error: "Välj en tid minst några minuter fram i tiden." }, { status: 400 });
      }
      update.status = "approved";
      update.approved_at = new Date().toISOString();
      update.approved_by = check.user.id;
      update.error = null;
    }
    const { error } = await admin.from("social_posts").update(update).eq("id", post.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await log(action === "approve" ? "godkände ett socialt inlägg" : "sparade ett socialt inlägg");
    return NextResponse.json({ ok: true, status: update.status ?? post.status, ...update });
  }

  if (action === "unapprove") {
    if (post.status !== "approved") return NextResponse.json({ error: "Inlägget är inte godkänt." }, { status: 400 });
    await admin.from("social_posts").update({ status: "draft", approved_at: null, approved_by: null }).eq("id", post.id);
    await log("tog tillbaka godkännandet av ett socialt inlägg");
    return NextResponse.json({ ok: true, status: "draft" });
  }
  if (action === "reject") {
    if (post.status === "approved") return NextResponse.json({ error: "Ta tillbaka godkännandet först." }, { status: 400 });
    await admin.from("social_posts").update({ status: "rejected" }).eq("id", post.id);
    await log("avslog ett socialt inlägg");
    return NextResponse.json({ ok: true, status: "rejected" });
  }
  if (action === "restore") {
    if (post.status !== "rejected" && post.status !== "error") return NextResponse.json({ error: "Inget att återställa." }, { status: 400 });
    await admin.from("social_posts").update({ status: "draft", error: null }).eq("id", post.id);
    return NextResponse.json({ ok: true, status: "draft" });
  }
  if (action === "delete") {
    if (post.status === "approved") return NextResponse.json({ error: "Ta tillbaka godkännandet först." }, { status: 400 });
    await admin.from("social_posts").delete().eq("id", post.id);
    await log("tog bort ett socialt inlägg");
    return NextResponse.json({ ok: true, deleted: true });
  }
  return NextResponse.json({ error: "Okänd åtgärd." }, { status: 400 });
}
export const POST = withErrorLog("POST /api/admin/social/[id]", POST_handler);
