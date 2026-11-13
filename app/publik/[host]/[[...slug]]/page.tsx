import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findPublicSite, pathFromSlug, publicMetadata, renderPublicSite, UnavailablePage } from "@/lib/publicSite";

// Kundens egen domän. Middleware skriver om alla anrop på en okänd värd till
// /publik/<värd>/<sökväg>, och sajten visas på domänens rot (basePath "/").
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { host: string; slug?: string[] } }): Promise<Metadata> {
  const host = decodeURIComponent(params.host);
  const found = await findPublicSite({ host });
  if (found.state !== "live") return { robots: { index: false } };
  const path = pathFromSlug(params.slug);
  return { ...publicMetadata(found.site, path, `https://${host}${path === "/" ? "" : path}`, true), metadataBase: new URL(`https://${host}`) };
}

export default async function PublicHostPage({ params }: { params: { host: string; slug?: string[] } }) {
  const found = await findPublicSite({ host: decodeURIComponent(params.host) });
  if (found.state === "none") notFound();
  if (found.state === "paused") return <UnavailablePage paused />;
  return renderPublicSite(found.site, pathFromSlug(params.slug), "/");
}
