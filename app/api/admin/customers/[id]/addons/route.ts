import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { logActivity } from "@/lib/supabase/activityLog";
import { getChangeUsage, monthKey } from "@/lib/changeLimit";
import { withErrorLog } from "@/lib/errorLog";

// Admin: se månadens ändringar för en kund och lägg till extra ändringar
// (tillägget "50 extra ändringar") för innevarande månad.
async function createdAtOf(admin: ReturnType<typeof createAdminClient>, id: string): Promise<string | null> {
  try {
    const { data } = await admin.auth.admin.getUserById(id);
    return data?.user?.created_at ?? null;
  } catch {
    return null;
  }
}

async function GET_handler(_request: Request, { params }: { params: { id: string } }) {
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;
  const admin = createAdminClient();
  return NextResponse.json(await getChangeUsage(admin, params.id, await createdAtOf(admin, params.id)));
}

async function POST_handler(request: Request, { params }: { params: { id: string } }) {
  const t = getT();
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;

  const body = await request.json().catch(() => ({}));
  const amount = Number(body.amount);
  if (!Number.isInteger(amount) || amount < 1 || amount > 1000) {
    return NextResponse.json({ error: t("Ange ett antal mellan 1 och 1000.") }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("change_addons").insert({ owner_id: params.id, month: monthKey(), amount });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await admin.from("profiles").select("full_name, email").eq("id", params.id).single();
  await logActivity(admin, {
    actorId: check.user.id,
    actorName: check.actorName,
    action: `lade till ${amount} extra ändringar för`,
    targetType: "customer",
    targetId: params.id,
    targetLabel: profile?.full_name || profile?.email || params.id,
  });

  return NextResponse.json({ ok: true, usage: await getChangeUsage(admin, params.id, await createdAtOf(admin, params.id)) });
}

export const GET = withErrorLog("GET /api/admin/customers/[id]/addons", GET_handler);
export const POST = withErrorLog("POST /api/admin/customers/[id]/addons", POST_handler);
