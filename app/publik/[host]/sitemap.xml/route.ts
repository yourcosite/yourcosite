import { findPublicSite } from "@/lib/publicSite";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { host: string } }) {
  const host = decodeURIComponent(params.host);
  const found = await findPublicSite({ host });
  const paths = found.state === "live" ? found.site.content.pages.map((p) => p.path) : [];
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .map((p) => `  <url><loc>${esc(`https://${host}${p === "/" ? "" : p}`)}</loc></url>`)
    .join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
