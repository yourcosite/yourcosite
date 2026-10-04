import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { isValidSiteContent } from "@/lib/contentModel";
import WebsitePreviewFrame from "@/components/WebsitePreviewFrame";

// Alltid färskt innehåll — ingen cachning av det här utkastet, som annars
// kan visas kort efter att sajten precis byggts om (se next.config.mjs).
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Samma webbläsarram med dator-/mobilläge som /webbplats, men öppnad från
// chattredigeraren ("Förhandsgranska"-knappen i app/redigera/page.tsx)
// istället för direkt efter att kunden valt en stilvariant på /forslag.
// Här har kunden redan valt sin variant och redigerar sajten — "Välj en
// annan variant"-länken på /webbplats hör hemma i DEN flödet, inte här,
// så det är en egen, enklare sida istället för att återanvända /webbplats
// med villkor.
export default async function EditorPreviewPage({
  params,
  searchParams,
}: {
  params: { slug?: string[] };
  searchParams?: { site?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-dim text-[14.5px]">
        Du måste vara inloggad för att se detta.
      </div>
    );
  }

  // ?site=<id> skickas med från redigeraren (se app/redigera/page.tsx) så
  // att förhandsvisningen garanterat visar SAMMA sajt kunden redigerar,
  // inte bara "senaste sajten" — se getCurrentPublishedSite för bakgrunden.
  const site = await getCurrentPublishedSite(supabase, user.id, searchParams?.site || null);

  if (!site || !isValidSiteContent(site.content)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 gap-3">
        <p className="text-[15px] text-ink-dim">
          Du har ingen genererad sajt ännu.
        </p>
        <Link href="/onboarding/1" className="text-[14px] font-semibold underline">
          Gå till onboardingen →
        </Link>
      </div>
    );
  }

  const requestedPath = "/" + (params.slug?.join("/") || "");
  const domainLabel = `${site.name?.toLowerCase().replace(/\s+/g, "")}.yourcosite.com`;

  return (
    <div className="min-h-screen bg-[#E5E3DD] flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-[1560px] flex items-center justify-between mb-4 px-1">
        <Link
          href={`/redigera?site=${site.id}`}
          className="text-[13px] font-semibold text-ink-dim flex-shrink-0"
        >
          ← Tillbaka till redigeraren
        </Link>
      </div>

      <WebsitePreviewFrame
        siteName={site.name}
        domainLabel={domainLabel}
        contentPath={`/webbplats-innehall${requestedPath}`}
      />
    </div>
  );
}
