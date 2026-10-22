import type { ReactNode } from "react";

// Ikonbibliotek för sajtens rutnät (grid-sektionerna): linjeikoner i samma
// stil (24x24, rundade ändar) som ritas i den färg vi ger dem. Varje ruta kan
// ha ett eget "icon" (satt av Millie); saknas det väljs en ikon automatiskt
// utifrån rutans text, och annars en stabil ikon så att rutorna inte får
// samma symbol.

const P = (d: string) => <path d={d} />;
const C = (cx: number, cy: number, r: number) => <circle cx={cx} cy={cy} r={r} />;
const L = (x1: number, y1: number, x2: number, y2: number) => <line x1={x1} y1={y1} x2={x2} y2={y2} />;
const G = (pts: string) => <polygon points={pts} />;
const PL = (pts: string) => <polyline points={pts} />;

const ICONS: Record<string, ReactNode> = {
  home: <>{P("M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z")}{PL("9 22 9 12 15 12 15 22")}</>,
  sparkle: <>{P("M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z")}{P("M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z")}</>,
  layers: <>{G("12 2 2 7 12 12 22 7 12 2")}{PL("2 17 12 22 22 17")}{PL("2 12 12 17 22 12")}</>,
  diamond: G("12 2 22 12 12 22 2 12"),
  circle: C(12, 12, 9),
  triangle: G("12 3 22 20 2 20"),
  square: <><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /></>,
  heart: P("M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"),
  star: G("12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"),
  shield: P("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"),
  clock: <>{C(12, 12, 10)}{PL("12 6 12 12 16 14")}</>,
  phone: P("M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"),
  mail: <>{P("M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z")}{PL("22 6 12 13 2 6")}</>,
  pin: <>{P("M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z")}{C(12, 10, 3)}</>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" />{L(16, 2, 16, 6)}{L(8, 2, 8, 6)}{L(3, 10, 21, 10)}</>,
  tag: <>{P("M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z")}{L(7, 7, 7.01, 7)}</>,
  gift: <>{PL("20 12 20 22 4 22 4 12")}<rect x="2" y="7" width="20" height="5" />{L(12, 22, 12, 7)}{P("M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z")}{P("M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z")}</>,
  truck: <><rect x="1" y="3" width="15" height="13" />{G("16 8 20 8 23 11 23 16 16 16 16 8")}{C(5.5, 18.5, 2.5)}{C(18.5, 18.5, 2.5)}</>,
  sun: <>{C(12, 12, 5)}{L(12, 1, 12, 3)}{L(12, 21, 12, 23)}{L(4.22, 4.22, 5.64, 5.64)}{L(18.36, 18.36, 19.78, 19.78)}{L(1, 12, 3, 12)}{L(21, 12, 23, 12)}{L(4.22, 19.78, 5.64, 18.36)}{L(18.36, 5.64, 19.78, 4.22)}</>,
  moon: P("M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"),
  bolt: G("13 2 3 14 12 14 11 22 21 10 12 10 13 2"),
  tool: P("M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"),
  camera: <>{P("M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z")}{C(12, 13, 4)}</>,
  book: <>{P("M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z")}{P("M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z")}</>,
  users: <>{P("M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2")}{C(9, 7, 4)}{P("M23 21v-2a4 4 0 0 0-3-3.87")}{P("M16 3.13a4 4 0 0 1 0 7.75")}</>,
  chat: P("M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"),
  check: <>{P("M22 11.08V12a10 10 0 1 1-5.93-9.14")}{PL("22 4 12 14.01 9 11.01")}</>,
  award: <>{C(12, 8, 7)}{PL("8.21 13.89 7 23 12 20 17 23 15.79 13.88")}</>,
  globe: <>{C(12, 12, 10)}{L(2, 12, 22, 12)}{P("M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z")}</>,
  key: P("M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"),
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" />{P("M7 11V7a5 5 0 0 1 10 0v4")}</>,
  coffee: <>{P("M18 8h1a4 4 0 0 1 0 8h-1")}{P("M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z")}{L(6, 1, 6, 4)}{L(10, 1, 10, 4)}{L(14, 1, 14, 4)}</>,
  scissors: <>{C(6, 6, 3)}{C(6, 18, 3)}{L(20, 4, 8.12, 15.88)}{L(14.47, 14.48, 20, 20)}{L(8.12, 8.12, 12, 12)}</>,
  cart: <>{C(9, 21, 1)}{C(20, 21, 1)}{P("M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6")}</>,
  chart: <>{L(18, 20, 18, 10)}{L(12, 20, 12, 4)}{L(6, 20, 6, 14)}</>,
  bulb: <>{P("M9 18h6")}{P("M10 22h4")}{P("M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z")}</>,
  compass: <>{C(12, 12, 10)}{G("16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76")}</>,
  flag: <>{P("M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z")}{L(4, 22, 4, 15)}</>,
  leaf: <>{P("M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z")}{P("M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12")}</>,
  palette: <>{P("M12 22a10 10 0 1 1 10-10c0 2-1.5 3-3.5 3H16a2 2 0 0 0-1.5 3.3c.5.6.5 1.2.3 1.7-.3.6-1.4 2-2.8 2z")}{C(7.5, 11, 1)}{C(12, 7, 1)}{C(16.5, 11, 1)}</>,
  car: <>{P("M3 13l2-5.5A2 2 0 0 1 6.9 6h10.2a2 2 0 0 1 1.9 1.5L21 13v5h-3v-2H6v2H3z")}{L(3, 13, 21, 13)}{C(7.5, 16, 0.4)}{C(16.5, 16, 0.4)}</>,
  utensils: <>{P("M7 2v9a2 2 0 0 0 2 2 2 2 0 0 0 2-2V2")}{L(9, 2, 9, 22)}{P("M17 22V2c-2.5 1-4 3.5-4 7 0 2 1 3.5 3 4")}</>,
  smile: <>{C(12, 12, 10)}{P("M8 14s1.5 2 4 2 4-2 4-2")}{L(9, 9, 9.01, 9)}{L(15, 9, 15.01, 9)}</>,
  box: <>{P("M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z")}{PL("3.27 6.96 12 12.01 20.73 6.96")}{L(12, 22.08, 12, 12)}</>,
};

