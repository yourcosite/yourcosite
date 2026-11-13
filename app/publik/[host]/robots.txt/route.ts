import { findPublicSite } from "@/lib/publicSite";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { host: string } }) {
  const host = decodeURIComponent(params.host);
  const found = await findPublicSite({ host });
  const body = found.state === "live"
    ? `User-agent: *\nAllow: /\nSitemap: https://${host}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
