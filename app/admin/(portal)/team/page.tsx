import { createClient } from "@/lib/supabase/server";
import TeamClient from "./TeamClient";

export default async function AdminTeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: admins } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .in("role", ["support", "admin", "superadmin"])
    .order("created_at", { ascending: false });

  return <TeamClient initialAdmins={admins ?? []} currentUserId={user?.id ?? ""} />;
}
