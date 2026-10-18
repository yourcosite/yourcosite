import { rich } from "@/lib/i18n/rich";
import { getT } from "@/lib/i18n/server";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroChatDemo from "@/components/HeroChatDemo";
import StepsDemo from "@/components/StepsDemo";
import IncludedAndChat from "@/components/IncludedAndChat";

export default function LandingPage() {
  const t = getT();
  return (
    <div>
      <Header active="/" />

      {/* Hero */}
      <section className="bg-ink">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-[42px] md:text-[52px] leading-[1.1] font-medium text-white">{rich(t, "Din hemsida.{br}<span>Byggd genom ett samtal.</span>", { span: (c) => <span className="italic text-accent">{c}</span> }, { br: <br /> })}
            </h1>
            <p className="text-[17px] leading-relaxed text-[#C9C7C2] mt-6 max-w-[42ch]">
              {t("Beskriv verksamheten, visa oss vad ni gillar, och låt YourCoSite göra resten. Sen fortsätter ni bara att be om ändringar — precis som ni skulle till en kollega.")}
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <Link
                href="/skapa-konto"
                className="bg-accent text-accent-ink font-bold text-[15.5px] px-7 py-3.5 rounded-xl shadow-[0_16px_34px_rgba(198,255,94,0.3)]"
              >
                {t("Bygg din sajt →")}
              </Link>
              <Link
                href="/exempel"
                className="text-white font-semibold text-[15.5px] border-b border-white/40 pb-0.5 self-center"
              >
                {t("Se exempel")}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.4)] border border-white/10">
            <div className="bg-[#1C1C20] px-4 py-2.5 flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#E4635A]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#E8B14A]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#58C36C]" />
            </div>
            <div className="flex h-[300px] md:h-[360px]">
              <div className="relative flex-1 min-w-0">
                <Image
                  src="/images/hero-bakery.jpg"
                  alt={t("Solgläntans Bageri — exempel på en hemsida byggd med YourCoSite")}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="font-serif italic text-[13px] text-accent mb-1">
                    {t("Nybakat med kärlek — sedan 1998")}
                  </div>
                  <div className="font-serif text-2xl">{t("Solgläntans Bageri")}</div>
                  <p className="text-[13.5px] text-[#E9E6E0] mt-1 max-w-[36ch]">
                    {t("Surdegsbröd, kanelbullar och fika i hjärtat av stan")}
                  </p>
                </div>
              </div>
              <HeroChatDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-surface">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-20">
          <h2 className="text-[28px] md:text-[32px] font-medium text-center mb-12">
            {t("Så här enkelt är det")}
          </h2>
          <StepsDemo />
          <div className="text-center mt-14">
            <Link
              href="/funktioner"
              className="font-semibold text-[14.5px] border-b border-ink pb-0.5"
            >
              {t("Se hur det går till, steg för steg →")}
            </Link>
          </div>
        </div>
      </section>

      <IncludedAndChat />

      {/* CTA band */}
      <section className="bg-ink text-center px-6 md:px-12 py-16">
        <h2 className="text-white text-[28px] md:text-[30px] font-medium mb-3">
          {t("Redo att komma igång?")}
        </h2>
        <p className="text-[#C9C7C2] text-[15.5px] mb-7">
          {t("Det tar under en minut att skapa ett konto och börja berätta om er verksamhet.")}
        </p>
        <Link
          href="/skapa-konto"
          className="inline-block bg-accent text-accent-ink font-bold text-[15.5px] px-7 py-3.5 rounded-xl"
        >
          {t("Kom igång →")}
        </Link>
      </section>

      <Footer />
    </div>
  );
}
