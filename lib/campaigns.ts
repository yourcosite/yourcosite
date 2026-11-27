import { msg } from "@/lib/i18n/config";

// Kampanjytor: bandet, rutor och märken som kunden schemalägger på sin sajt.
// Lagras i SiteContent.campaigns. Visas av components/CampaignLayer.tsx och
// redigeras i components/editor/CampaignPanel.tsx.

export const CAMPAIGN_TYPES = ["topbar", "marquee", "sticky", "hero", "cards", "badge", "diagonal", "slidein"] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const MAX_CAMPAIGNS = 12;
export const MAX_CAMPAIGN_CARDS = 8;
export const MAX_CAMPAIGN_LINES = 8;

export type CampaignCard = {
  title: string;
  text?: string;
  label?: string;
  imageUrl?: string;
  link?: string;
};

export type Campaign = {
  id: string;
  type: CampaignType;
  enabled: boolean;
  // Internt namn i listan (syns inte för besökare).
  name: string;
  // Ändras när kunden sparar. Besökare som redan stängt eller sett en kampanj
  // får se den igen när den ändrats.
  rev: number;

  // Texter. Vilka som används beror på typen, se CAMPAIGN_META.
  lines: string[]; // toppremsa: budskap, textband: ord, diagonala band: övre bandet
  lines2: string[]; // diagonala band: nedre bandet
  kicker: string; // liten rad ovanför rubriken
  heading: string;
  emphasis: string; // ord i rubriken som får accentfärg (hero)
  body: string;
  badgeText: string; // märket, t.ex. "-30%"
  badgeSub: string; // liten text under märket
  cards: CampaignCard[];
  imageUrl?: string; // bakgrundsbild (hero)

  buttonText: string;
  buttonLink: string;

  // Nedräkning mot slutdatumet.
  showCountdown: boolean;

  // Schemaläggning (ISO-tider). Tomt = ingen gräns.
  startsAt?: string;
  endsAt?: string;

  // Var den visas.
  pages: "all" | "home";
  placement: "top" | "bottom"; // för ytor som ligger i sidan

  // Utseende
  tone: "accent" | "dark";
  speed: "slow" | "normal" | "fast";
  dismissible: boolean; // toppremsa och flytande ruta kan stängas

  // Ruta som glider in
  delaySec: number; // sekunder efter att sidan öppnats
  frequency: "once" | "visit"; // en gång per person, eller en gång per besök
  maxViews: number; // högsta antal visningar per besökare, 0 = ingen gräns
  stayUntilClosed: boolean; // följer med vid scroll tills besökaren stänger
  autoHideSec: number; // om inte stayUntilClosed: försvinner efter så här många sekunder
};

export const CAMPAIGN_META: Record<
  CampaignType,
  { label: string; desc: string; floating: boolean; countdown: boolean; button: boolean; where: boolean }
> = {
  topbar: { label: msg("Toppremsa"), desc: msg("Smal remsa överst med budskap som växlar."), floating: false, countdown: false, button: false, where: false },
  marquee: { label: msg("Rullande textband"), desc: msg("Stora ord som rullar förbi över hela bredden."), floating: false, countdown: false, button: false, where: true },
  sticky: { label: msg("Ruta längst ner"), desc: msg("Ligger kvar i nederkanten när besökaren scrollar, med knapp och valfri nedräkning."), floating: true, countdown: true, button: true, where: false },
  hero: { label: msg("Kampanjhero"), desc: msg("Stor kampanjyta med rubrik, knapp och valfri nedräkning."), floating: false, countdown: true, button: true, where: true },
  cards: { label: msg("Rullande kort"), desc: msg("Flera erbjudanden som glider förbi, ett kort var."), floating: false, countdown: false, button: false, where: true },
  badge: { label: msg("Rabattmärke"), desc: msg("Ett litet snurrande märke i hörnet, till exempel -30%."), floating: true, countdown: false, button: false, where: false },
  diagonal: { label: msg("Korsande band"), desc: msg("Två diagonala band som rullar åt olika håll."), floating: false, countdown: false, button: false, where: true },
  slidein: { label: msg("Ruta som glider in"), desc: msg("En ruta som glider in från sidan, med inställningar för hur ofta och hur många gånger."), floating: true, countdown: false, button: true, where: false },
};

