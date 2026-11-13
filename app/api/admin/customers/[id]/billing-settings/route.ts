import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { logActivity } from "@/lib/supabase/activityLog";
import { withErrorLog } from "@/lib/errorLog";

// Admin: markera ett konto som kostnadsfritt (faktureras inte) och/eller sätt
// antal extra språk (0, 1 eller 2) som kunden betalar för. Används av
// fakturaunderlaget i /api/admin/billing-export.
async function POST_handler(request: Request, { params }: { params: { id: string } }) {
  const t = getT();
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;

  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  const notes: string[] = [];
  if (typeof body.billingExempt === "boolean") {
    update.billing_exempt = body.billingExempt;
    notes.push(body.billingExempt ? "gjorde kontot kostnadsfritt för" : "tog bort kostnadsfritt konto för");
  }
  if (body.extraLanguages !== undefined) {
    const n = Number(body.extraLanguages);
    if (![0, 1, 2].includes(n)) return NextResponse.json({ error: t("Ange 0, 1 eller 2 extra språk.") }, { status: 400 });
    update.extra_languages = n;
    notes.push(`satte ${n} extra språk för`);
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: t("Inget att spara.") }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await admin.from("profiles").select("full_name, email").eq("id", params.id).single();
  await logActivity(admin, {
    actorId: check.user.id,
    actorName: check.actorName,
    action: notes.join(" och "),
    targetType: "customer",
    targetId: params.id,
    targetLabel: profile?.full_name || profile?.email || params.id,
  });
  return NextResponse.json({ ok: true, ...update });
}

export const POST = withErrorLog("POST /api/admin/customers/[id]/billing-settings", POST_handler);
