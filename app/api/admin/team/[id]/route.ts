import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";

// Tar bort adminbehörighet (nedgraderar till vanlig kund). Tar aldrig bort
// själva kontot, och man kan inte ta bort sin egen adminbehörighet härifrån.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const check = await requireRole(["superadmin"]);
  if (check.error) return check.error;

  if (check.user.id === params.id) {
    return NextResponse.json(
      { error: "Du kan inte ta bort din egen adminbehörighet." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: "customer" })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
