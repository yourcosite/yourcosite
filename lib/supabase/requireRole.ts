import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type StaffRole = "support" | "admin" | "superadmin";

export const ROLE_LABELS: Record<StaffRole, string> = {
  support: "Support",
  admin: "Admin",
  superadmin: "Superadmin",
};

// Används i API-rutter: kollar att den inloggade användaren har en av de
// tillåtna rollerna. Returnerar antingen { user, role } eller { error }
// (ett färdigt NextResponse att returnera direkt).
export async function requireRole(allowed: StaffRole[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Inte inloggad." }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const role = profile?.role as StaffRole | "customer" | undefined;

  if (!role || !allowed.includes(role as StaffRole)) {
    return {
      error: NextResponse.json(
        { error: "Du har inte behörighet för det här." },
        { status: 403 }
      ),
    };
  }

  return { user, role: role as StaffRole, actorName: profile?.full_name || user.email || "Okänd" };
}
