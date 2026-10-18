"use client";

import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";
import { useLocale } from "@/components/I18nProvider";

// Låter besökaren byta språk för hela verktyget. Valet sparas i en kaka i
// ett år och gäller nästa gång också.
export default function LanguageSwitcher({ tone = "light", className = "" }: { tone?: "light" | "dark"; className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const change = (next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <select
      aria-label="Language"
      value={locale}
      onChange={(e) => change(e.target.value as Locale)}
      className={`text-[13px] rounded-lg border bg-transparent px-2 py-1.5 cursor-pointer [&>option]:text-[#17171A] ${tone === "dark" ? "border-[#3A3A3E] text-[#C9C7C2]" : "border-line text-ink"} ${className}`}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_NAMES[l]}
        </option>
      ))}
    </select>
  );
}
