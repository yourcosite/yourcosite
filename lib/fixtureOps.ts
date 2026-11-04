import type { TFunction } from "./i18n/config";
import { FIXTURE_STATUSES, MAX_FIXTURES, type FixtureItem, type FixtureStatus, type SiteContent } from "./contentModel";

export type FixtureInput = {
  id?: string;
  date?: string;
  time?: string;
  opponent?: string;
  home?: boolean;
  venue?: string;
  competition?: string;
  ourScore?: number | null;
  theirScore?: number | null;
  status?: string;
  note?: string;
};

export type FixtureOp = FixtureInput & {
  action: "addFixture" | "updateFixture" | "removeFixture" | "setFixtures";
  sectionId?: string;
  // Vilken match som ändras: id, eller motståndare (och datum om flera).
  match?: { id?: string; opponent?: string; date?: string };
  fixtures?: FixtureInput[];
};

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isRealDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const score = (v: unknown): number | undefined => {
  if (typeof v === "string" && /^\d{1,3}$/.test(v.trim())) return Number(v.trim());
  if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 999) return v;
  return undefined;
};

let counter = 0;
export const newFixtureId = () => `f${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

// Rensar en match. Returnerar null om datum eller motståndare saknas/är ogiltiga.
export function cleanFixture(raw: FixtureInput | undefined, existingId?: string): FixtureItem | null {
  const opponent = clip(raw?.opponent, 80);
  const date = clip(raw?.date, 10);
  if (!opponent || !isRealDate(date)) return null;
  const ourScore = score(raw?.ourScore);
  const theirScore = score(raw?.theirScore);
  let status: FixtureStatus = (FIXTURE_STATUSES as string[]).includes(raw?.status as string) ? (raw!.status as FixtureStatus) : "scheduled";
  // Ett resultat kräver båda siffrorna. Saknas de kan matchen inte vara spelad.
  if (status === "played" && (ourScore === undefined || theirScore === undefined)) status = "scheduled";
  const item: FixtureItem = {
    id: clip(raw?.id, 40) || existingId || newFixtureId(),
    date,
    opponent,
    home: raw?.home !== false,
    status,
  };
  const time = clip(raw?.time, 5);
  if (TIME_RE.test(time)) item.time = time;
  const venue = clip(raw?.venue, 100);
  if (venue) item.venue = venue;
  const competition = clip(raw?.competition, 80);
  if (competition) item.competition = competition;
  const note = clip(raw?.note, 200);
  if (note) item.note = note;
  if (status === "played") {
    item.ourScore = ourScore;
    item.theirScore = theirScore;
  }
  return item;
}

export function cleanFixtures(raw: FixtureInput[] | undefined): { items: FixtureItem[]; skipped: number } {
  const items: FixtureItem[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const r of (raw || []).slice(0, MAX_FIXTURES)) {
    const c = cleanFixture(r);
    if (!c) { skipped++; continue; }
    if (seen.has(c.id)) c.id = newFixtureId();
    seen.add(c.id);
    items.push(c);
  }
  return { items, skipped };
}

// Utför Millies matchändringar på den sparade sajten. Fel läggs i errors och
// stoppar aldrig övriga ändringar.
export function applyFixtureOps(content: SiteContent, ops: FixtureOp[], currentPath: string | undefined, errors: string[], t: TFunction) {
  const all: { page: string; section: any }[] = [];
  for (const pg of content.pages) for (const sec of pg.sections as any[]) if (sec.type === "fixtures") all.push({ page: pg.path, section: sec });

  for (const op of ops.slice(0, 60)) {
    if (!op || typeof op.action !== "string") continue;
    let target = op.sectionId ? all.find((m) => m.section.id === op.sectionId) : undefined;
    if (!target) target = all.find((m) => m.page === currentPath) ?? (all.length === 1 ? all[0] : undefined);
    // Finns ingen matchsektion än och matcher ska läggas in skapas den på sidan
    // kunden står på, så att det inte hänger på att Millie själv hunnit skapa den.
    if (!target && (op.action === "setFixtures" || op.action === "addFixture")) {
      const pg = content.pages.find((x) => x.path === currentPath) ?? (all.length === 0 ? content.pages.find((x) => x.path !== "/") : undefined);
      if (pg) {
        const sec: any = { id: `fixtures-${Math.random().toString(36).slice(2, 8)}`, type: "fixtures", layout: "list", heading: pg.label || t("Matcher"), items: [] };
        (pg.sections as any[]).push(sec);
        target = { page: pg.path, section: sec };
        all.push(target);
      }
    }
    if (!target) target = all[0];
    if (!target) { errors.push(t("Hittade ingen matchsektion att ändra. Lägg först till en sida eller sektion för spelschema.")); continue; }
    const sec = target.section;
    if (!Array.isArray(sec.items)) sec.items = [];
    const items: FixtureItem[] = sec.items;

    if (op.action === "setFixtures") {
      const res = cleanFixtures(op.fixtures);
      if (res.items.length === 0) { errors.push(t("Matcherna som skulle läggas in saknade datum eller motståndare.")); continue; }
      if (res.skipped) errors.push(t("{n} matcher hoppades över eftersom datum eller motståndare saknades.", { n: res.skipped }));
      sec.items = res.items;
      continue;
    }

    if (op.action === "addFixture") {
      const c = cleanFixture(op);
      if (!c) { errors.push(t("En match saknade datum (ÅÅÅÅ-MM-DD) eller motståndare och lades inte till.")); continue; }
      if (items.length >= MAX_FIXTURES) { errors.push(t("Det ryms inte fler matcher i sektionen.")); continue; }
      items.push(c);
      continue;
    }

    // updateFixture / removeFixture: hitta matchen.
    const m = op.match || {};
    let idx = m.id ? items.findIndex((i) => i.id === m.id) : -1;
    if (idx < 0 && m.opponent) {
      const cands = items.map((i, n) => ({ i, n })).filter((x) => same(x.i.opponent, m.opponent!) && (!m.date || x.i.date === m.date));
      if (cands.length === 1) idx = cands[0].n;
      else if (cands.length > 1) {
        // Flera möten med samma lag: ta den första som ännu inte är spelad, annars den senaste.
        const open = cands.find((x) => x.i.status !== "played");
        idx = (open ?? cands[cands.length - 1]).n;
      }
    }
    if (idx < 0) { errors.push(t("Hittade inte matchen mot “{name}”.", { name: m.opponent ?? "" })); continue; }
    if (op.action === "removeFixture") { items.splice(idx, 1); continue; }

    const cur = items[idx];
    const merged: FixtureInput = { ...cur };
    for (const k of ["date", "time", "opponent", "venue", "competition", "note", "status"] as const) {
      if ((op as any)[k] !== undefined) (merged as any)[k] = (op as any)[k];
    }
    if (op.home !== undefined) merged.home = op.home;
    if (op.ourScore !== undefined) merged.ourScore = op.ourScore;
    if (op.theirScore !== undefined) merged.theirScore = op.theirScore;
    // Anges resultat utan status är matchen spelad.
    if (op.status === undefined && score(op.ourScore) !== undefined && score(op.theirScore) !== undefined) merged.status = "played";
    const c = cleanFixture(merged, cur.id);
    if (!c) { errors.push(t("Ändringen av matchen mot “{name}” blev ogiltig.", { name: cur.opponent })); continue; }
    items[idx] = c;
  }
}
