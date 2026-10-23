import Image from "next/image";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { Shell, colors } from "../_shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = getT();
  return { title: t("Kontakt — Bistro Tegelbruket"), description: t("Boka bord — Bistro Tegelbruket, exempel byggt med YourCoSite.") };
}

export default function RestaurantContactPage() {
  const t = getT();

  return (
    <Shell active="kontakt">
<div className="relative h-[200px]">
        <Image src="/images/bistro-kontakt-banner.jpg" alt="" fill className="object-cover opacity-70" />
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
          style={{ background: "rgba(22,17,16,0.5)" }}
        >
          <div className="text-[12.5px] tracking-[0.1em] mb-3" style={{ color: colors.inkDim }}>
            {t("HAPPY HOUR 17–19")}
          </div>
          <h1 className="font-serif text-[32px] md:text-[38px]">{t("Boka ett bord hos oss")}</h1>
        </div>
      </div>

      <section className="max-w-5xl mx-auto px-6 md:px-16 py-16 grid md:grid-cols-[1.3fr_1fr] gap-12">
        <div className="rounded-2xl p-7" style={{ background: colors.surface }}>
          <div className="text-[12.5px] tracking-[0.1em] mb-2" style={{ color: colors.accent }}>
            {t("BOKA BORD")}
          </div>
          <h2 className="font-serif text-[23px] mb-6">{t("Vi ses för middag")}</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              placeholder={t("Namn")}
              className="px-3.5 py-3 rounded-lg text-[14px] bg-transparent outline-none"
              style={{ border: `1px solid ${colors.line}`, color: colors.ink }}
            />
            <input
              placeholder={t("Antal gäster")}
              className="px-3.5 py-3 rounded-lg text-[14px] bg-transparent outline-none"
              style={{ border: `1px solid ${colors.line}`, color: colors.ink }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <input
              placeholder={t("Datum")}
              className="px-3.5 py-3 rounded-lg text-[14px] bg-transparent outline-none"
              style={{ border: `1px solid ${colors.line}`, color: colors.ink }}
            />
            <input
              placeholder={t("Klockslag")}
              className="px-3.5 py-3 rounded-lg text-[14px] bg-transparent outline-none"
              style={{ border: `1px solid ${colors.line}`, color: colors.ink }}
            />
          </div>
          <button
            type="button"
            className="font-semibold text-[14px] px-6 py-3 rounded-lg"
            style={{ background: colors.accent, color: colors.accentInk }}
          >
            {t("Skicka bokningsförfrågan")}
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <div className="relative h-[170px] rounded-2xl overflow-hidden">
            <Image src="/images/bistro-kontakt-side.jpg" alt="" fill className="object-cover" />
          </div>
          <div>
            <div className="text-[12px] font-bold tracking-[0.08em] mb-1.5" style={{ color: colors.accent }}>
              {t("ADRESS")}
            </div>
            <div className="text-[14.5px]" style={{ color: colors.inkDim }}>
              {t("Tegelbruksgatan 7")}<br />{t("602 22 Norrköping")}
            </div>
          </div>
          <div>
            <div className="text-[12px] font-bold tracking-[0.08em] mb-1.5" style={{ color: colors.accent }}>
              {t("ÖPPETTIDER")}
            </div>
            <div className="text-[14.5px]" style={{ color: colors.inkDim }}>
              {t("Tisdag–lördag, 16–23")}
            </div>
          </div>
          <div>
            <div className="text-[12px] font-bold tracking-[0.08em] mb-1.5" style={{ color: colors.accent }}>
              {t("KONTAKT")}
            </div>
            <div className="text-[14.5px]" style={{ color: colors.inkDim }}>
              011 – 123 45 67<br />{t("hej@tegelbruket.se")}
            </div>
          </div>
        </div>
      </section>

    </Shell>
  );
}
