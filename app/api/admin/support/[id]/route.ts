import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";

const ALLOWED_STATUSES = ["ny", "laser", "klar"] as const;

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const check = await requireRole(["support", "admin", "superadmin"]);
  if (check.error) return check.error;

  const body = await request.json().catch(() => ({}));
  const status = body.status;
  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Ogiltig status." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("support_messages").update({ status }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
