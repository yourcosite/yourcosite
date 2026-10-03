// Färdiga stilvarianter som visas på /forslag — samma AI-skrivna innehåll,
// olika visuella behandlingar. Kundens valda accentfärg (från onboarding
// steg 4) används i alla, bara bakgrund/typsnitt skiljer. Ingen extra
// AI-generering krävs för det här — bara CSS.
//
// Täcker alla 3 bakgrundslägen × 2 typsnitt (6 kombinationer) istället för
// bara 3 — annars riskerade två kunder med samma ton (t.ex. båda "lekfull")
// att alltid hamna på exakt samma tre förslag, vilket gjorde att sajter
// kändes mallade även när kunderna själva valde olika.
import type { ThemeFont } from "./contentModel";

export type BackgroundMode = "light" | "warm" | "dark";

export interface ThemeVariant {
  id: string;
  label: string;
  desc: string;
  font: ThemeFont;
  backgroundMode: BackgroundMode;
  recommended?: boolean;
}

export const THEME_VARIANTS: ThemeVariant[] = [
  {
    id: "luftig",
    label: "Luftig & minimal",
    desc: "Vit bakgrund, gott om vitt utrymme, lugn och tydlig.",
    font: "sans",
    backgroundMode: "light",
  },
  {
    id: "luftig-klassisk",
    label: "Luftig & klassisk",
    desc: "Vit bakgrund som ovan, men med ett snirkligare, mer tidlöst typsnitt.",
    font: "serif",
    backgroundMode: "light",
  },
  {
    id: "varm",
    label: "Varm & personlig",
    desc: "Krämig bakgrund, rundare känsla, inbjudande.",
    font: "serif",
    backgroundMode: "warm",
    recommended: true,
  },
  {
    id: "varm-lekfull",
    label: "Varm & lekfull",
    desc: "Samma krämiga bakgrund, men med ett rakare, mer busigt typsnitt.",
    font: "sans",
    backgroundMode: "warm",
  },
  {
    id: "djarv",
    label: "Djärv & färgstark",
    desc: "Mörk bakgrund, hög kontrast, syns direkt.",
    font: "sans",
    backgroundMode: "dark",
  },
  {
    id: "djarv-elegant",
    label: "Djärv & elegant",
    desc: "Samma mörka bakgrund, men med ett mer exklusivt, redaktionellt typsnitt.",
    font: "serif",
    backgroundMode: "dark",
  },
];
