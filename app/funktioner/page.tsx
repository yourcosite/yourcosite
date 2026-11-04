import { rich } from "@/lib/i18n/rich";
import { msg } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import IncludedAndChat from "@/components/IncludedAndChat";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";
import FeatureGrid from "@/components/FeatureGrid";
import { features } from "@/lib/marketingFeatures";

export function generateMetadata(): Metadata {
  const t = getT();
  return {
  title: t("Funktioner"),
  description:
    t("Tre steg från idé till färdig sajt — och sen fortsätter ni bara att be om ändringar."),
  };
}

const steps = [
  {
    n: "1",
    label: msg("STEG ETT"),
    title: msg("Berätta om er"),
    body: msg("Namn, ton, färger och egna bilder — så mycket eller lite ni vill. Ni svarar på några enkla frågor om verksamheten, precis som att berätta för en kollega."),
    img: "/images/step1-beratta.jpg",
    alt: msg("Skärmdump: formuläret där man berättar om sin verksamhet"),
  },
  {
    n: "2",
    label: msg("STEG TVÅ"),
    title: msg("Vi bygger sajten"),
    body: msg("Text, bilder och design sätts samman snabbt och effektivt utifrån det ni berättat — klart på minuter, inte veckor."),
    img: "/images/step2-bygger.jpg",
    alt: msg("Skärmdump: sajten byggs"),
  },
  {
    n: "3",
    label: msg("STEG TRE"),
    title: msg("Fortsätt i samtalet"),
    body: msg("Be om ändringar när som helst — och se dem direkt i sajten. Ingen kod, inget krångel, bara ett samtal."),
    img: "/images/step3-samtal.jpg",
    alt: msg("Skärmdump: redigera sajten i ett samtal"),
  },
];

const heroChips = [
  { text: msg("Översätt sajten till engelska"), cls: "left-[4%] top-[18%] md:left-[10%]", r: "-4deg", d: "0s" },
  { text: msg("Gör knappen grön"), cls: "right-[4%] top-[28%] md:right-[11%]", r: "3deg", d: "1.2s" },
  { text: msg("Optimera för Google"), cls: "left-[10%] bottom-[12%] md:left-[17%]", r: "2deg", d: "2.4s" },
  { text: msg("Ångra senaste"), cls: "right-[8%] bottom-[16%] md:right-[16%]", r: "-3deg", d: "3.4s" },
];

const stats = [
  { n: 7, label: msg("Språk i verktyget") },
  { n: 4, label: msg("Språk per sajt") },
  { n: 50, label: msg("Sparade versioner") },
  { n: 0, label: msg("Rader kod") },
];


const examples = [
  {
    href: "/exempel/restaurang",
    title: msg("Restaurang"),
    body: msg("Meny, om oss och bokning"),
    img: "/images/example-restaurant-thumb.jpg",
    alt: msg("Skärmdump: restaurangens hemsida"),
  },
  {
    href: "/exempel/inredning",
    title: msg("Inredningsbutik"),
    body: msg("Kollektion och butiksinfo"),
    img: "/images/example-inredning-thumb.jpg",
    alt: msg("Skärmdump: inredningsbutikens hemsida"),
  },
  {
    href: "/exempel/snickeri",
    title: msg("Snickerifirma"),
    body: msg("Referensprojekt och kontakt"),
    img: "/images/example-snickeri-thumb.jpg",
    alt: msg("Skärmdump: snickerifirmans hemsida"),
  },
];

