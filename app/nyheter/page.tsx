import Link from "next/link";
import Logo from "@/components/Logo";
import NewsClient from "./NewsClient";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { getSiteNewsArticles, getSiteNewsCategories } from "@/lib/newsArticles";

export const dynamic = "force-dynamic";

// Riktig nyhetshantering för kundens sajt — skriv, publicera, avpublicera
// och ta bort egna artiklar (tabellen site_news_articles, se
// supabase/schema.sql). Artiklarna visas på sajten via sektionstypen
// "newsList" (lib/contentModel.ts), som kunden lägger till på en sida i
// chattredigeraren. Länkad från /sidor.
export default async function NyheterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const site = user ? await getCurrentPublishedSite(supabase, user.id) : null;
  const articles = site ? await getSiteNewsArticles(supabase, site.id) : [];
  const categories = site ? await getSiteNewsCategories(supabase, site.id) : [];

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
            <div className="text-[11.5px] text-ink-dim">Nyheter</div>
          </div>
        </div>
        <Link
          href="/redigera"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-ink bg-bg border border-line px-4 py-2 rounded-full"
        >
          ← Till redigeraren
        </Link>
      </div>

      <div className="flex-1 px-6 md:px-12 py-8 flex justify-center">
        <div className="w-full max-w-[720px]">
          <h1 className="text-[27px] font-medium mb-1.5">Nyheter</h1>
          <p className="text-[13.5px] text-ink-dim mb-5.5">
            Skriv och publicera nyheter till er sajt. En publicerad artikel syns genast — lägg
            till en nyhetssektion på en sida i chattredigeraren om ni inte redan har en, så
            artiklarna visas där.
          </p>

          {!site ? (
            <p className="text-[14.5px] text-ink-dim">
              Du har ingen genererad sajt ännu.{" "}
              <Link href="/onboarding/1" className="font-semibold underline">
                Gå till onboardingen
              </Link>
            </p>
          ) : (
            <NewsClient initialArticles={articles} initialCategories={categories} />
          )}
        </div>
      </div>
    </div>
  );
}
