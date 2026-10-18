import Link from "next/link";
import Logo from "@/components/Logo";
import BookingClient from "./BookingClient";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";

export const dynamic = "force-dynamic";

// Bokningssystemet för kundens sajt: bokningar, paket, tider och
// inställningar. Besökarna bokar via sektionen "booking" på sajten
// (lib/contentModel.ts); allt sparas i tabellerna booking_* och bookings.
export default async function BokningarPage({ searchParams }: { searchParams?: { site?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const site = user ? await getCurrentPublishedSite(supabase, user.id, searchParams?.site || null) : null;

  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-line bg-surface flex-shrink-0">
        <div className="flex items-center gap-5">
          <Link href="/dashboard">
            <Logo light={false} />
          </Link>
          <div className="w-px h-5.5 bg-line" />
          <div>
            <div className="text-[14px] font-semibold">{site?.name || "Din sajt"}</div>
            <div className="text-[11.5px] text-ink-dim">Bokningar</div>
          </div>
        </div>
        <Link
          href={`/redigera${site ? `?site=${site.id}` : ""}`}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-ink bg-bg border border-line px-4 py-2 rounded-full"
        >
          ← Till redigeraren
        </Link>
      </div>
      <div className="flex-1 px-4 md:px-12 py-8 flex justify-center">
        <div className="w-full max-w-[780px]">
          <h1 className="text-[27px] font-medium mb-1.5">Bokningar</h1>
          {!site ? (
            <div className="bg-white border border-line rounded-xl p-6 text-center text-ink-dim text-[14px]">
              Hittade ingen publicerad sajt ännu. Publicera sajten först, så kan du ta emot bokningar.
            </div>
          ) : (
            <BookingClient siteId={site.id} />
          )}
        </div>
      </div>
    </div>
  );
}
