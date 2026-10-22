import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/dashboard", "/redigera", "/dela"] },
    sitemap: "https://yourcosite.vercel.app/sitemap.xml",
  };
}