export const GRID_ICON_IDS = Object.keys(ICONS);

export function GridIcon({ id, size = 26, color = "currentColor", stroke = 1.6 }: { id: string; size?: number; color?: string; stroke?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[id] ?? ICONS.sparkle}
    </svg>
  );
}

// Nyckelord (svenska och engelska, där de flesta sajter börjar) som pekar på en ikon.
const KEYWORDS: [RegExp, string][] = [
  [/pris|price|kostnad|rabatt|erbjudande|offer|deal|sale|kampanj/i, "tag"],
  [/kontakt|contact|ring |call|telefon|phone|support/i, "phone"],
  [/mejl|e-post|mail|nyhetsbrev|newsletter/i, "mail"],
  [/plats|adress|hitta|location|find us|karta|map|lokal/i, "pin"],
  [/boka|bokning|tid|calendar|schema|datum|event|evenemang|kurs/i, "calendar"],
  [/öppet|öppettid|snabb|fast|express|hours|klocka|tidsbesparing|quick/i, "clock"],
  [/leverans|frakt|delivery|shipping|transport|flytt/i, "truck"],
  [/gåva|present|gift|presentkort|voucher/i, "gift"],
  [/trygg|säker|garanti|försäkring|safe|secure|guarantee|insurance|skydd/i, "shield"],
  [/kvalitet|quality|certifier|award|pris(er)?\b.*vunn|utmärkelse|expert|erfaren|experience|proffs/i, "award"],
  [/miljö|hållbar|eco|green|natur|ekolog|organic|ekologisk|plant|växt|trädgård|garden/i, "leaf"],
  [/idé|ide\b|innovation|lösning|solution|tips|idea|strategi|rådgiv|consult/i, "bulb"],
  [/team|personal|medarbetare|kunder|customers|community|gemenskap|familj|family|vi är|people|människ/i, "users"],
  [/samtal|chatt|chat|fråga|question|feedback|recension|review|kundtjänst/i, "chat"],
  [/design|färg|color|creative|kreativ|konst|art\b|grafisk|brand|varumärke|logotyp/i, "palette"],
  [/foto|bild|camera|fotograf|film|video|photo/i, "camera"],
  [/utbildning|lär|workshop|course|training|böcker|book|guide|kunskap|learn/i, "book"],
  [/bygg|renover|verktyg|reparation|service|montering|install|tool|repair|snickeri|el\b|vvs|målning/i, "tool"],
  [/mat|restaurang|meny|lunch|middag|food|dinner|bistro|bageri|catering|kök/i, "utensils"],
  [/kaffe|café|cafe|fika|coffee|te\b|tea\b/i, "coffee"],
  [/hår|frisör|klipp|salong|barber|hair|skönhet|beauty|nagel/i, "scissors"],
  [/butik|shop|handla|webshop|e-handel|köp|store|produkt/i, "cart"],
  [/bil|fordon|verkstad|car\b|auto|däck|motor/i, "car"],
  [/tillväxt|resultat|statistik|analys|growth|results|analytics|marknadsför|marketing|seo|ekonomi|bokföring|redovis|finance/i, "chart"],
  [/värld|global|internationell|worldwide|språk|language|export/i, "globe"],
  [/energi|el-|laddning|power|energy|elektr|snabbladd/i, "bolt"],
  [/nyckel|bostad|fastighet|mäklare|hem\b|home\b|house|boende|inredning|real estate/i, "home"],
  [/hälsa|vård|omsorg|wellness|health|care\b|massage|terapi|yoga|välmående|kärlek|love/i, "heart"],
  [/paket|förpackning|lager|package|logistik|storage|magasin/i, "box"],
  [/mål|vision|riktning|navigera|direction|resa|journey|guidning|upptäck|explore/i, "compass"],
  [/ny\b|nyhet|nya |new\b|premiär|lansering|launch|första/i, "sparkle"],
  [/sol|solenergi|sommar|summer|solar/i, "sun"],
  [/natt|kväll|sömn|sleep|night|dröm/i, "moon"],
  [/lås|privat|integritet|private|privacy|lock/i, "lock"],
  [/nöjd|glad|happy|trevlig|gästfri|välkomn|welcome|friendly/i, "smile"],
];

