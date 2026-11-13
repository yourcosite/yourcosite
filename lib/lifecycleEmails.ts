import { getT } from "@/lib/i18n/server";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { unsubscribeUrl } from "@/lib/unsubscribe";
import type { BrandedStep } from "@/lib/emailBrand";

// Innehållet i de automatiska mejlen (se app/api/cron/lifecycle-emails).
const BASE = "https://www.yourcosite.com";

export type LifecycleKind = "welcome" | "tips" | "nudge";
export type LifecycleProfile = { id: string; email: string | null; full_name: string | null; language: string | null; created_at: string };

export function buildLifecycleEmail(kind: LifecycleKind, p: LifecycleProfile) {
  const locale: Locale = isLocale(p.language) ? p.language : "sv";
  const t = getT(locale);
  const first = (p.full_name || "").trim().split(/\s+/)[0] || "";
  const hello = first ? t("Hej {name}!", { name: first }) : t("Hej!");
  const footer = t("Du får det här mejlet för att du har skapat ett konto hos YourCoSite. Det går inte att svara på mejlet.");
  const footerLinks = [
    { label: t("Kontakta supporten"), url: `${BASE}/support` },
    { label: t("Avanmäl dig från tipsmejl"), url: unsubscribeUrl(p.id) },
  ];
  const url = `${BASE}/dashboard`;
  const common = { footer, footerLinks, lang: locale };
  const S = (title: string, text: string): BrandedStep => ({ title, text });

  if (kind === "welcome") {
    return {
      subject: t("Välkommen till YourCoSite"),
      title: t("Välkommen till YourCoSite"),
      intro: `${hello}\n${t("Kul att du är här! Med YourCoSite bygger du din hemsida genom ett samtal med Millie, vår assistent. Här är hela vägen från idé till publicerad sajt.")}`,
      sectionHeading: t("Så kommer du igång"),
      steps: [
        S(t("Berätta om din verksamhet"), t("Svara på några frågor om vad du gör, så bygger Millie första versionen av din sajt åt dig.")),
        S(t("Välj bland många mallar"), t("Du får många olika förslag med egen stil, färger och layouter. Titta igenom dem och välj den du tycker bäst om.")),
        S(t("Gör ändringarna du vill"), t("Be Millie ändra texter, bilder och layouter med vanliga ord. Bifoga din logga och dina bilder med gemet, och klicka på Mallar bredvid Historik för att se alla layouter.")),
        S(t("Publicera"), t("Klicka på Publicera. Din sajt får direkt en gratis adress hos oss, så att du kan visa den för alla.")),
        S(t("Koppla din egen domän"), t("Har du köpt en domän? Skriv in den i Publicera-fönstret, så guidar vi dig steg för steg, med guider för de vanligaste webbhotellen. Har du ingen domän använder du bara den gratis adressen.")),
      ],
      note: { heading: t("Bra att veta"), text: t("Allt går att ändra i efterhand. Ångrar du dig kan du backa med Ångra senaste eller gå tillbaka till en tidigare version under Historik.") },
      button: { label: t("Kom igång nu"), url },
      ...common,
    };
  }
  if (kind === "tips") {
    return {
      subject: t("Tre tips för en bättre sajt"),
      title: t("Tre tips för en bättre sajt"),
      intro: `${hello}\n${t("Här är tre saker som brukar göra stor skillnad när du bygger din sajt.")}`,
      sectionHeading: t("Tips från Millie"),
      steps: [
        S(t("Använd dina egna bilder"), t("Bifoga din logga och dina egna bilder i chatten med gemet, så använder Millie dem.")),
        S(t("Se alla layouter"), t("Klicka på Mallar bredvid Historik för att se alla layouter och vad de heter. Då vet du exakt vad du ska be om.")),
        S(t("Bli hittad på Google"), t("Öppna Förbättra för tips som hjälper dig synas på Google.")),
      ],
      note: undefined,
      button: { label: t("Fortsätt bygga din sajt"), url },
      ...common,
    };
  }
  return {
    subject: t("Din sajt väntar på att publiceras"),
    title: t("Din sajt väntar på dig"),
    intro: `${hello}\n${t("Det har gått en vecka sedan du skapade ditt konto, och din sajt är inte publicerad än. Det går fort att komma i mål.")}`,
    sectionHeading: t("Det här återstår"),
    steps: [
      S(t("Gå igenom sidorna"), t("Be Millie ändra det som inte känns rätt.")),
      S(t("Publicera"), t("Klicka på Publicera i redigeraren, så får sajten en egen adress.")),
      S(t("Egen domän (valfritt)"), t("Vill du ha din egen domän kan du koppla den direkt i samma fönster, med guider för de vanligaste webbhotellen.")),
    ],
    note: { heading: t("Kör du fast?"), text: t("Kontakta supporten, så hjälper vi dig.") },
    button: { label: t("Fortsätt bygga din sajt"), url },
    ...common,
  };
}
