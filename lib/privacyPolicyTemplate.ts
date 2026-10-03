// Enkel, FAST textmall för kundens integritetspolicy när de inte har en
// egen att ladda upp (onboarding steg 5). Medvetet INTE AI-skriven — det
// här är juridiskt grundinnehåll, och en språkmodell som friformulerar
// det kan hitta på fel eller otydligheter. Samma princip som
// YourCoSites egna juridikdokument: en standardmall baserad på GDPR,
// inte juridisk rådgivning, och kunden uppmanas att låta en jurist
// granska innan den används skarpt.
//
// Texten returneras som "markdown-lite" — bara "## "-rubriker och
// tomrad-separerade stycken — eftersom det är allt PrivacyPolicyBlock i
// SitePreview.tsx kan rendera. Håll den formen om texten ändras.
export function generatePrivacyPolicyText({
  companyName,
  orgNumber,
  address,
  email,
}: {
  companyName: string;
  orgNumber: string;
  address: string;
  email: string;
}): string {
  return `## Personuppgiftsansvarig

${companyName}, org.nr ${orgNumber}, ${address}, är personuppgiftsansvarig för de personuppgifter som samlas in via den här webbplatsen. Vid frågor, kontakta ${email}.

## Vilka uppgifter vi samlar in

Vi samlar in de uppgifter du själv lämnar till oss, t.ex. namn, e-postadress och telefonnummer när du använder ett kontaktformulär eller bokar tid. Vi samlar också in viss teknisk besöksdata (t.ex. sidvisningar och ungefärlig plats) via cookies, men bara om du samtyckt till det — se vår cookiebanner.

## Hur vi använder uppgifterna

Uppgifterna används för att svara på din förfrågan, hantera en bokning eller beställning, och för att vid samtycke förstå hur webbplatsen används. Vi säljer aldrig dina uppgifter till tredje part.

## Lagringstid

Vi sparar uppgifterna så länge det behövs för att hantera ditt ärende, eller så länge lagen kräver (t.ex. bokföringslagen för eventuella underlag kopplade till köp).

## Dina rättigheter

Du har rätt att begära tillgång till, rättelse av eller radering av dina personuppgifter, samt rätt till dataportabilitet och att invända mot viss behandling. Kontakta oss på ${email}. Du har också rätt att klaga till Integritetsskyddsmyndigheten (IMY).

## Cookies

Vi använder cookies enligt kategorierna som visas i cookiebannern på webbplatsen. Nödvändiga cookies kan inte stängas av; övriga kräver ditt aktiva samtycke.`;
}
