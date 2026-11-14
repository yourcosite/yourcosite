import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteNewsArticles } from "@/lib/newsArticles";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import SitePreview from "@/components/SitePreview";
import { faviconFor, shareImageFor } from "@/lib/siteMeta";
import { isReservedSlug } from "@/lib/reservedSlugs";

// Publika sajter: vem som helst kan titta, bara sajter med status "live" visas.
// Två adresser går hit: <namn>.yourcosite.com (tjänstens egen subdomän) och
// kundens egna domän (middleware skriver om värdnamnet till /publik/<värd>). Läser med
// admin-klienten eftersom besökaren inte är inloggad.

export const normalizeHost = (h: string) => h.trim().toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");

/** "kund" för kund.yourcosite.com. Null för alla andra värdar och för reserverade namn. */
export function platformSubdomain(host: string): string | null {
  const m = /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.yourcosite\.com$/.exec(host.trim().toLowerCase().replace(/:\d+$/, ""));
  if (!m || isReservedSlug(m[1])) return null;
  return m[1];
}

export type PublicSite = { id: string; name: string; content: SiteContent; language: string; currency: string; slug: string | null; custom_domain: string | null; custom_domain_status?: string | null; status: string; privacy_policy_mode: any; privacy_policy_file_url: any; privacy_policy_text: any };

export type PublicLookup = { state: "live"; site: PublicSite } | { state: "paused" } | { state: "none" };

export async function findPublicSite(by: { slug?: string; host?: string }): Promise<PublicLookup> {
  const admin = createAdminClient();
  let q = admin.from("sites").select("*").not("content", "is", null).limit(1);
  if (by.slug) q = q.ilike("slug", by.slug.replace(/[%_]/g, ""));
  else if (by.host) {
    const sub = platformSubdomain(by.host);
    if (sub) q = q.ilike("slug", sub);
    else if (/\.yourcosite\.com$/i.test(by.host.replace(/:\d+$/, ""))) return { state: "none" };
    else q = q.ilike("custom_domain", normalizeHost(by.host).replace(/[%_]/g, ""));
  } else return { state: "none" };
  const { data } = await q.maybeSingle();
  if (!data || !isValidSiteContent(data.content)) return { state: "none" };
  // Har sajten en aktiv egen domän visas den bara där, inte på subdomänen.
  if (by.host && platformSubdomain(by.host) && data.custom_domain && data.custom_domain_status === "active") return { state: "none" };
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
    icons: { icon: faviconFor(site), shortcut: faviconFor(site), apple: faviconFor(site) },
    openGraph: { title, description, siteName: site.name, type: "website", images: [{ url: shareImageFor(site) }] },
    twitter: { card: "summary_large_image", title, description, images: [shareImageFor(site)] },
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
