import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Självbetjänad, permanent radering av DET EGNA kontot — knappen "Ta bort
// konto" på /installningar (se app/installningar/DeleteAccountTab.tsx).
// Kräver service_role-nyckeln (admin.auth.admin.deleteUser) precis som
// admin-portalens kundradering (app/api/admin/customers/[id]/route.ts),
// men UTAN rollkrav: id:t kommer aldrig från klienten, bara från den
// inloggade sessionen, så en kund kan bara radera sitt eget konto, aldrig
// någon annans. Kaskaderar automatiskt till profiles → sites → sajtens
// undertabeller (nyheter, besöksstatistik, formulärsvar m.m.) via "on
// delete cascade" i supabase/schema.sql — ingen manuell upprensning behövs
// här.
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
