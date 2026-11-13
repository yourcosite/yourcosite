import { getT } from "@/lib/i18n/server";
import { isLocale, type Locale } from "@/lib/i18n/config";

// Mejlet till kunden när admin har lagt in ett beställt tillägg
// (app/api/admin/orders/[id]). Servicemejl: ingen avanmälan.
const BASE = "https://www.yourcosite.com";

export type OrderProfile = { id: string; full_name: string | null; language: string | null };

export function buildOrderEmail(kind: string, p: OrderProfile) {
  const locale: Locale = isLocale(p.language) ? p.language : "sv";
  const t = getT(locale);
  const first = (p.full_name || "").trim().split(/\s+/)[0] || "";
  const hello = first ? t("Hej {name}!", { name: first }) : t("Hej!");
  const common = {
    lang: locale,
    footer: t("Du får det här mejlet för att du har beställt ett tillägg hos YourCoSite. Det går inte att svara på mejlet."),
    footerLinks: [{ label: t("Kontakta supporten"), url: `${BASE}/support` }],
    button: { label: t("Öppna din översikt"), url: `${BASE}/dashboard` },
    sectionHeading: undefined as string | undefined,
    steps: undefined,
  };
  if (kind === "site") {
    return {
      ...common,
      subject: t("Din extra sajt är tillagd"),
      title: t("Din extra sajt är tillagd"),
      intro: `${hello}\n${t("Vi har lagt till plats för en extra sajt på ditt konto. Du kan börja bygga den direkt.")}`,
      note: { heading: t("Så här gör du"), text: t("Gå till din översikt och klicka på Skapa ny sajt. Den nya sajten får egna 30 ändringar per månad.") },
    };
  }
  if (kind === "changes50") {
    return {
      ...common,
      subject: t("Dina extra ändringar är aktiverade"),
      title: t("Dina extra ändringar är aktiverade"),
      intro: `${hello}\n${t("Vi har lagt till 50 extra ändringar på din sajt. Du kan använda dem direkt.")}`,
      note: { heading: t("Så här gör du"), text: t("Fortsätt som vanligt: be Millie ändra det du vill i redigeraren. Du ser hur många ändringar du har kvar där.") },
    };
  }
  return {
    ...common,
    subject: t("Dina extra språk är aktiverade"),
    title: t("Dina extra språk är aktiverade"),
    intro: `${hello}\n${t("Vi har aktiverat ditt extra språk på din sajt.")}`,
    note: { heading: t("Så här gör du"), text: t("Öppna Inställningar i redigeraren för att välja och hantera språken på din sajt.") },
  };
}
