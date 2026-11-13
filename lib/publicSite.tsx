import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteNewsArticles } from "@/lib/newsArticles";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import SitePreview from "@/components/SitePreview";

// Publika sajter: vem som helst kan titta, bara sajter med status "live" visas.
// Två adresser går hit: www.yourcosite.com/s/<slug> och kundens egen domän
// (middleware skriver om värdnamnet till /publik/<domän>). Läser med
// admin-klienten eftersom besökaren inte är inloggad.

export const normalizeHost = (h: string) => h.trim().toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");

export type PublicSite = { id: string; name: string; content: SiteContent; language: string; currency: string; slug: string | null; custom_domain: string | null; custom_domain_status?: string | null; status: string; privacy_policy_mode: any; privacy_policy_file_url: any; privacy_policy_text: any };

export type PublicLookup = { state: "live"; site: PublicSite } | { state: "paused" } | { state: "none" };

export async function findPublicSite(by: { slug?: string; host?: string }): Promise<PublicLookup> {
  const admin = createAdminClient();
  let q = admin.from("sites").select("*").not("content", "is", null).limit(1);
  if (by.slug) q = q.ilike("slug", by.slug.replace(/[%_]/g, ""));
  else if (by.host) q = q.ilike("custom_domain", normalizeHost(by.host).replace(/[%_]/g, ""));
  else return { state: "none" };
  const { data } = await q.maybeSingle();
  if (!data || !isValidSiteContent(data.content)) return { state: "none" };
  if (data.status === "pausad") return { state: "paused" };
  if (data.status !== "live") return { state: "none" };
  return { state: "live", site: data as PublicSite };
}

export function pathFromSlug(slug?: string[]): string {
  return "/" + (slug?.join("/") || "");
}

export function publicMetadata(site: PublicSite, requestedPath: string, canonical: string | null, index: boolean): Metadata {
  const page = site.content.pages.find((p) => p.path === requestedPath) ?? site.content.pages[0];
  const title = page?.seoTitle || (page && page.path !== "/" && page.label ? `${page.label} | ${site.name}` : site.name);
  const description = page?.seoDescription || undefined;
  return {
    title,
    description,
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
    alternates: canonical ? { canonical } : undefined,
    openGraph: { title, description, siteName: site.name, type: "website" },
  };
}

export async function renderPublicSite(site: PublicSite, requestedPath: string, basePath: string) {
  const admin = createAdminClient();
  const newsArticles = await getSiteNewsArticles(admin, site.id);
  return (
    <SitePreview
      content={site.content}
      siteName={site.name}
      siteId={site.id}
      lang={site.language as any}
      currency={site.currency as any}
      activePath={requestedPath}
      basePath={basePath}
      privacyPolicyMode={site.privacy_policy_mode}
      privacyPolicyFileUrl={site.privacy_policy_file_url}
      privacyPolicyText={site.privacy_policy_text}
      newsArticles={newsArticles}
    />
  );
}

export function UnavailablePage({ paused }: { paused?: boolean }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24, fontFamily: "system-ui, sans-serif", color: "#555" }}>
      {paused ? "Den här sajten är tillfälligt otillgänglig." : "Sajten hittades inte."}
    </div>
  );
}
