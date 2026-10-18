import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import AccountHeader from "@/components/AccountHeader";
import BookingClient from "./BookingClient";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";

export const dynamic = "force-dynamic";

// Bokningssystemet för kundens sajt: bokningar, paket, tider och
// inställningar. Nås från kundzonens meny, från sajtkorten på dashboarden
// och från redigeraren. Besökarna bokar via sektionen "booking" på sajten
// (lib/contentModel.ts); allt sparas i tabellerna booking_* och bookings.
export default async function BokningarPage({ searchParams }: { searchParams?: { site?: string } }) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userName = t("Ditt konto");
  let userEmail = "";
  let site: { id: string; name: string } | null = null;
  let allSites: { id: string; name: string }[] = [];

  if (user) {
    userEmail = user.email ?? "";
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    userName = profile?.full_name || userEmail;
    site = await getCurrentPublishedSite(supabase, user.id, searchParams?.site || null);
    const { data: rows } = await supabase
      .from("sites")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    allSites = rows ?? [];
  }

  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <AccountHeader active="/bokningar" userName={userName} userEmail={userEmail} />
      <div className="flex-1 px-4 md:px-12 py-8 flex justify-center">
        <div className="w-full max-w-[780px]">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-1.5">
            <h1 className="text-[27px] font-medium">{t("Bokningar")}</h1>
            {site && (
              <Link
                href={`/redigera?site=${site.id}`}
                className="text-[13px] font-semibold text-ink bg-surface border border-line px-4 py-2 rounded-full"
              >
                {t("Till redigeraren")}
              </Link>
            )}
          </div>
          {allSites.length > 1 && site && (
            <div className="flex gap-1.5 flex-wrap mb-4">
              {allSites.map((s) => (
                <Link
                  key={s.id}
                  href={`/bokningar?site=${s.id}`}
                  className={`text-[12.5px] font-semibold px-3.5 py-1.5 rounded-full border ${
                    s.id === site!.id ? "bg-ink text-white border-ink" : "bg-surface text-ink-dim border-line"
                  }`}
                >
                  {s.name}
                </Link>
              ))}
            </div>
          )}
          {!site ? (
            <div className="bg-white border border-line rounded-xl p-6 text-center text-ink-dim text-[14px]">
              {t("Hittade ingen publicerad sajt ännu. Publicera sajten först, så kan du ta emot bokningar.")}
            </div>
          ) : (
            <BookingClient key={site.id} siteId={site.id} />
          )}
        </div>
      </div>
    </div>
  );
}
