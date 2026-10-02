import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Om oss",
  description:
    "En byrå som byggde sitt eget verktyg — och delar det nu med andra.",
};

export default function AboutPage() {
  return (
    <div>
      <Header active="/om-oss" />

      <section className="bg-surface">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-20 grid md:grid-cols-[280px_1fr] gap-12">
          <div>
            <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden mb-4">
              <Image
                src="/images/about-carl.jpg"
                alt="Carl Schnell, grundare av CS Kommunikationsbyrå AB"
                fill
                className="object-cover"
              />
            </div>
            <div className="font-semibold text-[15px]">Carl Schnell</div>
            <div className="text-[13px] text-ink-dim">
              Grundare, CS Kommunikationsbyrå AB
            </div>
          </div>

          <div>
            <div className="text-[13.5px] text-ink-dim tracking-wide mb-3">
              OM OSS
            </div>
            <h1 className="text-[30px] md:text-[34px] font-medium mb-6 max-w-[20ch]">
              En byrå som byggde sitt eget verktyg — och delar det nu med
              andra
            </h1>
            <div className="flex flex-col gap-5 text-[15px] leading-relaxed text-ink-dim max-w-[62ch]">
              <p>
                CS Kommunikationsbyrå AB bildades 2013 av Carl Schnell och är
                baserad i Borensberg, med fokus på Östergötland — men med
                uppdrag i hela Sverige och internationellt. Byrån tar hand om
                hela kommunikationen åt sina kunder: sociala medier, digital
                annonsering, föreläsningar, dronarfotografering, film och
                medierådgivning.
              </p>
              <p>
                Carl har lång erfarenhet av marknadsföring, PR och
                kommunikation, med bakgrund från Corren, Stångåstaden,
                Astacus och Linköpings Stadsmission, samt som marknadschef på
                Östenssons Livs AB. Bland uppdragsgivarna finns allt från
                Skidskytteförbundet och några av Sveriges största artister
                till Sveriges största turistattraktion — och inte minst en
                lång rad lokala kunder.
              </p>
              <p>
                När Carl byggde om cskb.se tillsammans med Claude — helt
                genom ett samtal, utan att skriva en rad kod själv — insåg
                han hur mycket det förändrade arbetet. YourCoSite föddes ur
                den insikten: samma sätt att bygga en riktigt genomarbetad
                sajt, tillgängligt för alla företag, inte bara de som råkar
                ha en kommunikationsbyrå till hands.
              </p>
            </div>
            <div className="flex gap-6 mt-8 text-[14px] font-semibold">
              <a href="https://www.linkedin.com" className="border-b border-ink pb-0.5">
                LinkedIn
              </a>
              <a href="https://cskb.se" className="border-b border-ink pb-0.5">
                cskb.se →
              </a>
            </div>
          </div>
        </div>

        <section className="bg-ink text-center px-6 md:px-12 py-16">
          <h2 className="text-white text-[28px] md:text-[30px] font-medium mb-3">
            Redo att komma igång?
          </h2>
          <p className="text-[#C9C7C2] text-[15.5px] mb-7">
            Det tar under en minut att skapa ett konto och börja berätta om
            er verksamhet.
          </p>
          <Link
            href="/skapa-konto"
            className="inline-block bg-accent text-accent-ink font-bold text-[15.5px] px-7 py-3.5 rounded-xl"
          >
            Kom igång →
          </Link>
        </section>
      </section>

      <Footer />
    </div>
  );
}
