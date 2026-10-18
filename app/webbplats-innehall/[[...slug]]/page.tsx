import { createClient } from "@/lib/supabase/server";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { getSiteNewsArticles } from "@/lib/newsArticles";
import SitePreview from "@/components/SitePreview";
import { isValidSiteContent } from "@/lib/contentModel";

// Samma innehåll som /webbplats, men UTAN webbläsarramen runt — det här är
// vad som faktiskt laddas i <iframe>:n på /webbplats. Genom att rendera
// den riktiga sajten i en egen iframe (istället för att bara skala ner den
// visuellt, som miniatyrerna på /forslag gör) får vi en äkta
// mobil-/datorförhandsvisning: iframens egen bredd styr vilka
// "md:"-brytpunkter som faktiskt slår till i innehållet, precis som när
// man ändrar fönsterbredden i en riktig webbläsare.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WebsiteRawContent({
  params,
}: {
  params: { slug?: string[] };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Första delen av adressen kan vara "s_<sajt-id>" — då visas just den
  // sajten (och alla länkar inne i den behåller prefixet via basePath), så
  // att ett konto med flera sajter inte råkar visa "senaste sajten".
  let slug = params.slug ?? [];
  let siteId: string | null = null;
  if (slug[0] && /^s_[0-9a-fA-F-]{36}$/.test(slug[0])) {
    siteId = slug[0].slice(2);
    slug = slug.slice(1);
  }
  const basePath = siteId ? `/webbplats-innehall/s_${siteId}` : "/webbplats-innehall";

  const site = await getCurrentPublishedSite(supabase, user.id, siteId);
  if (!site || !isValidSiteContent(site.content)) return null;

  const requestedPath = "/" + (slug.join("/") || "");
  const newsArticles = await getSiteNewsArticles(supabase, site.id);

  return (
    <SitePreview
      content={site.content}
      siteName={site.name}
      siteId={site.id}
      lang={site.language}
      currency={site.currency}
      activePath={requestedPath}
      basePath={basePath}
      privacyPolicyMode={site.privacy_policy_mode}
      privacyPolicyFileUrl={site.privacy_policy_file_url}
      privacyPolicyText={site.privacy_policy_text}
      newsArticles={newsArticles}
    />
  );
}
