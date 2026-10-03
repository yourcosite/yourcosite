import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Hämtar den inloggade kundens senast skapade sajt (med genererat innehåll).
// Används av förhandsgranskningen efter onboardingen.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inte inloggad." }, { status: 401 });

  const { data: site, error } = await supabase
    .from("sites")
    .select("*")
    .eq("owner_id", user.id)
    .not("content", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ site });
}
