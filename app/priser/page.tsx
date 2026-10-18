import { rich } from "@/lib/i18n/rich";
import { msg } from "@/lib/i18n/config";
import { getT, getLocale } from "@/lib/i18n/server";
import { currencyForLocale, formatMoney, planPrice } from "@/lib/pricing";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FaqAccordion from "@/components/FaqAccordion";

export function generateMetadata(): Metadata {
  const t = getT();
  return {
  title: t("Priser"),
  description:
    t("Betala per månad, ingen bindningstid. Byt plan eller säg upp när ni vill."),
  };
}

const checkIcon = (
  <svg
    viewBox="0 0 24 24"
    width="15"
    height="15"
    fill="none"
    stroke="#17171A"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="flex-shrink-0 mt-[1px]"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const tiers = [
  {
    name: msg("Bas"),
    body: msg("För er som vill komma igång enkelt med en sajt."),
    plan: "bas",
    popular: false,
    features: ["1 sajt", msg("25 ändringar/månad"), msg("Egen domän"), msg("SSL och hosting ingår"), "E-postsupport"],
  },
  {
    name: msg("Standard"),
    body: msg("För verksamheter som vill fortsätta finslipa sajten löpande."),
    plan: "standard",
    popular: true,
    features: [
      { text: msg("Allt i Bas, plus:"), bold: true },
      msg("60 ändringar/månad"),
      msg("Nyhetsmodul med AI-förslag"),
      msg("Schemalagd publicering"),
      msg("Flerspråkigt (upp till 2 språk)"),
    ],
  },
  {
    name: msg("Premium"),
    body: msg("För er med flera sajter eller högre tempo i innehållet."),
    plan: "premium",
    popular: false,
    features: [
      { text: msg("Allt i Standard, plus:"), bold: true },
      msg("Upp till 3 sajter"),
      msg("150 ändringar/månad"),
      msg("En beställd AI-artikel/månad ingår"),
      msg("Obegränsat antal språk"),
      msg("Prioriterad support (svar inom 4h)"),
    ],
  },
];

export default function PricingPage() {
  const locale = getLocale();
  const currency = currencyForLocale(locale);
  const t = getT();
  return (
    <div>
      <Header active="/priser" />

      <section className="bg-ink">
        <div className="max-w-2xl mx-auto text-center px-6 py-14 md:py-16">
          <div className="text-[13.5px] text-[#9E9C97] tracking-wide mb-3.5">
            {t("PRISER")}
          </div>
          <h1 className="text-[36px] md:text-[42px] leading-[1.15] font-medium text-white">{rich(t, "Enkel prissättning, <span>inga överraskningar</span>", { span: (c) => <span className="italic text-accent">{c}</span> })}
          </h1>
          <p className="text-[16px] leading-relaxed text-[#C9C7C2] mt-4">
            {t("Betala per månad, ingen bindningstid. Byt plan eller säg upp när ni vill.")}
          </p>
        </div>
      </section>

      <section className="bg-surface">
        <div className="max-w-5xl mx-auto px-6 md:px-12 pt-14 pb-2.5">
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-[20px] p-7 ${
                  tier.popular
                    ? "border-2 border-ink bg-bg"
                    : "border border-line"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-[13px] left-1/2 -translate-x-1/2 bg-ink text-accent text-[11.5px] font-bold tracking-wide px-3.5 py-1 rounded-full">
                    {t("MEST POPULÄR")}
                  </div>
                )}
                <div className="font-semibold text-[19px] mb-1.5">{t(tier.name)}</div>
                <p className="text-[13.5px] text-ink-dim mb-5 min-h-[36px]">
                  {t(tier.body)}
                </p>
                <div className="flex items-baseline gap-1.5 mb-6.5">
                  <span className="font-serif text-[40px] font-medium">
                    {formatMoney(planPrice(tier.plan, currency), currency, locale)}
                  </span>
                  <span className="text-[13.5px] text-ink-dim">{t("/mån")}</span>
                </div>
                <Link
                  href="/skapa-konto"
                  className={`block text-center font-semibold text-[14.5px] py-3 rounded-[10px] mb-7 ${
                    tier.popular
                      ? "bg-accent text-accent-ink font-bold"
                      : "border-[1.5px] border-ink text-ink"
                  }`}
                >
                  {t("Kom igång →")}
                </Link>
                <div className="flex flex-col gap-3 text-[13.5px]">
                  {tier.features.map((f, idx) =>
                    typeof f === "string" ? (
                      <div key={idx} className="flex gap-2.5">
                        {checkIcon}
                        {t(f)}
                      </div>
                    ) : (
                      <div key={idx} className="flex gap-2.5 font-semibold">
                        {checkIcon}
                        {t(f.text)}
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-7">
            <span className="text-[13px] text-ink-dim">
              {t("Alla priser exkl. moms · Ingen bindningstid, 3 månaders löpande uppsägningstid.")}
            </span>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-[54px] text-center">
          <h2 className="text-[24px] font-medium mb-4">
            {t("Behöver ni fler sajter eller ändringar?")}
          </h2>
          <p className="text-[14.5px] text-ink-dim leading-relaxed mb-5">
            {t("Byråer och kedjor med många sajter får en skräddarsydd lösning. Hör av er så sätter vi ihop ett förslag som passar er verksamhet.")}
          </p>
          <Link
            href="/kontakt"
            className="inline-block font-semibold text-[14.5px] border-b-[1.5px] border-ink pb-0.5"
          >
            {t("Kontakta oss →")}
          </Link>
        </div>

        <div className="px-6 md:px-12 pb-14">
          <div className="max-w-6xl mx-auto rounded-2xl overflow-hidden relative shadow-[0_24px_50px_rgba(23,23,26,0.15)] h-[300px] md:h-[400px]">
            <Image
              src="/images/priser-showcase.jpg"
              alt={t("Skärmdump: restaurangens hemsida byggd med YourCoSite")}
              fill
              className="object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(100deg, rgba(23,17,13,0.82) 0%, rgba(23,17,13,0.35) 50%, rgba(23,17,13,0.05) 75%)",
              }}
            />
            <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-14">
              <div className="text-[12.5px] tracking-[0.1em] text-accent mb-3.5">
                {t("BYGGD MED YOURCOSITE")}
              </div>
              <h2 className="font-serif italic text-[26px] md:text-[32px] text-white leading-tight max-w-[420px] mb-4">
                {t("Så här snyggt kan er sajt se ut")}
              </h2>
              <p className="text-[14.5px] text-[#E9E6E0] max-w-[380px] leading-relaxed mb-6">
                {t("Alla planer ger samma professionella resultat — oavsett bransch eller budget.")}
              </p>
              <div className="flex gap-3.5">
                <Link
                  href="/exempel/restaurang"
                  className="inline-block bg-accent text-accent-ink font-bold text-[13.5px] px-5 py-2.5 rounded-[9px]"
                >
                  {t("Se exemplet →")}
                </Link>
                <Link
                  href="/exempel"
                  className="inline-flex items-center text-white font-semibold text-[13.5px] border-b border-white/40 pb-0.5"
                >
                  {t("Fler exempel")}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-bg px-6 md:px-12 py-16 border-t border-line">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-[26px] font-medium mb-7 text-center">
              {t("Vanliga frågor om priset")}
            </h2>
            <FaqAccordion />
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
