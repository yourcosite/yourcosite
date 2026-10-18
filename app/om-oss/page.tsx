import { msg } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export function generateMetadata(): Metadata {
  const t = getT();
  return {
  title: t("Om oss"),
  description:
    t("En byrå som byggde sitt eget verktyg — och delar det nu med andra."),
  };
}

export default function AboutPage() {
  const t = getT();
  return (
    <div>
      <Header active="/om-oss" />

      <section className="bg-surface">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-20 grid md:grid-cols-[280px_1fr] gap-12">
          <div>
            <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden mb-4">
              <Image
                src="/images/about-carl.jpg"
                alt={t("Carl Schnell, grundare av CS Kommunikationsbyrå AB")}
                fill
                className="object-cover"
              />
            </div>
            <div className="font-semibold text-[15px]">{t("Carl Schnell")}</div>
            <div className="text-[13px] text-ink-dim">
              {t("Grundare, CS Kommunikationsbyrå AB")}
            </div>
          </div>

          <div>
            <div className="text-[13.5px] text-ink-dim tracking-wide mb-3">
              {t("OM OSS")}
            </div>
            <h1 className="text-[30px] md:text-[34px] font-medium mb-6 max-w-[20ch]">
              {t("En byrå som byggde sitt eget verktyg — och delar det nu med andra")}
            </h1>
            <div className="flex flex-col gap-5 text-[15px] leading-relaxed text-ink-dim max-w-[62ch]">
              <p>
                {t("CS Kommunikationsbyrå AB bildades 2013 av Carl Schnell och finns i Borensberg, Sverige, med fokus på Östergötland — men med uppdrag i hela Sverige och internationellt. Byrån tar hand om hela kommunikationen åt sina kunder: sociala medier, digital annonsering, föreläsningar, drönarfotografering, film och medierådgivning.")}
              </p>
              <p>
                {t("Under åren har vi arbetat med tusentals kunder och byggt mängder av webbplatser, framför allt i WordPress. Vi har märkt att kunden ofta inte kan hantera sidan själv efteråt, även när den är byggd på ett enkelt sätt, och då löpande behöver hjälp.")}
              </p>
              <p>
                {t("Det vill vi göra enklare, och spara pengar åt våra kunder. När Carl byggde om cskb.se tillsammans med Claude — helt genom ett samtal, utan att skriva en rad kod själv — insåg han hur mycket det förändrade arbetet. YourCoSite föddes ur den insikten: en riktigt genomarbetad sajt som du själv ändrar genom att prata med Millie, tillgänglig för alla företag, inte bara de som råkar ha en kommunikationsbyrå till hands.")}
              </p>
            </div>
            <div className="flex gap-6 mt-8 text-[14px] font-semibold">
              <a href="https://www.linkedin.com" className="border-b border-ink pb-0.5">
                {t("LinkedIn")}
              </a>
              <a href="https://cskb.se" className="border-b border-ink pb-0.5">
                {t("cskb.se →")}
              </a>
            </div>
          </div>
        </div>

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
      </section>

      <Footer />
    </div>
  );
}