export function newCampaignId(): string {
  return "c" + Math.random().toString(36).slice(2, 9);
}

export function newCampaign(type: CampaignType): Campaign {
  const base: Campaign = {
    id: newCampaignId(),
    type,
    enabled: true,
    name: CAMPAIGN_META[type].label,
    rev: Date.now(),
    lines: [],
    lines2: [],
    kicker: "",
    heading: "",
    emphasis: "",
    body: "",
    badgeText: "",
    badgeSub: "",
    cards: [],
    buttonText: "",
    buttonLink: "",
    showCountdown: false,
    pages: "all",
    placement: "top",
    tone: "accent",
    speed: "normal",
    dismissible: true,
    delaySec: 4,
    frequency: "visit",
    maxViews: 0,
    stayUntilClosed: true,
    autoHideSec: 12,
  };
  switch (type) {
    case "topbar":
      return { ...base, tone: "dark", lines: ["Fri frakt vid köp över 500 kr", "Nytt: presentkort på nätet"] };
    case "marquee":
      return { ...base, lines: ["Rea", "Boka nu", "Begränsat antal"] };
    case "sticky":
      return { ...base, heading: "Black Week: 25 procent på allt", kicker: "Erbjudandet tar slut om", buttonText: "Köp nu", showCountdown: true, tone: "dark" };
    case "hero":
      return { ...base, kicker: "Endast till söndag", heading: "Hela sortimentet 20 procent billigare", emphasis: "20 procent", buttonText: "Se erbjudandet", showCountdown: true, tone: "dark" };
    case "cards":
      return { ...base, heading: "Det här händer just nu", cards: [{ title: "Erbjudande ett", text: "Kort beskrivning", label: "Nytt" }, { title: "Erbjudande två", text: "Kort beskrivning", label: "-20%" }, { title: "Erbjudande tre", text: "Kort beskrivning" }] };
    case "badge":
      return { ...base, badgeText: "-30%", badgeSub: "första besöket" };
    case "diagonal":
      return { ...base, lines: ["Event den 13 december", "Fri entré"], lines2: ["Boka din plats", "Begränsat antal"] };
    case "slidein":
      return { ...base, kicker: "Veckans erbjudande", heading: "Lussekatt och kaffe för 39 kr", buttonText: "Se mer", delaySec: 4, frequency: "visit", maxViews: 0, stayUntilClosed: true };
  }
}

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/\s+$/g, "").slice(0, max) : "");
const lines = (v: unknown, n: number, max: number): string[] =>
  Array.isArray(v) ? v.map((x) => str(x, max).trim()).filter(Boolean).slice(0, n) : [];
