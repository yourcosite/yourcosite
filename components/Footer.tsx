import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Footer() {
  const t = getT();
  return (
    <div className="px-6 md:px-12 py-4 border-t border-line flex flex-col sm:flex-row gap-3 justify-between items-center text-[12.5px] text-ink-dim bg-surface">
      <span>{t("© 2026 YourCoSite, en produkt från CS Kommunikationsbyrå AB")}</span>
      <div className="flex gap-4 items-center flex-wrap justify-center">
        <Link href="/om-oss">{t("Om oss")}</Link>
        <Link href="/kontakt">{t("Kontakt")}</Link>
        <Link href="/anvandarvillkor">{t("Användarvillkor")}</Link>
        <Link href="/integritetspolicy">{t("Integritetspolicy")}</Link>
        <LanguageSwitcher />
      </div>
    </div>
  );
}
