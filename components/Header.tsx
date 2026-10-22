import { msg, localizedPath } from "@/lib/i18n/config";
import { getT, getLocale } from "@/lib/i18n/server";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Logo from "./Logo";
import { createClient } from "@/lib/supabase/server";

const navLinks = [
  { href: "/funktioner", label: msg("Funktioner") },
  { href: "/priser", label: msg("Priser") },
  { href: "/exempel", label: msg("Exempel") },
  { href: "/om-oss", label: msg("Om oss") },
  { href: "/kontakt", label: msg("Kontakt") },
];

// Innan kollade den här headern aldrig om besökaren var inloggad — så även
// en kund som redan var inloggad såg "Logga in"/"Kom igång" på
// marknadsföringssidorna och fick logga in på nytt för att nå sin kundzon.
// Nu är den async och kollar sessionen, precis som sidorna under
// /dashboard m.fl. redan gör.
export default async function Header({ active }: { active?: string }) {
  const locale = getLocale();
  const t = getT(locale);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="bg-ink">
      <div className="flex items-center justify-between px-6 md:px-12 py-5">
        <Link href={localizedPath("/", locale)}>
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-[#C9C7C2]">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={localizedPath(l.href, locale)}
              className={active === l.href ? "text-white" : "hover:text-white transition-colors"}
            >
              {t(l.label)}
            </Link>
          ))}
          <LanguageSwitcher tone="dark" />
          {user ? (
            <Link
              href="/dashboard"
              className="bg-accent text-accent-ink font-bold px-[18px] py-[9px] rounded-lg text-[13.5px]"
            >
              {t("Till kundzonen →")}
            </Link>
          ) : (
            <>
              <Link href="/logga-in" className="text-white font-semibold">
                {t("Logga in")}
              </Link>
              <Link
                href="/skapa-konto"
                className="bg-accent text-accent-ink font-bold px-[18px] py-[9px] rounded-lg text-[13.5px]"
              >
                {t("Kom igång")}
              </Link>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
