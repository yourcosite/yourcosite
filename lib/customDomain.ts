import dns from "dns/promises";
import { domainToASCII } from "url";

// Egen domän: rensa inmatning, ange vilka DNS-poster kunden ska lägga in,
// kontrollera att de pekar rätt och (om Vercel-nyckel finns) lägg till
// domänen i vårt Vercel-projekt. Saknas VERCEL_API_TOKEN lägger vi i stället
// till domänen för hand (vi får ett mejl) — DNS-kontrollen fungerar ändå.

export const VERCEL_A = "76.76.21.21";
export const VERCEL_CNAME = "cname.vercel-dns.com";

const SECOND_LEVEL = new Set(["co", "com", "org", "net", "gov", "ac", "edu"]);
const RESERVED = /(^|\.)(yourcosite\.com|vercel\.app|vercel\.com|localhost)$/;

// "https://www.Kund.se/sida" -> "kund.se". Ogiltigt -> null.
export function cleanDomain(input: string): string | null {
  let d = (input || "").trim().toLowerCase();
  d = d.replace(/^[a-z]+:\/\//, "").split("/")[0].split("?")[0].replace(/:\d+$/, "");
  d = d.replace(/^www\./, "").replace(/\.$/, "");
  // Domäner med å, ä, ö osv. sparas i punycode (xn--...), som DNS och webbläsare använder.
  d = domainToASCII(d);
  if (d.length < 4 || d.length > 253) return null;
  if (!/^(?:[a-z0-9-]{1,63}\.)+[a-z0-9-]{2,63}$/.test(d)) return null;
  if (/^-|-\.|\.-/.test(d) || RESERVED.test(d)) return null;
  return d;
}

// Rotdomän (kund.se, kund.co.uk) eller underdomän (shop.kund.se)?
export function isApex(domain: string): boolean {
  const labels = domain.split(".");
  if (labels.length === 2) return true;
  return labels.length === 3 && SECOND_LEVEL.has(labels[1]) && labels[2].length === 2;
}

export type DnsRecord = { type: "A" | "CNAME"; name: string; value: string };

export function requiredRecords(domain: string): DnsRecord[] {
  if (isApex(domain)) {
    return [
      { type: "A", name: "@", value: VERCEL_A },
      { type: "CNAME", name: "www", value: VERCEL_CNAME },
    ];
  }
  return [{ type: "CNAME", name: domain.split(".")[0], value: VERCEL_CNAME }];
}

const CNAME_OK = /(^|\.)vercel-dns(-\d+)?\.com\.?$/;

async function pointsHere(host: string): Promise<{ ok: boolean; seen: string[] }> {
  const seen: string[] = [];
  try {
    const cn = await dns.resolveCname(host);
    seen.push(...cn);
    if (cn.some((c) => CNAME_OK.test(c))) return { ok: true, seen };
  } catch { /* ingen CNAME */ }
  try {
    const a = await dns.resolve4(host);
    seen.push(...a);
    const ours = new Set<string>([VERCEL_A]);
    try { (await dns.resolve4("www.yourcosite.com")).forEach((x) => ours.add(x)); } catch { /* */ }
    try { (await dns.resolve4("yourcosite.com")).forEach((x) => ours.add(x)); } catch { /* */ }
    if (a.some((x) => ours.has(x))) return { ok: true, seen };
  } catch { /* ingen A-post */ }
  return { ok: false, seen };
}

export type DomainCheck = { dnsOk: boolean; apexOk: boolean; wwwOk: boolean; seen: string[] };

// Rotdomänen måste peka rätt; www är bra att ha men krävs inte för "aktiv".
export async function checkDns(domain: string): Promise<DomainCheck> {
  const main = await pointsHere(domain);
  if (!isApex(domain)) return { dnsOk: main.ok, apexOk: main.ok, wwwOk: true, seen: main.seen };
  const www = await pointsHere(`www.${domain}`);
  return { dnsOk: main.ok || www.ok, apexOk: main.ok, wwwOk: www.ok, seen: [...main.seen, ...www.seen] };
}

// --- Vercel ---------------------------------------------------------------
const token = () => process.env.VERCEL_API_TOKEN;
const project = () => process.env.VERCEL_PROJECT_ID;
const team = () => (process.env.VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : "");

export const vercelConfigured = () => !!(token() && project());

async function vercel(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; json: any }> {
  const res = await fetch(`https://api.vercel.com${path}${team()}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

// Lägger till domänen (och www för rotdomäner) i Vercel-projektet. Redan
// tillagd räknas som lyckat.
export async function addToVercel(domain: string): Promise<{ ok: boolean; error?: string }> {
  if (!vercelConfigured()) return { ok: false, error: "manual" };
  const names = isApex(domain) ? [domain, `www.${domain}`] : [domain];
  for (const name of names) {
    const r = await vercel("POST", `/v10/projects/${project()}/domains`, { name });
    if (!r.ok && r.json?.error?.code !== "domain_already_exists") {
      return { ok: false, error: r.json?.error?.message || `Vercel svarade ${r.status}` };
    }
  }
  return { ok: true };
}

export async function removeFromVercel(domain: string): Promise<void> {
  if (!vercelConfigured()) return;
  const names = isApex(domain) ? [domain, `www.${domain}`] : [domain];
  for (const name of names) {
    await vercel("DELETE", `/v9/projects/${project()}/domains/${encodeURIComponent(name)}`).catch(() => {});
  }
}

// Är domänen tillagd och verifierad i vårt projekt? (null = vet ej / ingen nyckel)
export async function vercelStatus(domain: string): Promise<{ added: boolean; verified: boolean } | null> {
  if (!vercelConfigured()) return null;
  const r = await vercel("GET", `/v9/projects/${project()}/domains/${encodeURIComponent(domain)}`);
  if (r.status === 404) return { added: false, verified: false };
  if (!r.ok) return null;
  return { added: true, verified: r.json?.verified !== false };
}
