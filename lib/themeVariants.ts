// Färdiga stilvarianter som visas på /forslag — samma AI-skrivna innehåll,
// olika visuella behandlingar. Kundens valda accentfärg (från onboarding
// steg 4) används i alla, bara bakgrund/typsnitt skiljer. Ingen extra
// AI-generering krävs för det här — bara CSS.
//
// Hade tidigare 3 extra varianter ("Luftig och klassisk", "Varm och
// lekfull", "Djärv och färgstark") som bara bytte typsnitt mot sin
// "syskon"-variant utan att ändra hero-layout eller annat — kundfeedback:
// för lika sina syskon för att kännas som egna, meningsfulla val. Varje
// kvarvarande variant ska ha en tydligt egen känsla (hero-layout,
// knappform, header-uppbyggnad), inte bara ett annat typsnitt.
import type { SkinId, ThemeFont, ButtonStyle, HeaderLayout, HeroLayout, AboutLayout, GridLayout, CtaLayout } from "./contentModel";

export type BackgroundMode = "light" | "warm" | "dark";

export interface ThemeVariant {
  id: string;
  label: string;
  desc: string;
  font: ThemeFont;
  backgroundMode: BackgroundMode;
  // Knappformen hör ihop med varje variants "personlighet" — inte fritt
  // kombinerbar, se ButtonStyle i lib/contentModel.ts.
  buttonStyle: ButtonStyle;
  // Samma princip, för headerns uppbyggnad — se HeaderLayout i
  // lib/contentModel.ts.
  headerLayout: HeaderLayout;
  // Och för förstasidans hero-layout — varje "känsla" ska kännas igen på
  // sin egen typ av hero (inte bara knapp/header), se HeroLayout i
  // lib/contentModel.ts. Gäller bara startsidans hero — undersidornas
  // hero-layout varieras fortfarande fritt (se SUBPAGE_HERO_LAYOUT_POOL i
  // app/api/sites/generate/route.ts) för att inte göra alla undersidor
  // identiska.
  heroLayout: HeroLayout;
  // Samma princip, fast för startsidans FÖRSTA "about"/"grid"/
  // "cta"-sektion (om någon finns) — tillkom efter kundfeedback: "exakt
  // samma under hero på alla förslag, samma ingångar och samma upplägg".
  // Precis som heroLayout ovan gäller det BARA startsidan, och bara den
  // första sektionen av respektive typ — se SiteTheme.aboutLayout m.fl. i
  // lib/contentModel.ts.
  aboutLayout: AboutLayout;
  gridLayout: GridLayout;
  ctaLayout: CtaLayout;
  recommended?: boolean;
  // Färg-/typografipaket (lib/skins.ts) — saknas på de klassiska varianterna.
  skin?: SkinId;
}

