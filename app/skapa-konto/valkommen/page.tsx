"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useT } from "@/components/I18nProvider";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

// Sista steget när kontot är skapat: kunden väljer själv om sajten ska
// designas direkt eller om hen vill börja i kundzonen. Ingen tvingas in i
// designdelen.
function Welcome() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const paid = params.get("betalning") === "klar";
  const [ready, setReady] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/logga-in");
      else setReady(true);
    });
  }, [router]);

  const dashboard = paid ? "/dashboard?betalning=klar" : "/dashboard";

  return (
    <div className="min-h-screen flex flex-col font-sans bg-bg">
      <div className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-line bg-surface">
        <Link href="/"><Logo light={false} /></Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        {ready && (
          <div className="w-full max-w-[640px]">
            <h1 className="text-[30px] font-medium mb-2">{t("Ditt konto är klart!")}</h1>
            {paid && <p className="text-[14.5px] text-[#2F6B44] font-semibold mb-2">{t("Tack! Din betalning är klar och prenumerationen är igång.")}</p>}
            <p className="text-[15.5px] text-ink-dim mb-8">{t("Vad vill du göra nu? Du kan alltid skapa din sajt senare, den finns kvar under Skapa ny sajt i kundzonen.")}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <Link href="/onboarding/1" className="flex flex-col gap-2 bg-surface border-[1.5px] border-ink rounded-2xl p-6">
                <span className="text-[18px] font-semibold">{t("Designa min sajt nu")}</span>
                <span className="text-[14px] text-ink-dim leading-relaxed">{t("Svara på några frågor så bygger vi ett förslag åt dig. Tar några minuter.")}</span>
                <span className="mt-2 bg-accent text-accent-ink font-semibold text-[14.5px] px-5 py-2.5 rounded-[10px] self-start">{t("Kom igång")}</span>
              </Link>
              <Link href={dashboard} className="flex flex-col gap-2 bg-surface border border-line rounded-2xl p-6">
                <span className="text-[18px] font-semibold">{t("Gå till kundzonen")}</span>
                <span className="text-[14px] text-ink-dim leading-relaxed">{t("Titta runt först, fyll i dina uppgifter och skapa sajten när det passar dig.")}</span>
                <span className="mt-2 bg-surface border border-line font-semibold text-[14.5px] px-5 py-2.5 rounded-[10px] self-start">{t("Till kundzonen")}</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <Welcome />
    </Suspense>
  );
}