const iso = (v: unknown): string | undefined => {
  if (typeof v !== "string" || !v) return undefined;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
};
const num = (v: unknown, min: number, max: number, def: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
};
const url = (v: unknown): string | undefined => {
  const s = str(v, 600).trim();
  return s && /^(https?:\/\/|\/)/i.test(s) ? s : undefined;
};
const link = (v: unknown): string => {
  const s = str(v, 600).trim();
  return !s || /^(https?:\/\/|\/|#)/i.test(s) ? s : "";
};
const oneOf = <T extends string>(v: unknown, list: readonly T[], def: T): T => (list.includes(v as T) ? (v as T) : def);

// Rensar allt som kommer från webbläsaren innan det sparas.
export function sanitizeCampaigns(input: unknown): Campaign[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: Campaign[] = [];
  for (const raw of input.slice(0, MAX_CAMPAIGNS)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const type = oneOf(r.type, CAMPAIGN_TYPES, "topbar");
    let id = str(r.id, 24).replace(/[^a-zA-Z0-9_-]/g, "") || newCampaignId();
    if (seen.has(id)) id = newCampaignId();
    seen.add(id);
    const cards = Array.isArray(r.cards)
      ? r.cards
          .slice(0, MAX_CAMPAIGN_CARDS)
          .map((c) => {
            const x = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
            const card: CampaignCard = { title: str(x.title, 80).trim() };
            const text = str(x.text, 160).trim();
            const label = str(x.label, 20).trim();
            const imageUrl = url(x.imageUrl);
            const l = link(x.link);
            if (text) card.text = text;
            if (label) card.label = label;
            if (imageUrl) card.imageUrl = imageUrl;
            if (l) card.link = l;
            return card;
          })
          .filter((c) => c.title)
      : [];
    const c: Campaign = {
      id,
      type,
      enabled: r.enabled !== false,
      name: str(r.name, 60).trim() || CAMPAIGN_META[type].label,
      rev: num(r.rev, 0, 9007199254740991, Date.now()),
      lines: lines(r.lines, MAX_CAMPAIGN_LINES, 120),
      lines2: lines(r.lines2, MAX_CAMPAIGN_LINES, 120),
      kicker: str(r.kicker, 80).trim(),
      heading: str(r.heading, 140).trim(),
      emphasis: str(r.emphasis, 60).trim(),
      body: str(r.body, 240).trim(),
      badgeText: str(r.badgeText, 12).trim(),
      badgeSub: str(r.badgeSub, 24).trim(),
      cards,
      buttonText: str(r.buttonText, 40).trim(),
      buttonLink: link(r.buttonLink),
      showCountdown: r.showCountdown === true,
      pages: oneOf(r.pages, ["all", "home"] as const, "all"),
      placement: oneOf(r.placement, ["top", "bottom"] as const, "top"),
      tone: oneOf(r.tone, ["accent", "dark"] as const, "accent"),
      speed: oneOf(r.speed, ["slow", "normal", "fast"] as const, "normal"),
      dismissible: r.dismissible !== false,
      delaySec: num(r.delaySec, 0, 120, 4),
      frequency: oneOf(r.frequency, ["once", "visit"] as const, "visit"),
      maxViews: num(r.maxViews, 0, 99, 0),
      stayUntilClosed: r.stayUntilClosed !== false,
      autoHideSec: num(r.autoHideSec, 3, 120, 12),
    };
    const imageUrl = url(r.imageUrl);
    if (imageUrl) c.imageUrl = imageUrl;
    const s = iso(r.startsAt);
    const e = iso(r.endsAt);
    if (s) c.startsAt = s;
    if (e) c.endsAt = e;
    out.push(c);
  }
  return out;
}

// Är kampanjen aktiv just nu? I redigeraren (ignoreSchedule) visas alla
// påslagna kampanjer, så kunden ser vad hen har gjort även före startdatum.
export function campaignLive(c: Campaign, now: number, ignoreSchedule = false): boolean {
  if (!c.enabled) return false;
  if (ignoreSchedule) return true;
  if (c.startsAt && now < Date.parse(c.startsAt)) return false;
  if (c.endsAt && now >= Date.parse(c.endsAt)) return false;
  return true;
}

export function campaignOnPage(c: Campaign, pagePath: string): boolean {
  return c.pages === "all" || pagePath === "/";
}

// Statusen som visas i listan i redigeraren.
export type CampaignStatus = "off" | "scheduled" | "live" | "ended";
export function campaignStatus(c: Campaign, now: number): CampaignStatus {
  if (!c.enabled) return "off";
  if (c.startsAt && now < Date.parse(c.startsAt)) return "scheduled";
  if (c.endsAt && now >= Date.parse(c.endsAt)) return "ended";
  return "live";
}

// datetime-local (webbläsarens lokala tid) <-> ISO
export function isoToLocalInput(v?: string): string {
  if (!v) return "";
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function localInputToIso(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
}
