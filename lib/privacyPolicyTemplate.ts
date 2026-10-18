// Enkel, FAST textmall för kundens integritetspolicy när de inte har en
// egen att ladda upp (onboarding steg 5). Medvetet INTE AI-skriven — det
// här är juridiskt grundinnehåll, och en språkmodell som friformulerar
// det kan hitta på fel eller otydligheter. Samma princip som
// YourCoSites egna juridikdokument: en standardmall baserad på GDPR,
// inte juridisk rådgivning, och kunden uppmanas att låta en jurist
// granska innan den används skarpt.
//
// Mallen finns per språk (sajtens språk) och innehåller även en
// "företagsuppgifter"-del med det landet kräver på en webbplats
// (Impressum i Tyskland, mentions légales i Frankrike, aviso legal i
// Spanien, företagsuppgifter i Norden). Språk utan egen mall får engelska.
//
// Texten returneras som "markdown-lite" — bara "## "-rubriker och
// tomrad-separerade stycken — eftersom det är allt PrivacyPolicyBlock i
// SitePreview.tsx kan rendera. Håll den formen om texten ändras.

export type PolicyInput = {
  companyName: string;
  orgNumber: string;
  address: string;
  email: string;
  lang?: string;
  country?: string | null;
  phone?: string | null;
  vatNumber?: string | null;
  legalForm?: string | null;
  register?: string | null;
  capital?: string | null;
  representative?: string | null;
};

// Tillsynsmyndighet per land (där kunden kan klaga).
const AUTHORITY: Record<string, Record<string, string>> = {
  sv: { SE: "Integritetsskyddsmyndigheten (IMY)", DK: "Datatilsynet", FI: "Tietosuojavaltuutetun toimisto", DE: "den för er delstat behöriga dataskyddsmyndigheten", FR: "CNIL", ES: "Agencia Española de Protección de Datos (AEPD)" },
  en: { SE: "the Swedish Authority for Privacy Protection (IMY)", DK: "the Danish Data Protection Agency (Datatilsynet)", FI: "the Office of the Data Protection Ombudsman (Tietosuojavaltuutetun toimisto)", DE: "the competent data protection authority of your federal state", FR: "the CNIL", ES: "the Spanish Data Protection Agency (AEPD)" },
};
const authorityFor = (lang: string, country?: string | null) =>
  (AUTHORITY[lang] ?? AUTHORITY.en)[country ?? ""] ?? (lang === "sv" ? "den nationella tillsynsmyndigheten för dataskydd" : "your national data protection authority");

function lines(rows: [string, string | null | undefined][]) {
  return rows.filter(([, v]) => v && String(v).trim()).map(([k, v]) => `${k}: ${String(v).trim()}`).join("\n\n");
}

const SV = (p: PolicyInput) => `## Företagsuppgifter

${lines([
  ["Företag", p.companyName],
  ["Bolagsform", p.legalForm],
  ["Organisationsnummer", p.orgNumber],
  ["Momsregistreringsnummer", p.vatNumber],
  ["Adress", p.address],
  ["E-post", p.email],
  ["Telefon", p.phone],
  ["Företrädare", p.representative],
  ["Register", p.register],
  ["Aktiekapital", p.capital],
])}

## Personuppgiftsansvarig

${p.companyName}, org.nr ${p.orgNumber}, ${p.address}, är personuppgiftsansvarig för de personuppgifter som samlas in via den här webbplatsen. Vid frågor, kontakta ${p.email}.

## Vilka uppgifter vi samlar in

Vi samlar in de uppgifter du själv lämnar till oss, t.ex. namn, e-postadress och telefonnummer när du använder ett kontaktformulär eller bokar tid. Vi samlar också in viss teknisk besöksdata (t.ex. sidvisningar och ungefärlig plats) via cookies, men bara om du samtyckt till det — se vår cookiebanner.

## Hur vi använder uppgifterna

Uppgifterna används för att svara på din förfrågan, hantera en bokning eller beställning, och för att vid samtycke förstå hur webbplatsen används. Vi säljer aldrig dina uppgifter till tredje part.

## Lagringstid

Vi sparar uppgifterna så länge det behövs för att hantera ditt ärende, eller så länge lagen kräver (t.ex. bokföringslagstiftningen för eventuella underlag kopplade till köp).

## Dina rättigheter

Du har rätt att begära tillgång till, rättelse av eller radering av dina personuppgifter, samt rätt till dataportabilitet och att invända mot viss behandling. Kontakta oss på ${p.email}. Du har också rätt att klaga hos ${authorityFor("sv", p.country)}.

## Cookies

Vi använder cookies enligt kategorierna som visas i cookiebannern på webbplatsen. Nödvändiga cookies kan inte stängas av; övriga kräver ditt aktiva samtycke. Om webbplatsen visar flöden eller inlägg från Facebook eller Instagram laddas de först när du har godkänt alla cookies, och då gäller även Metas egna villkor och integritetspolicy.`;

const EN = (p: PolicyInput) => {
  const de = p.country === "DE";
  const fr = p.country === "FR";
  const es = p.country === "ES";
  const heading = de ? "Legal notice (Impressum)" : fr ? "Legal notice (mentions légales)" : es ? "Legal notice (aviso legal)" : "Company information";
  return `## ${heading}

${lines([
  ["Company", p.companyName],
  ["Legal form", p.legalForm],
  ["Company registration number", p.orgNumber],
  ["VAT number", p.vatNumber],
  ["Address", p.address],
  ["Email", p.email],
  ["Phone", p.phone],
  ["Represented by", p.representative],
  ["Commercial register", p.register],
  ["Share capital", p.capital],
])}

## Data controller

${p.companyName}, company registration number ${p.orgNumber}, ${p.address}, is the data controller for the personal data collected through this website. If you have any questions, contact ${p.email}.

## What data we collect

We collect the data you give us yourself, for example your name, email address and phone number when you use a contact form or book an appointment. We also collect some technical visitor data (for example page views and approximate location) through cookies, but only if you have consented to it. See our cookie banner.

## How we use the data

The data is used to answer your enquiry, handle a booking or an order and, with your consent, to understand how the website is used. We never sell your data to third parties.

## Retention

We keep the data for as long as it is needed to handle your case, or for as long as the law requires (for example accounting rules for records linked to a purchase).

## Your rights

You have the right to request access to, rectification of or erasure of your personal data, as well as the right to data portability and to object to certain processing. Contact us at ${p.email}. You also have the right to lodge a complaint with ${authorityFor("en", p.country)}.

## Cookies

We use cookies according to the categories shown in the cookie banner on the website. Necessary cookies cannot be switched off; the others require your active consent. If the website shows feeds or posts from Facebook or Instagram, they are only loaded once you have accepted all cookies, and Meta's own terms and privacy policy then also apply.`;
};

const TEMPLATES: Record<string, (p: PolicyInput) => string> = { sv: SV, en: EN };

export function generatePrivacyPolicyText(p: PolicyInput): string {
  const make = TEMPLATES[p.lang ?? "sv"] ?? EN;
  return make(p);
}
