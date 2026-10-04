import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { isValidSiteContent } from "@/lib/contentModel";
import WebsitePreviewFrame from "@/components/WebsitePreviewFrame";

// Alltid färskt innehåll — ingen cachning av det här utkastet, som annars
// kan visas kort efter att sajten precis byggts om (se next.config.mjs).
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Förhandsvisning av kundens genererade sajt, i en webbläsarram med
// dator-/mobilläge (se WebsitePreviewFrame). Själva sidan renderas i en
// iframe mot /webbplats-innehall, så man kan klicka runt bland sidorna
// precis som en besökare skulle.
export default async function WebsitePreviewPage({
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

  // ?site=<id> — se motsvarande kommentar i /forhandsgranska.
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
      {/* Samma bredd som WebsitePreviewFrame.tsx:s dator-ruta (se
          kommentaren där) så raden med "Välj en annan variant"/"Fortsätt
          till redigeraren" alltid linjerar med rutans kanter. */}
      <div className="w-full max-w-[min(94vw,2000px)] flex items-center justify-between mb-4 px-1">
        <Link
          href="/forslag"
          className="text-[13px] font-semibold text-ink-dim flex-shrink-0"
        >
          ← Välj en annan variant
        </Link>
        <Link
          href={`/redigera?site=${site.id}`}
          className="text-[13px] font-semibold bg-accent text-accent-ink px-4 py-2 rounded-lg flex-shrink-0"
        >
          Fortsätt till redigeraren →
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
