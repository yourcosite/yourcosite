import AccountHeader from "@/components/AccountHeader";
import DashboardClient from "./DashboardClient";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userName = "Ditt konto";
  let userEmail = "";
  let sites: { id: string; name: string; domain: string | null; status: "draft" | "live" }[] = [];

  if (user) {
    userEmail = user.email ?? "";
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    userName = profile?.full_name || userEmail;

    const { data: siteRows } = await supabase
      .from("sites")
      .select("id, name, domain, status")
      .order("created_at", { ascending: false });
    sites = siteRows ?? [];
  }

  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <AccountHeader active="/dashboard" userName={userName} userEmail={userEmail} />
      <DashboardClient sites={sites} />
    </div>
  );
}
