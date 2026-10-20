// Tidslogik för bokningssystemet. Ren kod utan databas: tar in paket,
// veckoschema, extra tider, stängda tider och befintliga bokningar och
// räknar ut vilka starttider som är lediga. Används av både den publika
// bokningsrutten (som också kontrollerar tiden igen innan en bokning sparas)
// och förhandsvisningen. Allt räknas i sajtens tidszon (normalt
// Europe/Stockholm) så att sommar- och vintertid blir rätt.

export const DEFAULT_TIMEZONE = "Europe/Stockholm";

export type BookingPackage = {
  id: string;
  name: string;
  description?: string | null;
  duration_min: number;
  buffer_min?: number | null; // paus efter tiden, syns inte för kunden
  price_sek?: number | null;
  image_url?: string | null;
  active?: boolean;
  sort_order?: number;
};
export type BookingRule = { id?: string; package_id: string | null; weekday: number; start_time: string; end_time: string };
export type BookingSlot = { id?: string; package_id: string | null; starts_at: string; ends_at: string };
export type BookingBlock = { id?: string; starts_at: string; ends_at: string; note?: string | null };
export type BookingBusy = { starts_at: string; ends_at: string };
export type BookingSettings = { min_notice_hours: number; max_days_ahead: number; timezone: string };

const pad = (n: number) => String(n).padStart(2, "0");

// "HH:MM" eller "HH:MM:SS" -> minuter efter midnatt.
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

// Klockslaget i en tidszon som UTC-ögonblick ("2026-11-03", "10:00", Stockholm).
export function zonedTimeToUtc(date: string, time: string, tz: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const wanted = Date.UTC(y, mo - 1, d, h, mi || 0);
  const offsetAt = (ms: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(ms));
    const g = (t: string) => Number(parts.find((p) => p.type === t)!.value);
    return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - ms;
  };
  let guess = wanted - offsetAt(wanted);
  guess = wanted - offsetAt(guess); // andra varvet fångar sommar/vintertid-byte
  return new Date(guess);
}

// Datum ("YYYY-MM-DD") som ett ögonblick har i en tidszon.
export function localDateOf(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}
export function localTimeOf(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(instant);
}
// ISO-veckodag 1 (måndag) – 7 (söndag) för ett datum.
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return w === 0 ? 7 : w;
}
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

const overlaps = (aS: number, aE: number, bS: number, bE: number) => aS < bE && bS < aE;

export type Availability = Record<string, string[]>; // datum -> ISO-starttider (UTC)

export function computeAvailability(input: {
  pkg: Pick<BookingPackage, "id" | "duration_min" | "buffer_min">;
  rules: BookingRule[];
  slots: BookingSlot[];
  blocks: BookingBlock[];
  busy: BookingBusy[];
  settings: BookingSettings;
  now?: Date;
}): Availability {
  const { pkg, rules, slots, blocks, busy, settings } = input;
  const now = input.now ?? new Date();
  const tz = settings.timezone || DEFAULT_TIMEZONE;
  const durMs = pkg.duration_min * 60000;
  // Tid till nästa bokning: nästa starttid hamnar längd + paus senare, men
  // kunden ser bara längden.
  const bufMs = Math.max(0, pkg.buffer_min || 0) * 60000;
  const stepMs = durMs + bufMs;
  const earliest = now.getTime() + settings.min_notice_hours * 3600000;
  const latest = now.getTime() + settings.max_days_ahead * 86400000;
  const forPkg = <T extends { package_id: string | null }>(x: T) => x.package_id === null || x.package_id === pkg.id;

  const starts = new Set<number>();
  const addWindow = (winS: number, winE: number) => {
    for (let t = winS; t + durMs <= winE; t += stepMs) starts.add(t);
  };

  // Veckoschema, dag för dag i sajtens tidszon.
  const today = localDateOf(now, tz);
  for (let i = 0; i <= settings.max_days_ahead + 1; i++) {
    const date = addDays(today, i);
    const wd = isoWeekday(date);
    for (const r of rules) {
      if (r.weekday !== wd || !forPkg(r)) continue;
      const s = zonedTimeToUtc(date, r.start_time.slice(0, 5), tz).getTime();
      const e = zonedTimeToUtc(date, r.end_time.slice(0, 5), tz).getTime();
      addWindow(s, e);
    }
  }
  // Enskilda extra tider.
  for (const s of slots) {
    if (!forPkg(s)) continue;
    addWindow(new Date(s.starts_at).getTime(), new Date(s.ends_at).getTime());
  }

  // Stängda tider gäller själva behandlingen; bokningar räknas inklusive sin
  // paus (busy.ends_at har redan pausen med) och den nya tidens egen paus.
  const closed = blocks.map((b) => [new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime()] as const);
  const taken = busy.map((b) => [new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime()] as const);

  const out: Availability = {};
  [...starts].sort((a, b) => a - b).forEach((t) => {
    if (t < earliest || t > latest) return;
    if (closed.some(([bs, be]) => overlaps(t, t + durMs, bs, be))) return;
    if (taken.some(([bs, be]) => overlaps(t, t + stepMs, bs, be))) return;
    const iso = new Date(t).toISOString();
    (out[localDateOf(new Date(t), tz)] ||= []).push(iso);
  });
  return out;
}

