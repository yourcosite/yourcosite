import { createAdminClient } from "@/lib/supabase/admin";
import { screenshotUrl } from "@/lib/siteScreenshot";

// Adressen en publicerad sajt har just nu (egen domän om den är aktiv).
export function publicUrlOf(site: { slug: string | null; custom_domain: string | null; custom_domain_status?: string | null }): string | null {
  if (site.custom_domain && site.custom_domain_status === "active") return `https://${site.custom_domain}`;
  return site.slug ? `https://${site.slug.toLowerCase()}.yourcosite.com` : null;
}

// Fotar sajten, sparar bilden i bucketen "logos" (publik) och lägger adressen
// i sites.showcase_image_url. Returnerar adressen, eller null om det inte gick.
export async function generateShowcaseImage(siteId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: site } = await admin.from("sites").select("*").eq("id", siteId).maybeSingle();
  if (!site || site.status !== "live") return null;
  const url = publicUrlOf(site);
  if (!url) return null;
  try {
    const jpg = await screenshotUrl(url);
    const path = `showcase/${siteId}.jpg`;
    const { error } = await admin.storage.from("logos").upload(path, jpg, { contentType: "image/jpeg", upsert: true, cacheControl: "3600" });
    if (error) throw error;
    const publicUrl = `${admin.storage.from("logos").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
    const { error: upErr } = await admin.from("sites").update({ showcase_image_url: publicUrl }).eq("id", siteId);
    if (upErr) throw upErr;
    return publicUrl;
  } catch (e) {
    console.error("[showcase] kunde inte skapa förhandsbild", e);
    return null;
  }
}