export const THEME_VARIANTS: ThemeVariant[] = [
  {
    id: "luftig",
    label: "Luftig och minimal",
    desc: "Vit bakgrund, gott om vitt utrymme, lugn och tydlig.",
    font: "sans",
    backgroundMode: "light",
    buttonStyle: "underline",
    headerLayout: "left",
    heroLayout: "fade-bottom",
    aboutLayout: "centered",
    gridLayout: "list",
    ctaLayout: "centered",
  },
  {
    id: "varm",
    label: "Varm och personlig",
    desc: "Krämig bakgrund, rundare känsla, inbjudande.",
    font: "serif",
    backgroundMode: "warm",
    buttonStyle: "pill",
    headerLayout: "centered-stacked",
    heroLayout: "centered",
    aboutLayout: "text-left",
    gridLayout: "alternating-rows",
    ctaLayout: "split",
    recommended: true,
  },
  {
    id: "djarv-elegant",
    label: "Djärv och elegant",
    desc: "Mörk bakgrund, hög kontrast, ett exklusivt redaktionellt typsnitt — syns direkt.",
    font: "serif",
    backgroundMode: "dark",
    buttonStyle: "square",
    headerLayout: "split",
    heroLayout: "overlay-bottom",
    aboutLayout: "stats-split",
    gridLayout: "bento",
    ctaLayout: "dark-split",
  },
  {
    id: "redaktionell",
    label: "Redaktionell och bildrik",
    desc: "Krämig bakgrund, en bildkollage-hero och en kursiv rubrikrad — som ett modetidskrift.",
    font: "serif",
    backgroundMode: "warm",
    buttonStyle: "pill",
    headerLayout: "left",
    heroLayout: "collage",
    aboutLayout: "text-left",
    gridLayout: "numbered",
    ctaLayout: "split",
  },
  {
    id: "norden",
    label: "Ren och strukturerad",
    desc: "Vit bakgrund, en delad hero med en stor bild till höger och ett flytande AI-kort, fyrkantiga knappar — skarp och ordnad.",
    font: "sans",
    backgroundMode: "light",
    buttonStyle: "square",
    headerLayout: "left",
    heroLayout: "quad",
    aboutLayout: "centered",
    gridLayout: "icon-row",
    ctaLayout: "centered",
  },
  {
    id: "atelier",
    label: "Redaktionell helbild",
    desc: "Krämig bakgrund, en stor stående bild till höger med ett mindre foto lager-på-lager, och en luftig rubrik till vänster — som ett designstudio-portfolio.",
    font: "serif",
    backgroundMode: "warm",
    buttonStyle: "pill",
    headerLayout: "left",
    heroLayout: "editorial",
    aboutLayout: "stats-split",
    gridLayout: "cards",
    ctaLayout: "image-bleed",
  },
  {
    id: "aurora",
    label: "Mörk och arkitektonisk",
    desc: "Mörk bakgrund med mjukt tonade ytor (inte platta enfärgade), en sidledes mörk bild-gradient i heron och en centrerad meny — dramatisk och exklusiv.",
    font: "serif",
    backgroundMode: "dark",
    buttonStyle: "pill",
    headerLayout: "split",
    heroLayout: "beam",
    aboutLayout: "image-full",
    gridLayout: "divided-columns",
    ctaLayout: "image-bleed",
  },
  {
    id: "nord",
    label: "Mörk och minimal",
    desc: "Mörk bakgrund med tonade ytor, en bred intro bredvid avdelade tjänstekort och en nyckeltalsruta bredvid en helbild — lugnare och mer sansad än \"Mörk och arkitektonisk\".",
    font: "sans",
    backgroundMode: "dark",
    buttonStyle: "pill",
    headerLayout: "split",
    heroLayout: "beam",
    aboutLayout: "image-stats",
    gridLayout: "intro-divided",
    ctaLayout: "image-bleed",
  },
  {
    id: "solglimt",
    label: "Glad och färgstark",
    desc: "Er egen färg som en klar, ljus bakgrund med stora, feta rubriker — glad, modern och full av energi.",
    font: "sans",
    backgroundMode: "light",
    buttonStyle: "pill",
    headerLayout: "centered-stacked",
    heroLayout: "split-right",
    aboutLayout: "stats-split",
    gridLayout: "cards",
    ctaLayout: "split",
    skin: "solglimt",
  },
  {
    id: "skymning",
    label: "Djup och dramatisk",
    desc: "Nästan svart men färgad i er nyans, med en stor, klassisk rubrik — känns exklusivt och lite filmiskt.",
    font: "sans",
    backgroundMode: "dark",
    buttonStyle: "square",
    headerLayout: "left",
    heroLayout: "split-left",
    aboutLayout: "centered",
    gridLayout: "numbered",
    ctaLayout: "dark-split",
    skin: "skymning",
  },
  {
    id: "pastell",
    label: "Mjuk och vänlig",
    desc: "En lätt färgton över hela sidan, mindre och rundare rubriker och gott om luft — välkomnande och lugn.",
    font: "sans",
    backgroundMode: "light",
    buttonStyle: "pill",
    headerLayout: "centered-stacked",
    heroLayout: "centered",
    aboutLayout: "text-left",
    gridLayout: "icon-row",
    ctaLayout: "centered",
    skin: "pastell",
  },
  {
    id: "kontrast",
    label: "Skarp och orädd",
    desc: "Vitt, svart och en enda stark färgyta. Versaler, grova rubriker och tjocka linjer — tar plats och syns.",
    font: "sans",
    backgroundMode: "light",
    buttonStyle: "square",
    headerLayout: "left",
    heroLayout: "quad",
    aboutLayout: "stats-split",
    gridLayout: "bento",
    ctaLayout: "dark-split",
    skin: "kontrast",
  },
  {
    id: "fargyta",
    label: "Rik färgyta",
    desc: "Er färg som hela bakgrunden, ljus text och kursiva, eleganta rubriker — varm, djup och personlig.",
    font: "serif",
    backgroundMode: "dark",
    buttonStyle: "pill",
    headerLayout: "centered-stacked",
    heroLayout: "overlay-bottom",
    aboutLayout: "image-full",
    gridLayout: "list",
    ctaLayout: "image-bleed",
    skin: "fargyta",
  },
];
