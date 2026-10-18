import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteNewsArticles } from "@/lib/newsArticles";
import { isValidSiteContent } from "@/lib/contentModel";
import SitePreview from "@/components/SitePreview";

// Delad förhandsvisning: vem som helst med den signerade länken kan titta
// på sajten, men inte ändra något. Aldrig indexerad av sökmotorer.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SharedPreview({
  params,
}: {
  params: { token: string; slug?: string[] };
}) {
  const admin = createAdminClient();
  // Länken är id:t på en rad i share_links — giltig bara om den inte
  // stängts av och inte gått ut.
  const { data: link } = /^[0-9a-fA-F-]{36}$/.test(params.token)
    ? await admin.from("share_links").select("site_id, expires_at, revoked_at").eq("id", params.token).maybeSingle()
    : { data: null };
  if (!link || link.revoked_at || new Date(link.expires_at).getTime() < Date.now()) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6 text-[15px] text-ink-dim">
        Den här länken fungerar inte längre. Be avsändaren skapa en ny.
      </div>
    );
  }
  const siteId = link.site_id;

  const { data: site } = await admin.from("sites").select("*").eq("id", siteId).not("content", "is", null).maybeSingle();
  if (!site || !isValidSiteContent(site.content)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6 text-[15px] text-ink-dim">
        Sajten finns inte längre.
      </div>
    );
  }

  const requestedPath = "/" + (params.slug?.join("/") || "");
  const newsArticles = await getSiteNewsArticles(admin, site.id);

  return (
    <div>
      <div className="bg-[#17171A] text-white text-[12.5px] text-center px-4 py-2">
        Delad förhandsvisning av {site.name}. Sajten är inte publicerad ännu och ingenting kan ändras här. Bokningar som görs är riktiga och sparas hos ägaren.
      </div>
      {/* siteId skickas medvetet inte med: ett testinskick i kontaktformuläret ska inte sparas hos kunden. */}
      <SitePreview
        content={site.content}
        siteName={site.name}
        activePath={requestedPath}
        basePath={`/dela/${params.token}`}
        privacyPolicyMode={site.privacy_policy_mode}
        privacyPolicyFileUrl={site.privacy_policy_file_url}
        privacyPolicyText={site.privacy_policy_text}
        newsArticles={newsArticles}
        // Delade förhandsvisningar får göra riktiga bokningar (de sparas i
        // verktyget), så testare kan prova hela flödet. Inget annat sparas.
        bookingSiteId={site.id}
      />
    </div>
  );
}
