import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Låter en kund ta bort sin egen sajt (utkast eller live) permanent.
// RLS ("Ägare kan ta bort sina sajter") säkerställer att man bara kan ta
// bort sina egna — sidor, filer och aktivitet som hänger på sajten tas
// bort automatiskt via on-delete-cascade i databasen.
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const { error } = await supabase.from("sites").delete().eq("id", params.id).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
