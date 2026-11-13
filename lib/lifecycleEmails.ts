import { getT } from "@/lib/i18n/server";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { unsubscribeUrl } from "@/lib/unsubscribe";

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
  const common = { footer, footerLinks, poweredBy: "YourCoSite", lang: locale, button: { label: t("Fortsätt bygga din sajt"), url: `${BASE}/dashboard` } };

  if (kind === "welcome") {
    return {
      subject: t("Välkommen till YourCoSite"),
      title: t("Välkommen till YourCoSite"),
      intro: `${hello}\n${t("Kul att du är här. Du bygger din hemsida genom ett samtal med Millie, vår assistent. Berätta om din verksamhet, så bygger hon första versionen åt dig.")}`,
      extra: { heading: t("Så kommer du igång"), text: t("1. Berätta om din verksamhet för Millie.\n2. Titta på förslaget och be henne ändra det du vill, med vanliga ord.\n3. Klicka på Publicera när du är nöjd.") },
      ...common,
    };
  }
  if (kind === "tips") {
    return {
      subject: t("Tre tips för en bättre sajt"),
      title: t("Tre tips för en bättre sajt"),
      intro: `${hello}\n${t("Här är tre saker som brukar göra stor skillnad när du bygger din sajt.")}`,
      extra: {
        heading: t("Tips från Millie"),
        text: t("1. Bifoga din logga och dina egna bilder i chatten med gemet, så använder Millie dem.\n2. Klicka på Mallar bredvid Historik för att se alla layouter och vad de heter. Då vet du exakt vad du ska be om.\n3. Öppna Förbättra för tips som hjälper dig synas på Google."),
      },
      ...common,
    };
  }
  return {
    subject: t("Din sajt väntar på att publiceras"),
    title: t("Din sajt väntar på dig"),
    intro: `${hello}\n${t("Det har gått en vecka sedan du skapade ditt konto, och din sajt är inte publicerad än. Det går fort att komma i mål.")}`,
    extra: {
      heading: t("Det här återstår"),
      text: t("1. Gå igenom sidorna och be Millie ändra det som inte känns rätt.\n2. Klicka på Publicera i redigeraren, så får sajten en egen adress.\n3. Vill du ha din egen domän kan du koppla den direkt i samma fönster.\nKör du fast? Kontakta supporten i tjänsten, så hjälper vi dig."),
    },
    ...common,
  };
}

