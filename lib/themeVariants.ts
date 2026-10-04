// Färdiga stilvarianter som visas på /forslag — samma AI-skrivna innehåll,
// olika visuella behandlingar. Kundens valda accentfärg (från onboarding
// steg 4) används i alla, bara bakgrund/typsnitt skiljer. Ingen extra
// AI-generering krävs för det här — bara CSS.
//
// Täcker alla 3 bakgrundslägen × 2 typsnitt (6 kombinationer) istället för
// bara 3 — annars riskerade två kunder med samma ton (t.ex. båda "lekfull")
// att alltid hamna på exakt samma tre förslag, vilket gjorde att sajter
// kändes mallade även när kunderna själva valde olika.
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
    id: "luftig-klassisk",
    label: "Luftig och klassisk",
    desc: "Vit bakgrund som ovan, men med ett snirkligare, mer tidlöst typsnitt.",
    font: "serif",
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
    id: "varm-lekfull",
    label: "Varm och lekfull",
    desc: "Samma krämiga bakgrund, men med ett rakare, mer busigt typsnitt.",
    font: "sans",
    backgroundMode: "warm",
    buttonStyle: "pill",
    headerLayout: "centered-stacked",
    heroLayout: "centered",
  },
  {
    id: "djarv",
    label: "Djärv och färgstark",
    desc: "Mörk bakgrund, hög kontrast, syns direkt.",
    font: "sans",
    backgroundMode: "dark",
    buttonStyle: "square",
    headerLayout: "split",
    heroLayout: "overlay-bottom",
  },
  {
    id: "djarv-elegant",
    label: "Djärv och elegant",
    desc: "Samma mörka bakgrund, men med ett mer exklusivt, redaktionellt typsnitt.",
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
    desc: "Vit bakgrund, en delad hero med nyckeltal, fyrkantiga knappar — skarp och ordnad.",
    font: "sans",
    backgroundMode: "light",
    buttonStyle: "square",
    headerLayout: "left",
    heroLayout: "split-right",
  },
];
