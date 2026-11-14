import { createAdminClient } from "@/lib/supabase/admin";
import { isValidSiteContent } from "@/lib/contentModel";
import { shareImageFor } from "@/lib/siteMeta";

// Den senast publicerade sajten vars ägare valt att visa den på startsidan
// (sites.show_on_homepage). Null om ingen finns, eller om kolumnen ännu
// saknas i databasen (supabase/startsida-visa.sql).
export type Showcase = { name: string; url: string; image: string; description: string | null };

export async function getLatestShowcase(): Promise<Showcase | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("sites")
      .select("id, name, slug, content, custom_domain, custom_domain_status, published_at")
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
      return { name: s.name, url, image: shareImageFor({ id: s.id, content: s.content }), description: desc };
    }
  } catch {
    /* tyst: startsidan fungerar utan */
  }
  return null;
}
