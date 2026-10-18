"use client";

import { useT, useLocale } from "@/components/I18nProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/client";

// Eget språkval i inställningarna. Språket byts direkt för hela verktyget
// (kakan) och sparas på kontot (profiles.language) i samma klick.
export default function LanguageTab() {
  const t = useT();
  const router = useRouter();
  const current = useLocale();
  const [lang, setLang] = useState<Locale>(current);
  const [error, setError] = useState<string | null>(null);

  const change = async (l: Locale) => {
    setLang(l);
    setError(null);
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error: e } = await supabase.from("profiles").update({ language: l }).eq("id", user.id);
      if (e) setError(e.message);
    }
    router.refresh();
  };

  return (
    <div className="flex-1 max-w-[560px]">
      <h1 className="text-[28px] font-medium mb-6.5">{t("Språk")}</h1>
      <div className="bg-surface border border-line rounded-2xl p-6">
        <p className="text-[13.5px] text-ink-dim mb-4">
          {t("Välj språk för verktyget, mejl och Millie. Valet sparas på ditt konto.")}
        </p>
        <div className="flex gap-2.5 flex-wrap">
          {LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => change(l)}
              className={`px-4.5 py-2 rounded-full text-[13.5px] font-semibold ${
                lang === l ? "bg-accent text-accent-ink" : "border border-line text-ink-dim"
              }`}
            >
              {LOCALE_NAMES[l]}
            </button>
          ))}
        </div>
        {error && <div className="text-[13.5px] text-warm font-medium mt-3">{error}</div>}
      </div>
    </div>
  );
}