// Stabil hash så att samma text alltid ger samma ikon.
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const FALLBACK = ["sparkle", "star", "heart", "bolt", "compass", "leaf", "bulb", "award", "smile", "layers", "flag", "globe", "diamond", "check"];

// Ikoner för alla rutor i en sektion: eget val (item.icon) först, sedan
// nyckelord, sedan en stabil reserv. Två rutor i samma sektion får aldrig samma ikon.
export function iconsForItems(items: { title?: string; body?: string; icon?: string }[]): string[] {
  const used = new Set<string>();
  const out: (string | null)[] = items.map((it) => {
    if (it.icon && ICONS[it.icon] && !used.has(it.icon)) {
      used.add(it.icon);
      return it.icon;
    }
    return null;
  });
  return out.map((chosen, i) => {
    if (chosen) return chosen;
    const it = items[i];
    const text = `${it.title ?? ""} ${it.body ?? ""}`;
    const byTitle = KEYWORDS.filter(([re]) => re.test(it.title ?? "")).map(([, id]) => id);
    const byText = KEYWORDS.filter(([re]) => re.test(text)).map(([, id]) => id);
    const hit = [...byTitle, ...byText].find((id) => !used.has(id));
    if (hit) { used.add(hit); return hit; }
    const start = hash(it.title ?? String(i));
    for (let k = 0; k < FALLBACK.length; k++) {
      const id = FALLBACK[(start + k) % FALLBACK.length];
      if (!used.has(id)) { used.add(id); return id; }
    }
    return "sparkle";
  });
}
