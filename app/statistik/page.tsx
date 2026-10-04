import Link from "next/link";
import AccountHeader from "@/components/AccountHeader";
import StatistikClient from "./StatistikClient";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";

export const dynamic = "force-dynamic";

const DAYS = 30;

export default async function StatistikPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userName = "Ditt konto";
  let userEmail = "";
  if (user) {
    userEmail = user.email ?? "";
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    userName = profile?.full_name || userEmail;
  }

  const site = user ? await getCurrentPublishedSite(supabase, user.id) : null;

  let days: { date: string; label: string; count: number }[] = [];
  let topPages: { path: string; count: number }[] = [];
  let topReferrers: { referrer: string; count: number }[] = [];
  let total = 0;
  let today = 0;
  let formSubmissions: { id: string; pagePath: string; name: string | null; email: string | null; message: string; createdAt: string }[] = [];

  if (site) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - (DAYS - 1));
    since.setUTCHours(0, 0, 0, 0);

    const { data: rows } = await supabase
      .from("site_pageviews")
      .select("path, referrer, visited_at")
      .eq("site_id", site.id)
      .gte("visited_at", since.toISOString());

    const byDay = new Map<string, number>();
    const byPath = new Map<string, number>();
    const byReferrer = new Map<string, number>();
    const todayKey = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < DAYS; i++) {
      const d = new Date(since);
      d.setUTCDate(d.getUTCDate() + i);
      byDay.set(d.toISOString().slice(0, 10), 0);
    }

    for (const row of rows ?? []) {
      const dayKey = row.visited_at.slice(0, 10);
      byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + 1);
      byPath.set(row.path, (byPath.get(row.path) ?? 0) + 1);
      const ref = row.referrer || "Direkt eller okänd källa";
      byReferrer.set(ref, (byReferrer.get(ref) ?? 0) + 1);
      total += 1;
      if (dayKey === todayKey) today += 1;
    }

    days = Array.from(byDay.entries()).map(([date, count]) => ({
      date,
      label: new Date(date + "T00:00:00Z").toLocaleDateString("sv-SE", { day: "numeric", month: "short" }),
      count,
    }));
    topPages = Array.from(byPath.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([path, count]) => ({ path, count }));
    topReferrers = Array.from(byReferrer.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([referrer, count]) => ({ referrer, count }));

    const { data: submissionRows } = await supabase
      .from("site_form_submissions")
      .select("id, page_path, name, email, message, created_at")
      .eq("site_id", site.id)
      .order("created_at", { ascending: false })
      .limit(50);

    formSubmissions = (submissionRows ?? []).map((r) => ({
      id: r.id,
      pagePath: r.page_path,
      name: r.name,
      email: r.email,
      message: r.message,
      createdAt: r.created_at,
    }));
  }

  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <AccountHeader active="/statistik" userName={userName} userEmail={userEmail} />

      <div className="flex-1 px-6 md:px-12 py-10 max-w-[900px] w-full mx-auto">
        <h1 className="text-[28px] font-medium mb-1.5">Statistik</h1>
        {!site ? (
          <p className="text-[14.5px] text-ink-dim mt-3">
            Du har ingen genererad sajt ännu.{" "}
            <Link href="/onboarding/1" className="font-semibold underline">
              Gå till onboardingen
            </Link>
          </p>
        ) : (
          <>
            <p className="text-[14.5px] text-ink-dim mb-7">
              Besökare och sidvisningar för {site.name}, senaste {DAYS} dagarna. Ingen
              cookie, inget besökar-id — vi sparar bara vilken sida och varifrån.
            </p>
            <StatistikClient
              days={days}
              topPages={topPages}
              topReferrers={topReferrers}
              total={total}
              today={today}
              formSubmissions={formSubmissions}
            />
          </>
        )}
      </div>
    </div>
  );
}
