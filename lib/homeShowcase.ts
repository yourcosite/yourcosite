import { createAdminClient } from "@/lib/supabase/admin";
import { isValidSiteContent } from "@/lib/contentModel";
import { shareImageFor } from "@/lib/siteMeta";

// Den senast publicerade sajten vars ägare valt att visa den på startsidan
// (sites.show_on_homepage). Null om ingen finns, eller om kolumnen ännu
// saknas i databasen (supabase/startsida-visa.sql).
export type Showcase = { name: string; url: string; image: string; description: string | null; needsImage: boolean };

export async function getLatestShowcase(): Promise<Showcase | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("sites")
      .select("*")
      .eq("status", "live")
      .eq("show_on_homepage", true)
      .not("content", "is", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(5);
    for (const s of data ?? []) {
      if (!isValidSiteContent(s.content)) continue;
      const active = s.custom_domain && s.custom_domain_status === "active";
      const url = active ? `https://${s.custom_domain}` : s.slug ? `https://${String(s.slug).toLowerCase()}.yourcosite.com` : null;
      if (!url) continue;
      const desc = s.content.pages[0]?.seoDescription?.trim() || null;
      const shot = typeof s.showcase_image_url === "string" && s.showcase_image_url ? s.showcase_image_url : null;
      return { name: s.name, url, image: shot ?? shareImageFor({ id: s.id, content: s.content }), description: desc, needsImage: !shot };
    }
  } catch {
    /* tyst: startsidan fungerar utan */
  }
  return null;
}
