import { createClient } from "@/lib/supabase/server";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
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

  const site = await getCurrentPublishedSite(supabase, user.id);
  if (!site || !isValidSiteContent(site.content)) return null;

  const requestedPath = "/" + (params.slug?.join("/") || "");

  return (
    <SitePreview
      content={site.content}
      siteName={site.name}
      activePath={requestedPath}
      basePath="/webbplats-innehall"
      privacyPolicyMode={site.privacy_policy_mode}
      privacyPolicyFileUrl={site.privacy_policy_file_url}
      privacyPolicyText={site.privacy_policy_text}
    />
  );
}
