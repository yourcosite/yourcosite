import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { withErrorLog } from "@/lib/errorLog";

async function POST_handler(request: Request, { params }: { params: { id: string } }) {
  const t = getT();
  const check = await requireRole(["support", "admin", "superadmin"]);
  if (check.error) return check.error;

  const body = await request.json();
  const content = (body.content ?? "").trim();
  if (!content) {
    return NextResponse.json({ error: t("Anteckningen får inte vara tom.") }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: note, error } = await admin
    .from("customer_notes")
    .insert({
      customer_id: params.id,
      author_id: check.user.id,
      author_name: check.actorName,
      content,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note });
}

export const POST = withErrorLog("POST /api/admin/customers/[id]/notes", POST_handler);
