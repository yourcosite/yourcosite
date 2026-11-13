import { msg } from "@/lib/i18n/config";
import type { Section, SiteContent } from "@/lib/contentModel";
import { buildDemoContent } from "@/lib/demoSite";
import { buildFootballExample } from "@/lib/exempelFotboll";

// Katalogen över sektionstyper och deras layouter, för mallgalleriet i
// redigeraren ("Mallar" bredvid Historik). Varje layout har det tekniska
// namnet (id) som Millie förstår, ett svenskt namn och ett riktigt exempel
// som renderas av samma kod som sajterna. Lägger du till en layout i
// lib/contentModel.ts: lägg till den här också (scripts/check-section-catalog.cjs
// larmar annars).

export type CatalogLayout = { id: string; label: string };
export type CatalogType = {
  type: string;
  name: string; // vad man säger till Millie, t.ex. "Om oss-sektionen"
  layouts: CatalogLayout[];
};

const L = (id: string, label: string): CatalogLayout => ({ id, label });

export const SECTION_CATALOG: CatalogType[] = [
  {
    type: "hero", name: msg("Toppbild (hero)"),
    layouts: [
      L("centered", msg("Centrerad")),
      L("split-left", msg("Delad, bild till vänster")),
      L("split-right", msg("Delad, bild till höger")),
      L("overlay-bottom", msg("Text nedtill över bilden")),
      L("fade-bottom", msg("Bild som tonar nedåt")),
      L("fade-both", msg("Toningssektion")),
      L("card-over", msg("Ruta över helbild")),
      L("collage", msg("Bildcollage")),
      L("quad", msg("Text och hög bild")),
      L("editorial", msg("Redaktionell")),
      L("beam", msg("Mörk med sidoton")),
    ],
  },
  {
    type: "about", name: msg("Om oss"),
    layouts: [
      L("text-left", msg("Vänsterställd text")),
      L("centered", msg("Centrerad")),
      L("stats-split", msg("Två foton och nyckeltal")),
      L("image-full", msg("Helbild bredvid text")),
      L("image-stats", msg("Helbild och nyckeltal")),
      L("image-left", msg("Bild till vänster")),
      L("image-right", msg("Bild till höger")),
    ],
  },
  {
    type: "grid", name: msg("Rutnät (tjänster, fördelar)"),
    layouts: [
      L("cards", msg("Kort")), L("alternating-rows", msg("Växlande rader")), L("list", msg("Lista")),
      L("numbered", msg("Numrerad")), L("bento", msg("Mosaik")), L("icon-row", msg("Ikonrad")),
      L("divided-columns", msg("Avdelade kolumner")), L("intro-divided", msg("Intro och kolumner")),
      L("icon-cards", msg("Ikonkort")), L("icon-circles", msg("Ikoncirklar")), L("icon-list", msg("Ikonlista")),
      L("icon-top-rule", msg("Ikoner med linje")), L("image-cta-cards", msg("Bildkort med knapp")),
    ],
  },
  {
    type: "testimonials", name: msg("Omdömen"),
    layouts: [
      L("single-quote", msg("Ett citat")), L("carousel-row", msg("Kort sida vid sida")),
      L("side-by-side", msg("Rubrik och citat")), L("full-bleed", msg("Citat över helbild")),
      L("carousel-arrows", msg("Bläddra med pilar")),
    ],
  },
  {
    type: "cta", name: msg("Uppmaning (knappruta)"),
    layouts: [
      L("centered", msg("Centrerad")), L("split", msg("Delad")), L("image-bleed", msg("Text över helbild")),
      L("dark-split", msg("Mörk delad")), L("fade-bottom", msg("Bild som tonar nedåt")), L("fade-both", msg("Toningssektion")),
    ],
  },
  {
    type: "image", name: msg("Ren bild (utan text)"),
    layouts: [L("plain", msg("Bara bilden")), L("fade-top", msg("Tonar uppåt")), L("fade-bottom", msg("Tonar nedåt")), L("fade-both", msg("Tonar åt båda håll")), L("tall", msg("Extra hög")), L("tall-fade-both", msg("Extra hög, tonar åt båda håll")), L("row-3", msg("Tre bilder på rad")), L("row-4", msg("Fyra bilder på rad"))],
  },
  { type: "contact", name: msg("Kontaktuppgifter"), layouts: [L("centered", msg("Centrerad")), L("split-info", msg("Delad med uppgifter"))] },
  { type: "faq", name: msg("Vanliga frågor"), layouts: [L("stacked", msg("En lång lista")), L("two-column", msg("Två spalter"))] },
  {
    type: "booking", name: msg("Bokning"),
    layouts: [L("standard", msg("Standard")), L("compact", msg("Kompakt")), L("image-left", msg("Bild till vänster")), L("image-right", msg("Bild till höger")), L("image-background", msg("Bild som bakgrund"))],
  },
  { type: "map", name: msg("Karta"), layouts: [L("inline", msg("I sidans bredd")), L("full-bleed", msg("Hela bredden"))] },
  {
    type: "gallery", name: msg("Galleri"),
    layouts: [L("grid", msg("Två kolumner")), L("tiles", msg("Tätt rutnät")), L("masonry", msg("Murverk")), L("mosaic", msg("Mosaik")), L("carousel", msg("Svepbar rad"))],
  },
  {
    type: "team", name: msg("Personer (team)"),
    layouts: [L("cards", msg("Kort")), L("round", msg("Runda porträtt")), L("rows", msg("Lista")), L("overlay", msg("Foto med text över"))],
  },
  { type: "menu", name: msg("Meny"), layouts: [L("classic", msg("Klassisk")), L("elegant", msg("Elegant")), L("cards", msg("Kort")), L("tabs", msg("Flikar"))] },
  { type: "contactForm", name: msg("Kontaktformulär"), layouts: [L("centered", msg("Centrerad")), L("split-map", msg("Formulär och karta"))] },
  { type: "fixtures", name: msg("Matcher och resultat"), layouts: [L("list", msg("Lista")), L("cards", msg("Kort"))] },
];

// Ett riktigt exempel: en sektion ur demon (eller fotbollsexemplet för
// matcher) med vald layout, på en egen sida utan meny och sidfot.
export function sampleContent(type: string, layout: string): SiteContent | null {
  const demo = buildDemoContent();
  let source = demo;
  let section: Section | undefined = demo.pages.flatMap((p) => p.sections).find((s) => s.type === type);
  if (!section && type === "image") {
    section = { id: "gallery-sample", type: "image", layout: "plain", imageUrl: "/images/salong-herr.jpg" } as Section;
  }
  if (type === "image" && section) {
    const imgs = ["herr", "herrklipp", "sax", "verktyg"].map((n) => ({ imageUrl: `/images/salong-${n}.jpg` }));
    section = { ...section, imageUrl: imgs[0].imageUrl, items: imgs } as Section;
  }
  if (!section && type === "fixtures") {
    source = buildFootballExample((s: string) => s);
    section = source.pages.flatMap((p) => p.sections).find((s) => s.type === "fixtures");
  }
  if (!section) return null;
  const sample = { ...section, id: "gallery-sample", layout } as Section;
  return { ...source, pages: [{ path: "/", label: "Hem", sections: [sample] }] };
}
