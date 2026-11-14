import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isReservedSlug } from "@/lib/reservedSlugs";
import { findPublicSite, pathFromSlug, publicMetadata, renderPublicSite, UnavailablePage } from "@/lib/publicSite";

// Publik adress utan egen domän: www.yourcosite.com/<namn>. Har sajten fått
// en aktiv egen domän slutar den gemensamma adressen fungera (404): sajten
// ska bara finnas på kundens egen adress.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { key: string; slug?: string[] } }): Promise<Metadata> {
  if (params.key.includes(".") || isReservedSlug(params.key)) return { robots: { index: false } };
  const found = await findPublicSite({ slug: params.key });
  if (found.state !== "live") return { robots: { index: false } };
  const path = pathFromSlug(params.slug);
  return publicMetadata(found.site, path, null, true);
}

export default async function PublicSlugPage({ params }: { params: { key: string; slug?: string[] } }) {
  if (params.key.includes(".") || isReservedSlug(params.key)) notFound();
  const found = await findPublicSite({ slug: params.key });
  if (found.state === "none") notFound();
  if (found.state === "paused") return <UnavailablePage paused />;
  const site = found.site;
  const path = pathFromSlug(params.slug);
  if (site.custom_domain && site.custom_domain_status === "active") notFound();
  return renderPublicSite(found.site, path, `/${params.key}`);
}
