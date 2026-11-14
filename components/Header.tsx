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
  { href: "/demo", label: msg("Prova demon") },
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
    <div className="bg-ink relative">
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
        {/* Mobil: knapp för inloggning/kundzon och en hamburgarmeny (menyn ovan visas bara på bred skärm). */}
        <div className="md:hidden flex items-center gap-3">
          {user ? (
            <Link href="/dashboard" className="bg-accent text-accent-ink font-bold px-3.5 py-2 rounded-lg text-[13px]">
              {t("Till kundzonen →")}
            </Link>
          ) : (
            <Link href="/logga-in" className="bg-accent text-accent-ink font-bold px-3.5 py-2 rounded-lg text-[13px]">
              {t("Logga in")}
            </Link>
          )}
          <details className="group">
            <summary
              aria-label={t("Meny")}
              className="list-none [&::-webkit-details-marker]:hidden cursor-pointer w-10 h-10 flex items-center justify-center rounded-lg text-white border border-white/20"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="group-open:hidden">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="hidden group-open:block">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </summary>
            <div className="absolute left-0 right-0 top-full z-50 bg-ink border-t border-white/10 px-6 pt-3 pb-6 shadow-[0_18px_30px_rgba(0,0,0,0.35)]">
              <nav className="flex flex-col">
                {navLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={localizedPath(l.href, locale)}
                    className={`py-3.5 text-[17px] border-b border-white/10 ${active === l.href ? "text-white font-semibold" : "text-[#C9C7C2]"}`}
                  >
                    {t(l.label)}
                  </Link>
                ))}
              </nav>
              <div className="mt-5 flex items-center justify-between gap-4">
                <LanguageSwitcher tone="dark" />
                {!user && (
                  <Link href="/skapa-konto" className="bg-accent text-accent-ink font-bold px-5 py-3 rounded-lg text-[14.5px]">
                    {t("Kom igång")}
                  </Link>
                )}
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
