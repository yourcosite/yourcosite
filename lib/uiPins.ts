// Pinnar ("nytt här") vid UI-ändringar i redigeraren: en liten pulserande
// prick på det ändrade stället, som bara visas för ÅTERVÄNDANDE kunder.
//
// KONVENTION: när vi flyttar eller byter namn på något synligt i redigeraren,
// lägg en post här, sätt <NewPin id="…" /> på det ändrade stället och lägg
// helst också en post i lib/whatsNew.ts (Nytt-rutan). Ta bort poster efter
// någon månad.
//
//  - Kunder vars sajt skapades EFTER postens datum har aldrig sett det gamla
//    och får ingen pin.
//  - Pinnen försvinner när kunden klickat på stället, och det minns webbläsaren
//    (localStorage, alltid i try/catch).

export type UiPin = { id: string; date: string; text: string };

export const UI_PINS: UiPin[] = [
  {
    id: "campaigns-2026-11",
    date: "2026-11-28",
    text: "Nytt: Kampanjer. Schemalägg toppremsor, textband och rutor som glider in.",
  },
  {
    id: "dock-menus-2026-11",
    date: "2026-11-25",
    text: "Valen för det du markerat ligger nu under Redigera. Tips finns under Förslag.",
  },
];

const KEY = "ycs_ui_pins_seen";

function readSeen(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function isPinVisible(id: string, siteCreatedAt?: string | null): boolean {
  if (typeof window === "undefined") return false;
  const entry = UI_PINS.find((e) => e.id === id);
  if (!entry || !siteCreatedAt) return false;
  const created = Date.parse(siteCreatedAt);
  if (!Number.isFinite(created) || created >= Date.parse(entry.date)) return false;
  return !readSeen().includes(id);
}

export function dismissPin(id: string) {
  try {
    const seen = readSeen();
    if (!seen.includes(id)) window.localStorage.setItem(KEY, JSON.stringify([...seen, id].slice(-50)));
  } catch {
    /* ignoreras */
  }
}
