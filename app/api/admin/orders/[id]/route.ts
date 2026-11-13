import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { logActivity } from "@/lib/supabase/activityLog";
import { withErrorLog } from "@/lib/errorLog";
import { sendEmail } from "@/lib/email";
import { brandedEmail } from "@/lib/emailBrand";
import { buildOrderEmail } from "@/lib/orderEmails";

// Markerar en beställning som hanterad (eller ångrar det).
async function POST_handler(request: Request, { params }: { params: { id: string } }) {
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;
  const body = await request.json().catch(() => ({}));
  const handled = body.handled !== false;

  const admin = createAdminClient();
  const { data: before } = await admin.from("addon_orders").select("handled_at").eq("id", params.id).maybeSingle();
  const { data: order, error } = await admin
    .from("addon_orders")
    .update({ handled_at: handled ? new Date().toISOString() : null, handled_by: handled ? check.user.id : null })
    .eq("id", params.id)
    .select("label, user_id, kind")
    .single();
  if (error || !order) return NextResponse.json({ error: error?.message || "Hittade inte beställningen." }, { status: 400 });

  await logActivity(admin, {
    actorId: check.user.id,
    actorName: check.actorName,
    action: handled ? `markerade beställningen "${order.label}" som hanterad för` : `återöppnade beställningen "${order.label}" för`,
    targetType: "customer",
    targetId: order.user_id,
    targetLabel: order.label,
  });

  // Meddela kunden första gången beställningen markeras som hanterad.
  let emailed = false;
  if (handled && !before?.handled_at) {
    const { data: profile } = await admin.from("profiles").select("id, email, full_name, language").eq("id", order.user_id).maybeSingle();
    if (profile?.email) {
      const m = buildOrderEmail(order.kind, profile);
      const html = brandedEmail(m);
      const text = [m.title, "", m.intro, "", m.note.heading, m.note.text, "", `${m.button.label}: ${m.button.url}`, "", m.footer].join("\n");
      emailed = (await sendEmail({ to: profile.email, subject: m.subject, html, text })).sent;
    }
  }
  return NextResponse.json({ ok: true, emailed });
}

export const POST = withErrorLog("POST /api/admin/orders/[id]", POST_handler);
