"use client";

import { useT } from "@/components/I18nProvider";
import TwoFactorSetup, { type TwoFactorTexts } from "@/components/TwoFactorSetup";

export default function TwoFactorTab() {
  const t = useT();
  const texts: TwoFactorTexts = {
    title: t("Tvåstegsverifiering"),
    intro: t("Skydda ditt konto med en engångskod från en app i mobilen (till exempel Google Authenticator, Microsoft Authenticator eller 1Password). Då räcker det inte att någon fått tag i ditt lösenord."),
    enable: t("Slå på tvåstegsverifiering"),
    scan: t("Öppna din autentiseringsapp och skanna QR-koden."),
    orEnter: t("Går det inte att skanna? Skriv in den här nyckeln i appen:"),
    enterCode: t("Skriv in den sexsiffriga koden som appen visar"),
    confirm: t("Bekräfta och slå på"),
    wrong: t("Fel kod. Försök igen."),
    on: t("Tvåstegsverifiering är påslagen."),
    off: t("Av"),
    backupTitle: t("Spara dina reservkoder"),
    backupHint: t("Om du tappar telefonen kan du logga in med en reservkod i stället. Varje kod fungerar en gång. Spara dem på ett säkert ställe, de visas bara nu."),
    saved: t("Jag har sparat dem"),
    copy: t("Kopiera koderna"),
    copied: t("Kopierade ✓"),
    newCodes: t("Skapa nya reservkoder"),
    disable: t("Stäng av"),
    disableConfirm: t("Stänga av tvåstegsverifieringen?"),
    working: t("Hämtar …"),
    required: t("Tvåstegsverifiering krävs för det här kontot."),
    error: t("Något gick fel. Försök igen."),
  };
  return (
    <div className="flex-1 max-w-[560px]">
      <h1 className="text-[28px] font-medium mb-6.5">{t("Tvåstegsverifiering")}</h1>
      <TwoFactorSetup texts={texts} />
    </div>
  );
}
