import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/requireRole";

export async function GET(request: Request) {
  const check = await requireRole(["support", "admin", "superadmin"]);
  if (check.error) return check.error;

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, company_name")
    .eq("role", "customer")
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,company_name.ilike.%${q}%`)
    .limit(8);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ results: data });
}