export default function FeaturesPage() {
  const t = getT();
  return (
    <div>
      <Header active="/funktioner" />

      <section className="bg-ink relative overflow-hidden">
        <div aria-hidden className="yc-glow absolute left-1/2 top-[-120px] -translate-x-1/2 w-[620px] h-[620px] rounded-full pointer-events-none" style={{ background: "radial-gradient(closest-side, rgba(198,255,94,0.28), transparent)" }} />
        {heroChips.map((c) => (
          <div key={c.text} aria-hidden className={`hidden sm:block absolute ${c.cls}`}>
            <div
              className="yc-float text-[12.5px] font-semibold text-[#C9C7C2] border border-white/15 bg-white/5 backdrop-blur-sm rounded-full px-3.5 py-1.5"
              style={{ ["--r" as string]: c.r, animationDelay: c.d }}
            >
              {t(c.text)}
            </div>
          </div>
        ))}
        <div className="relative max-w-3xl mx-auto text-center px-6 py-16 md:py-[84px]">
          <Reveal from="up">
            <div className="text-[13.5px] text-[#9E9C97] tracking-wide mb-3.5">
              {t("FUNKTIONER")}
            </div>
          </Reveal>
          <Reveal from="up" delay={100}>
            <h1 className="text-[36px] md:text-[42px] leading-[1.15] font-medium text-white">{rich(t, "Så bygger ni en hemsida genom <span>ett samtal</span>", { span: (c) => <span className="italic text-accent">{c}</span> })}
            </h1>
          </Reveal>
          <Reveal from="up" delay={220}>
            <p className="text-[16px] leading-relaxed text-[#C9C7C2] mt-4 max-w-[36ch] mx-auto">
              {t("Tre steg från idé till färdig sajt — och sen fortsätter ni bara att be om ändringar.")}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-surface">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-[64px] flex flex-col gap-14">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className={`flex flex-col md:flex-row items-center gap-10 ${
                i % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              <Reveal from={i % 2 === 1 ? "right" : "left"} className="flex-1">
                <div className="flex items-center gap-2.5 mb-3.5">
                  <span className="yc-ring font-serif italic text-accent-ink bg-accent w-8 h-8 rounded-full inline-flex items-center justify-center text-[15px]">
                    {s.n}
                  </span>
                  <span className="text-[12.5px] text-ink-dim tracking-wide font-semibold">
                    {t(s.label)}
                  </span>
                </div>
                <h2 className="text-[26px] md:text-[28px] font-medium mb-3.5">
                  {t(s.title)}
                </h2>
                <p className="text-[15.5px] leading-relaxed text-ink-dim max-w-[36ch]">
                  {t(s.body)}
                </p>
              </Reveal>
              <Reveal from="zoom" delay={150} className="flex-1 w-full">
                <div className="yc-step-img w-full rounded-2xl overflow-hidden shadow-[0_24px_50px_rgba(23,23,26,0.18)] border border-line">
                  <Image
                    src={s.img}
                    alt={t(s.alt)}
                    width={760}
                    height={475}
                    className="w-full h-auto"
                  />
                </div>
              </Reveal>
            </div>
          ))}
        </div>

        <div className="bg-ink px-6 md:px-12 py-14">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((st, i) => (
              <Reveal key={st.label} from="up" delay={i * 90}>
                <div className="font-serif text-[44px] md:text-[52px] leading-none text-accent"><CountUp to={st.n} /></div>
                <div className="text-[13px] text-[#C9C7C2] mt-2">{t(st.label)}</div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-[72px]">
          <Reveal from="up">
            <div className="text-center mb-11">
              <div className="text-[12.5px] text-ink-dim tracking-wide font-semibold mb-3">{t("NYTT I REDIGERAREN")}</div>
              <h2 className="text-[28px] md:text-[32px] font-medium mb-3">{t("Allt du kan göra i samtalet")}</h2>
              <p className="text-[15.5px] text-ink-dim max-w-[48ch] mx-auto">{t("Millie sitter alltid längst ner i redigeraren. Här är vad som finns runt henne.")}</p>
            </div>
          </Reveal>
          <FeatureGrid items={features} />
        </div>

        <IncludedAndChat />

        <div className="text-center px-6 py-16">
          <Link
            href="/skapa-konto"
            className="inline-block bg-accent text-accent-ink font-bold text-[17px] px-11 py-[18px] rounded-xl shadow-[0_16px_34px_rgba(198,255,94,0.35)]"
          >
            {t("Kom igång →")}
          </Link>
        </div>

        <div className="bg-bg px-6 md:px-12 py-16 border-t border-line">
          <div className="text-center mb-9">
            <h2 className="text-[26px] font-medium mb-2.5">
              {t("Se vad andra har byggt")}
            </h2>
            <p className="text-[15px] text-ink-dim">
              {t("Tre färdiga exempelsajter — byggda med samma verktyg ni skulle använda.")}
            </p>
          </div>
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
            {examples.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                className="block bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_10px_24px_rgba(23,23,26,0.05)]"
              >
                <div className="relative h-[130px]">
                  <Image src={e.img} alt={t(e.alt)} fill className="object-cover" />
                </div>
                <div className="px-5 py-4.5">
                  <div className="font-semibold text-[15.5px] mb-1">
                    {t(e.title)}
                  </div>
                  <div className="text-[13px] text-ink-dim">{t(e.body)}</div>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-7">
            <Link
              href="/exempel"
              className="font-semibold text-[14.5px] border-b border-ink pb-0.5"
            >
              {t("Se alla exempel →")}
            </Link>
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
