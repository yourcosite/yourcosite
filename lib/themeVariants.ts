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
import type { ThemeFont, ButtonStyle, HeaderLayout, HeroLayout } from "./contentModel";

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
  recommended?: boolean;
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
  },
];
