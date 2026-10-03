import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const check = await requireRole(["support", "admin", "superadmin"]);
  if (check.error) return check.error;

  const body = await request.json();
  const content = (body.content ?? "").trim();
  if (!content) {
    return NextResponse.json({ error: "Anteckningen får inte vara tom." }, { status: 400 });
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
