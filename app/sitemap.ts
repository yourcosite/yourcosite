import type { MetadataRoute } from "next";
import { LOCALES, LOCALIZED_SITEMAP_PATHS, localizedPath } from "@/lib/i18n/config";

const BASE = "https://yourcosite.vercel.app";

// Varje publik sida finns i sju språkversioner som pekar på varandra.
export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALIZED_SITEMAP_PATHS.flatMap((path) =>
    LOCALES.map((l) => ({
      url: BASE + localizedPath(path, l),
      lastModified: new Date("2026-10-22"),
      alternates: {
        languages: Object.fromEntries(LOCALES.map((x) => [x, BASE + localizedPath(path, x)])),
      },
    }))
  );
}
