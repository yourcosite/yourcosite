import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  // RLS ("Ägare kan hantera sina filer") ser till att man bara kan ta bort
  // sina egna — ingen extra ägarkoll behövs här.
  const { error } = await supabase.from("site_assets").delete().eq("id", params.id).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
