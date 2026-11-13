import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { findPublicSite, pathFromSlug, publicMetadata, renderPublicSite, UnavailablePage } from "@/lib/publicSite";

// Publik adress utan egen domän: www.yourcosite.com/s/<namn>. Har sajten fått
// en aktiv egen domän skickas besökaren dit istället.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { key: string; slug?: string[] } }): Promise<Metadata> {
  const found = await findPublicSite({ slug: params.key });
  if (found.state !== "live") return { robots: { index: false } };
  const path = pathFromSlug(params.slug);
  const hasDomain = found.site.custom_domain && found.site.custom_domain_status === "active";
  return publicMetadata(found.site, path, hasDomain ? `https://${found.site.custom_domain}${path === "/" ? "" : path}` : null, !hasDomain);
}

export default async function PublicSlugPage({ params }: { params: { key: string; slug?: string[] } }) {
  const found = await findPublicSite({ slug: params.key });
  if (found.state === "none") notFound();
  if (found.state === "paused") return <UnavailablePage paused />;
  const site = found.site;
  const path = pathFromSlug(params.slug);
  if (site.custom_domain && site.custom_domain_status === "active") {
    permanentRedirect(`https://${site.custom_domain}${path === "/" ? "" : path}`);
  }
  return renderPublicSite(found.site, path, `/s/${params.key}`);
}
