import { addDays, isoWeekday, localDateOf, zonedTimeToUtc, type BookingBlock, type BookingRule, type BookingSlot } from "@/lib/booking";

// iCal-flöde (RFC 5545) för en sajts bokningar och bokningsbara tider.
// Bokningar blir vanliga poster. Bokningsbara tider blir poster som är
// markerade som lediga (TRANSPARENT), så de inte gör kalendern upptagen.

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// Rader får vara högst 75 byte; längre rader viks med blanksteg först.
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let curBytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (curBytes + b > limit) { out.push(cur); cur = ""; curBytes = 0; }
    cur += ch; curBytes += b;
  }
  if (cur) out.push(cur);
  return out.join("\r\n ");
}

export type FeedBooking = {
  id: string; package_name: string; starts_at: string; ends_at: string; status: string;
  customer_name: string; customer_email: string | null; customer_phone: string | null; message: string | null;
};
export type FeedPackage = { id: string; name: string };

type Interval = [number, number];

function subtract(wins: Interval[], cuts: Interval[]): Interval[] {
  let out = wins;
  for (const [cs, ce] of cuts) {
    const next: Interval[] = [];
    for (const [s, e] of out) {
      if (ce <= s || cs >= e) { next.push([s, e]); continue; }
      if (cs > s) next.push([s, cs]);
      if (ce < e) next.push([ce, e]);
    }
    out = next;
  }
  return out;
}

function merge(wins: Interval[]): Interval[] {
  const sorted = [...wins].sort((a, b) => a[0] - b[0]);
  const out: Interval[] = [];
  for (const w of sorted) {
    const last = out[out.length - 1];
    if (last && w[0] <= last[1]) last[1] = Math.max(last[1], w[1]);
    else out.push([w[0], w[1]]);
  }
  return out;
}

export function buildCalendarFeed(input: {
  siteId: string;
  siteName: string;
  tz: string;
  maxDaysAhead: number;
  bookings: FeedBooking[];
  packages: FeedPackage[];
  rules: BookingRule[];
  slots: BookingSlot[];
  blocks: BookingBlock[];
  openLabel: string;
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  const { tz } = input;
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//YourCoSite//Bokningar//SV",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(input.siteName)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  const dtstamp = stamp(now);

  // 1. Bokningar.
  for (const b of input.bookings) {
    const desc = [
      b.customer_name,
      b.customer_email,
      b.customer_phone,
      b.message ? `“${b.message}”` : null,
    ].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:booking-${b.id}@yourcosite.com`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${stamp(new Date(b.starts_at))}`,
      `DTEND:${stamp(new Date(b.ends_at))}`,
      `SUMMARY:${esc(`${b.package_name}: ${b.customer_name}`)}`,
      `DESCRIPTION:${esc(desc)}`,
      `STATUS:${b.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }

  // 2. Bokningsbara tider: veckoschema och extra tider, minus stängda tider
  //    och bokningar (med paus), ihopslagna till sammanhängande block.
  const nameOf = new Map(input.packages.map((p) => [p.id, p.name]));
  const groups = new Map<string | null, Interval[]>();
  const add = (pkg: string | null, s: number, e: number) => {
    if (e <= now.getTime()) return;
    if (!groups.has(pkg)) groups.set(pkg, []);
    groups.get(pkg)!.push([Math.max(s, now.getTime()), e]);
  };
  const today = localDateOf(now, tz);
  for (let i = 0; i <= input.maxDaysAhead; i++) {
    const date = addDays(today, i);
    const wd = isoWeekday(date);
    for (const r of input.rules) {
      if (r.weekday !== wd) continue;
      add(r.package_id, zonedTimeToUtc(date, r.start_time.slice(0, 5), tz).getTime(), zonedTimeToUtc(date, r.end_time.slice(0, 5), tz).getTime());
    }
  }
  for (const s of input.slots) add(s.package_id, new Date(s.starts_at).getTime(), new Date(s.ends_at).getTime());

  const cuts: Interval[] = [
    ...input.blocks.map((b) => [new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime()] as Interval),
    ...input.bookings.filter((b) => b.status !== "cancelled").map((b) => [new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime()] as Interval),
  ];
  for (const [pkg, wins] of groups) {
    const label = pkg && nameOf.get(pkg) ? `${input.openLabel}: ${nameOf.get(pkg)}` : input.openLabel;
    for (const [s, e] of merge(subtract(merge(wins), cuts))) {
      lines.push(
        "BEGIN:VEVENT",
        `UID:open-${input.siteId}-${pkg ?? "all"}-${s}@yourcosite.com`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${stamp(new Date(s))}`,
        `DTEND:${stamp(new Date(e))}`,
        `SUMMARY:${esc(label)}`,
        "STATUS:CONFIRMED",
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
      );
    }
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
