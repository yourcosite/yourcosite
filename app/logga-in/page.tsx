"use client";

import { rich } from "@/lib/i18n/rich";
import { useT } from "@/components/I18nProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? t("Fel e-post eller lösenord.")
          : signInError.message
      );
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen font-sans">
      <div className="hidden md:flex w-[46%] bg-ink text-[#F4F3F0] p-14 flex-col justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <div className="max-w-[440px]">
          <div className="text-[15px] text-[#9E9C97] mb-4 tracking-wide">
            {t("HEMSIDAN BYGGS I ETT SAMTAL")}
          </div>
          <h1 className="text-[46px] leading-[1.12] font-medium text-white">{rich(t, "Din hemsida.{br}<span>Byggd genom ett samtal.</span>", { span: (c) => <span className="italic text-accent">{c}</span> }, { br: <br /> })}
          </h1>
          <p className="text-[17px] leading-relaxed text-[#C9C7C2] mt-5">
            {t("Beskriv verksamheten, visa oss vad ni gillar, och låt YourCoSite göra resten. Sen fortsätter ni bara att be om ändringar.")}
          </p>
        </div>
        <div />
      </div>

      <div className="flex-1 flex items-center justify-center bg-surface px-6 py-16">
        <div className="w-full max-w-[380px]">
          <div className="flex justify-end mb-4"><LanguageSwitcher /></div>
          <h2 className="text-[28px] font-medium mb-2">{t("Välkommen tillbaka")}</h2>
          <p className="text-[15px] text-ink-dim mb-8">
            {t("Logga in för att fortsätta jobba på era sajter.")}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-[13.5px] font-semibold mb-1.5">
                {t("E-post")}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("du@företag.se")}
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>
            <div>
              <label htmlFor="pw" className="block text-[13.5px] font-semibold mb-1.5">
                {t("Lösenord")}
              </label>
              <input
                id="pw"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>
            <div className="text-right -mt-1">
              <a href="#" className="text-[13.5px] font-medium">
                {t("Glömt lösenord?")}
              </a>
            </div>

            {error && (
              <div className="text-[13.5px] text-warm font-medium -mt-1">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="block text-center bg-accent text-accent-ink font-semibold text-[15.5px] py-3.5 rounded-[10px] mt-1 disabled:opacity-60"
            >
              {loading ? t("Loggar in …") : t("Logga in")}
            </button>
          </form>

          <div className="flex items-center gap-3 my-7">
            <div className="flex-1 h-px bg-line" />
            <span className="text-[12.5px] text-ink-dim">{t("ELLER")}</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <p className="text-center text-[14.5px] text-ink-dim">{rich(t, "Ny hos YourCoSite? <link>Skapa konto</link>", { link: (c) => <Link href="/skapa-konto" className="font-semibold text-ink">{c}</Link> })}
          </p>
          <p className="text-center text-[11.5px] text-ink-dim mt-4 leading-relaxed">{rich(t, "Genom att logga in godkänner du våra <link>användarvillkor</link> och vår <link2>integritetspolicy</link2>.", { link: (c) => <Link href="/anvandarvillkor" className="font-semibold underline">{c}</Link>, link2: (c) => <Link href="/integritetspolicy" className="font-semibold underline">{c}</Link> })}</p>
        </div>
      </div>
    </div>
  );
}
