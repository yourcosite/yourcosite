import { getT, getLocale } from "@/lib/i18n/server";
import { localizedPath } from "@/lib/i18n/config";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Footer() {
  const locale = getLocale();
  const t = getT(locale);
  const lp = (p: string) => localizedPath(p, locale);
  return (
    <div className="px-6 md:px-12 py-4 border-t border-line flex flex-col sm:flex-row gap-3 justify-between items-center text-[12.5px] text-ink-dim bg-surface">
      <span>{t("© 2026 YourCoSite, en produkt från CS Kommunikationsbyrå AB")}</span>
      <div className="flex gap-4 items-center flex-wrap justify-center">
        <Link href={lp("/om-oss")}>{t("Om oss")}</Link>
        <Link href={lp("/kontakt")}>{t("Kontakt")}</Link>
        <Link href={lp("/anvandarvillkor")}>{t("Användarvillkor")}</Link>
        <Link href={lp("/integritetspolicy")}>{t("Integritetspolicy")}</Link>
        <LanguageSwitcher />
      </div>
    </div>
  );
}
