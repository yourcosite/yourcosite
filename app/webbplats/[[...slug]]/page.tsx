import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SitePreview from "@/components/SitePreview";
import { isValidSiteContent } from "@/lib/contentModel";

// Riktig, klickbar förhandsvisning av kundens genererade sajt — man kan
// surfa mellan sidorna precis som en besökare skulle, inte bara se
// förstasidan. Chattredigeraren (/redigera) är fortfarande nästa fas och
// inte kopplad till det här innehållet än.
export default async function WebsitePreviewPage({
  params,
}: {
  params: { slug?: string[] };
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

  const { data: site } = await supabase
    .from("sites")
    .select("*")
    .eq("owner_id", user.id)
    .not("content", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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
  const content = site.content;

  return (
    <div className="min-h-screen bg-[#E5E3DD] flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-[900px] flex items-center justify-between mb-4 px-1">
        <div className="text-[13px] text-ink-dim">
          Förhandsvisning av <span className="font-semibold text-ink">{site.name}</span> — klicka runt i menyn för att se alla sidor.
        </div>
        <Link
          href="/redigera"
          className="text-[13px] font-semibold bg-accent text-accent-ink px-4 py-2 rounded-lg flex-shrink-0"
        >
          Fortsätt till redigeraren →
        </Link>
      </div>

      <div className="w-full max-w-[900px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="h-[38px] bg-[#F1EFE9] flex items-center gap-1.5 px-3.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E4635A]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#E8B14A]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#58C36C]" />
          <div className="flex-1 text-center text-[11.5px] text-ink-dim">
            {site.name?.toLowerCase().replace(/\s+/g, "")}.yourcosite.com{requestedPath !== "/" ? requestedPath : ""}
          </div>
        </div>
        <SitePreview content={content} siteName={site.name} activePath={requestedPath} basePath="/webbplats" />
      </div>
    </div>
  );
}
