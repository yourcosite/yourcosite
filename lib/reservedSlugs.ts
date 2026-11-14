// Namn som aldrig får bli en sajts publika adress (www.yourcosite.com/<namn>):
// våra egna sidor och mappar, språkprefix och ord som lätt förväxlas med oss.
// scripts/check-reserved-slugs.cjs kontrollerar att varje toppmapp i app/ finns
// med här, så en ny sida inte råkar krocka med en kunds adress.
export const RESERVED_SLUGS = new Set<string>([
  // Mappar och sidor i appen
  "admin", "anvandarvillkor", "api", "aterstall-losenord", "avanmal", "auth", "avboka", "bokningar", "bygger",
  "dashboard", "dela", "demo", "exempel", "fakturering", "forbattra", "forhandsgranska", "forslag",
  "funktioner", "guide", "icon", "installningar", "integritetspolicy", "kontakt", "logga-in", "nyheter",
  "om-oss", "onboarding", "opengraph-image", "priser", "publik", "redigera", "robots", "robots.txt",
  "s", "sidor", "sitemap", "sitemap.xml", "skapa-konto", "statistik", "support", "webbplats", "webbplats-innehall",
  "error", "global-error", "not-found", "images", "favicon.ico",
  // Språkprefix
  "sv", "en", "da", "fi", "de", "fr", "es",
  // Ord som lätt förväxlas med oss eller används tekniskt
  "www", "app", "static", "assets", "public", "login", "logout", "signin", "signup", "register", "account",
  "settings", "help", "blog", "news", "about", "contact", "pricing", "terms", "privacy", "status", "mail",
  "email", "ftp", "cdn", "send", "rsend", "resend", "smtp", "imap", "pop", "mx", "ns1", "ns2", "webmail", "autodiscover", "dmarc", "test", "yourcosite", "yourco", "millie", "stripe", "vercel", "supabase",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
