// Webbhotell och domänleverantörer per land för guiden "koppla egen domän"
// (app/guide/egen-doman). path = var man hittar DNS-inställningarna, skrivet
// på webbhotellets eget språk eftersom det är det kunden ser i menyerna.
// Menyvägarna är kontrollerade mot respektive webbhotells egen hjälp
// (verified: true); övriga får allmänna steg utan påhittade menynamn.

export type HostGuide = {
  id: string;
  name: string;
  countries: string[];
  path?: string;
  verified: boolean;
  helpUrl?: string;
  // Hos Loopia kan CNAME inte läggas på själva domänen (gäller alla, men
  // Loopia nämner det uttryckligen).
  noteKey?: "loopia";
};

export const COUNTRIES = ["SE", "DK", "FI", "DE", "FR", "ES", "OTHER"] as const;
export type CountryCode = (typeof COUNTRIES)[number];

export const HOSTS: HostGuide[] = [
  { id: "one", name: "one.com", countries: ["SE", "DK", "FI", "DE", "FR", "ES"], path: "Kontrollpanelen, DNS-inställningar, Egna DNS-inställningar", verified: true },
  { id: "loopia", name: "Loopia", countries: ["SE"], path: "Kundzon, klicka på domänen, DNS-editor", verified: true, helpUrl: "https://support.loopia.com/wiki/dns-editor-a-and-cname-2/", noteKey: "loopia" },
  { id: "binero", name: "Binero", countries: ["SE"], verified: false },
  { id: "oderland", name: "Oderland", countries: ["SE"], verified: false },
  { id: "simply", name: "Simply.com", countries: ["DK"], path: "Log ind, vælg domæne, DNS", verified: true, helpUrl: "https://www.simply.com/en/support/faq/domain/" },
  { id: "danhost", name: "Danhost", countries: ["DK"], verified: false },
  { id: "louhi", name: "Louhi", countries: ["FI"], verified: false },
  { id: "zoner", name: "Zoner", countries: ["FI"], verified: false },
  { id: "ionos", name: "IONOS", countries: ["DE", "FR", "ES"], path: "Domains & SSL, Aktionen (drei Punkte), DNS", verified: true, helpUrl: "https://www.ionos.com/help/domains/dns-settings/" },
  { id: "strato", name: "STRATO", countries: ["DE"], verified: false },
  { id: "allinkl", name: "ALL-INKL", countries: ["DE"], verified: false },
  { id: "ovh", name: "OVHcloud", countries: ["FR", "ES"], path: "Web Cloud, Noms de domaine, votre domaine, Zone DNS, Ajouter une entrée", verified: true, helpUrl: "https://docs.ovhcloud.com/fr/guides/web-cloud/domains/dns-zone-edit" },
  { id: "o2switch", name: "o2switch", countries: ["FR"], verified: false },
  { id: "gandi", name: "Gandi", countries: ["FR"], verified: false },
  { id: "dinahosting", name: "Dinahosting", countries: ["ES"], verified: false },
  { id: "arsys", name: "Arsys", countries: ["ES"], verified: false },
  { id: "dondominio", name: "DonDominio", countries: ["ES"], verified: false },
  { id: "godaddy", name: "GoDaddy", countries: ["SE", "DK", "FI", "DE", "FR", "ES", "OTHER"], verified: false },
  { id: "cloudflare", name: "Cloudflare", countries: ["SE", "DK", "FI", "DE", "FR", "ES", "OTHER"], verified: false },
  { id: "namecheap", name: "Namecheap", countries: ["OTHER"], verified: false },
  { id: "hostinger", name: "Hostinger", countries: ["OTHER"], verified: false },
];

export function hostsFor(country: CountryCode): HostGuide[] {
  return HOSTS.filter((h) => h.countries.includes(country));
}
