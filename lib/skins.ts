import type { SkinId, BackgroundMode } from "./contentModel";

// Skins = färg- och typografipaket (se SkinId i lib/contentModel.ts). Varje
// skin räknar ut hela sin palette från kundens EGEN accentfärg (nyans), så
// samma mall får olika färgstämning för olika kunder men alltid känns som
// "samma mall". Layouten (hero/about/grid/cta) väljs separat per stilvariant
// i lib/themeVariants.ts.

export interface SkinPalette {
  bg: string;
  bgAlt: string;
  text: string;
  textDim: string;
  cardBg: string;
  cardBorder: string;
}

export interface Skin {
  id: SkinId;
  // Vilket "läge" skinet räknas som — styr de ställen i SitePreview som
  // fortfarande frågar "är det mörkt?" (vit text på kort, gradienter m.m.).
  mode: BackgroundMode;
  palette: (accent: string) => SkinPalette;
  // Färgen knappar/accenter får. Utan den används kundens accentfärg rakt av
  // — men på skins där bakgrunden redan är samma nyans behövs en kontrast.
  accent?: (accent: string) => string;
  // CSS-värden (font-family-listor) för rubriker och, valfritt, brödtext.
  headingFont: string;
  bodyFont?: string;
  // Multiplicerar alla rubrikstorlekar (1 = som förut).
  typeScale: number;
  headingWeight: number;
  headingTracking: string; // CSS letter-spacing
  headingUppercase?: boolean;
  headingItalic?: boolean;
}

// --- färghjälpare (HSL) ----------------------------------------------------
function hexToHsl(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [30, 0.5, 0.5];
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let hue = 0;
  let sat = 0;
  if (d !== 0) {
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
  }
  return [hue, sat, l];
}

function hsl(h: number, s: number, l: number): string {
  const sat = Math.max(0, Math.min(1, s));
  const lig = Math.max(0, Math.min(1, l));
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// Mycket ljusa/gråa accentfärger (t.ex. nästan vitt eller grått) ger ingen
// nyans att bygga på — då faller vi tillbaka på en neutral men fortfarande
// tydlig färg så skinet ändå ser ut som sig självt.
function base(accent: string): { h: number; s: number } {
  const [h, s] = hexToHsl(accent);
  return { h, s: s < 0.2 ? 0.55 : s };
}

export const SKINS: Record<SkinId, Skin> = {
  // Glad och färgstark: en klar, ljus kulör som bakgrund, mörk text i samma
  // nyans, stora feta rubriker.
  solglimt: {
    id: "solglimt",
    mode: "light",
    palette: (accent) => {
      const { h, s } = base(accent);
      const sat = Math.min(0.95, Math.max(0.7, s));
      return {
        bg: hsl(h, sat, 0.88),
        bgAlt: hsl(h, sat, 0.8),
        text: hsl(h, 0.6, 0.11),
        textDim: hsl(h, 0.35, 0.3),
        cardBg: "#FFFFFF",
        cardBorder: hsl(h, sat * 0.8, 0.7),
      };
    },
    accent: (accent) => {
      const { h, s } = base(accent);
      return hsl(h, Math.min(0.95, Math.max(0.75, s)), 0.5);
    },
    headingFont: '"Bricolage Grotesque Variable", "Work Sans", system-ui, sans-serif',
    bodyFont: '"DM Sans Variable", "Work Sans", system-ui, sans-serif',
    typeScale: 1.14,
    headingWeight: 800,
    headingTracking: "-0.03em",
  },
  // Djup och dramatisk: nästan svart, men tydligt färgad i kundens nyans.
  skymning: {
    id: "skymning",
    mode: "dark",
    palette: (accent) => {
      const { h, s } = base(accent);
      const sat = Math.min(0.55, Math.max(0.3, s * 0.6));
      return {
        bg: hsl(h, sat, 0.1),
        bgAlt: hsl(h, sat, 0.14),
        text: hsl(h, 0.25, 0.94),
        textDim: hsl(h, 0.15, 0.68),
        cardBg: hsl(h, sat, 0.17),
        cardBorder: hsl(h, sat, 0.27),
      };
    },
    accent: (accent) => {
      const { h, s } = base(accent);
      return hsl(h, Math.min(0.9, Math.max(0.55, s)), 0.62);
    },
    headingFont: '"DM Serif Display", Georgia, serif',
    typeScale: 1.1,
    headingWeight: 400,
    headingTracking: "-0.01em",
  },
  // Mjuk och vänlig: en lätt färgton över allt, mindre och rundare rubriker.
  pastell: {
    id: "pastell",
    mode: "light",
    palette: (accent) => {
      const { h, s } = base(accent);
      const sat = Math.min(0.75, Math.max(0.45, s * 0.9));
      return {
        bg: hsl(h, sat, 0.95),
        bgAlt: hsl(h, sat, 0.9),
        text: hsl(h, 0.3, 0.15),
        textDim: hsl(h, 0.14, 0.4),
        cardBg: "#FFFFFF",
        cardBorder: hsl(h, sat * 0.8, 0.88),
      };
    },
    accent: (accent) => {
      const { h, s } = base(accent);
      return hsl(h, Math.min(0.8, Math.max(0.5, s)), 0.46);
    },
    headingFont: '"Space Grotesk Variable", "Work Sans", system-ui, sans-serif',
    bodyFont: '"DM Sans Variable", "Work Sans", system-ui, sans-serif',
    typeScale: 0.96,
    headingWeight: 600,
    headingTracking: "-0.02em",
  },
  // Skarp och orädd: vitt, svart och en enda stark färgyta. Versaler, grova
  // rubriker, tjocka kanter.
  kontrast: {
    id: "kontrast",
    mode: "light",
    palette: (accent) => {
      const { h, s } = base(accent);
      return {
        bg: "#FFFFFF",
        bgAlt: hsl(h, Math.min(0.95, Math.max(0.7, s)), 0.68),
        text: "#0B0B0B",
        textDim: "#3D3D3D",
        cardBg: "#FFFFFF",
        cardBorder: "#0B0B0B",
      };
    },
    accent: () => "#0B0B0B",
    headingFont: '"Syne Variable", "Work Sans", system-ui, sans-serif',
    bodyFont: '"DM Sans Variable", "Work Sans", system-ui, sans-serif',
    typeScale: 0.92,
    headingWeight: 800,
    headingTracking: "-0.04em",
    headingUppercase: true,
  },
  // Rik färgyta: kundens färg som hela bakgrunden, ljus krämfärgad text och
  // kursiva, eleganta rubriker.
  fargyta: {
    id: "fargyta",
    mode: "dark",
    palette: (accent) => {
      const { h, s } = base(accent);
      const sat = Math.min(0.6, Math.max(0.4, s * 0.8));
      return {
        bg: hsl(h, sat, 0.26),
        bgAlt: hsl(h, sat, 0.21),
        text: "#FBF4E6",
        textDim: hsl(h, 0.3, 0.8),
        cardBg: hsl(h, sat, 0.31),
        cardBorder: hsl(h, sat, 0.4),
      };
    },
    accent: () => "#F3DDB0",
    headingFont: '"Playfair Display Variable", Georgia, serif',
    typeScale: 1.08,
    headingWeight: 500,
    headingTracking: "-0.015em",
    headingItalic: true,
  },
};

export function isSkinId(v: unknown): v is SkinId {
  return typeof v === "string" && v in SKINS;
}
