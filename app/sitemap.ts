import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { LOCALES, LOCALIZED_SITEMAP_PATHS, localizedPath } from "@/lib/i18n/config";

const BASE = "https://www.yourcosite.com";

// Varje publik sida finns i sju språkversioner som pekar på varandra.
export const revalidate = 3600;

// Publicerade kundsajter utan egen domän hör hemma i vår sitemap (sajter med
// egen domän har sin egen sitemap på sin domän).
async function customerSites(): Promise<MetadataRoute.Sitemap> {
  try {
    const { data } = await createAdminClient()
      .from("sites")
      .select("slug, published_at, custom_domain, custom_domain_status")
      .eq("status", "live")
      .not("slug", "is", null)
      .limit(5000);
    return (data ?? [])
      .filter((s) => s.slug && !(s.custom_domain && s.custom_domain_status === "active"))
      .map((s) => ({
        url: `${BASE}/${s.slug}`,
        lastModified: s.published_at ? new Date(s.published_at) : new Date(),
      }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const own = LOCALIZED_SITEMAP_PATHS.flatMap((path) =>
    LOCALES.map((l) => ({
      url: BASE + localizedPath(path, l),
      lastModified: new Date("2026-10-22"),
      alternates: {
        languages: Object.fromEntries(LOCALES.map((x) => [x, BASE + localizedPath(path, x)])),
      },
    }))
  );
  return [...own, ...(await customerSites())];
}
