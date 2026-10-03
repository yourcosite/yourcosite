// Tre färdiga stilvarianter som visas på /forslag — samma AI-skrivna
// innehåll, tre olika visuella behandlingar. Kundens valda accentfärg
// (från onboarding steg 4) används i alla tre, bara bakgrund/typsnitt
// skiljer. Ingen extra AI-generering krävs för det här — bara CSS.
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
    id: "varm",
    label: "Varm & personlig",
    desc: "Krämig bakgrund, rundare känsla, inbjudande.",
    font: "serif",
    backgroundMode: "warm",
    recommended: true,
  },
  {
    id: "djarv",
    label: "Djärv & färgstark",
    desc: "Mörk bakgrund, hög kontrast, syns direkt.",
    font: "sans",
    backgroundMode: "dark",
  },
];
