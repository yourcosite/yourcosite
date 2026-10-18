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
      // Personalen (admin/support) får läsa ALLA sajter via RLS — utan det
      // här filtret listades därför andras sajter i deras egen kundzon, och
      // ett klick på dem hittade inte sajten (redigeraren hämtar bara egna).
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    // Kommande bekräftade bokningar per sajt (visas på sajtkorten). Misslyckas
    // frågan (t.ex. innan bokningstabellerna finns) visas helt enkelt inget antal.
    const upcoming: Record<string, number> = {};
    const { data: bookingRows } = await supabase
      .from("bookings")
      .select("site_id")
      .eq("status", "confirmed")
      .gte("starts_at", new Date().toISOString())
      .limit(2000);
    for (const b of bookingRows ?? []) upcoming[b.site_id] = (upcoming[b.site_id] || 0) + 1;
    sites = (siteRows ?? []).map((s) => ({
      upcomingBookings: upcoming[s.id] || 0,
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