// Är just den här starttiden bokningsbar? (Kontrolleras om på servern.)
export function isStartAvailable(startIso: string, avail: Availability, tz: string): boolean {
  const d = new Date(startIso);
  if (isNaN(d.getTime())) return false;
  return (avail[localDateOf(d, tz)] || []).includes(d.toISOString());
}

const WEEKDAYS = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];
const MONTHS = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"];

// "tisdag 3 november 2026 kl 10:00" i sajtens tidszon.
export function formatSwedish(instant: Date, tz: string): string {
  const date = localDateOf(instant, tz);
  const [y, m, d] = date.split("-").map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${wd} ${d} ${MONTHS[m - 1]} ${y} kl ${localTimeOf(instant, tz)}`;
}
export function formatPrice(price?: number | null, currency: string = "SEK", bcp47: string = "sv-SE"): string {
  if (price == null) return "";
  try {
    return new Intl.NumberFormat(bcp47, { style: "currency", currency, maximumFractionDigits: Number.isInteger(price) ? 0 : 2 }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

// "Tisdag 3 november 2026 kl 10:00" på valfritt språk, i sajtens tidszon.
// (formatSwedish ovan finns kvar för de svenska delarna av verktyget.)
export function formatWhen(instant: Date, tz: string, bcp47: string): string {
  if (bcp47.startsWith("sv")) return formatSwedish(instant, tz);
  return new Intl.DateTimeFormat(bcp47, {
    timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(instant);
}

// ---- Mejltexter som ägaren kan skriva själv ----
// Platshållare som ersätts när mejlet skickas: {namn} {tjänst} {tid} {längd}
// {pris} {sajt}. Tomma fält ger standardtexten.
export type MailTexts = {
  confirm_subject?: string | null;
  confirm_intro?: string | null;
  confirm_extra?: string | null;
  cancel_intro?: string | null;
  terms_text?: string | null;
};
export const MAIL_PLACEHOLDERS = ["{namn}", "{tjänst}", "{tid}", "{längd}", "{pris}", "{sajt}"];
export const DEFAULT_CONFIRM_SUBJECT = "Bokningsbekräftelse: {tjänst}, {tid}";
export const DEFAULT_CONFIRM_INTRO = "Hej {namn}! Tack för din bokning hos {sajt}. Här är uppgifterna.";
export const DEFAULT_CANCEL_INTRO_CUSTOMER = "Hej {namn}! Din bokning hos {sajt} är nu avbokad.";
export const DEFAULT_CANCEL_INTRO_OWNER = "Hej {namn}! {sajt} har tyvärr avbokat tiden nedan. Hör av dig till dem om du vill boka en ny.";

// Platshållarna fungerar på svenska och engelska ({namn} eller {name} osv.),
// så en mall skriven på något av språken alltid blir rätt.
export const MAIL_PLACEHOLDERS_EN = ["{name}", "{service}", "{time}", "{duration}", "{price}", "{site}"];

export function applyMailTemplate(template: string, v: { namn: string; tjänst: string; tid: string; längd: string; pris: string; sajt: string }): string {
  return template
    .replace(/\{(namn|name)\}/gi, v.namn)
    .replace(/\{(tjänst|service)\}/gi, v.tjänst)
    .replace(/\{(tid|time)\}/gi, v.tid)
    .replace(/\{(längd|duration)\}/gi, v.längd)
    .replace(/\{(pris|price)\}/gi, v.pris)
    .replace(/\{(sajt|site)\}/gi, v.sajt);
}
