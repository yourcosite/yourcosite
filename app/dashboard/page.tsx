import AccountHeader from "@/components/AccountHeader";
import DashboardClient, { type SiteRow } from "./DashboardClient";
import { createClient } from "@/lib/supabase/server";
import { isValidSiteContent } from "@/lib/contentModel";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userName = "Ditt konto";
  let userEmail = "";
  let sites: SiteRow[] = [];

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
      .select("id, name, domain, status, content")
      .order("created_at", { ascending: false });
    sites = (siteRows ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      domain: s.domain,
      status: s.status,
      // Bara sajter som hunnit till redigeringssteget har ett genererat
      // content ifyllt — de som fortfarande går igenom onboardingen visar
      // fortfarande sin platshållarfärg i kortet (se DashboardClient).
      content: isValidSiteContent(s.content) ? s.content : null,
    }));
  }

  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <AccountHeader active="/dashboard" userName={userName} userEmail={userEmail} />
      <DashboardClient sites={sites} />
    </div>
  );
}
