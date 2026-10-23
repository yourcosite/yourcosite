import Image from "next/image";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { Shell, colors } from "../_shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = getT();
  return { title: t("Om oss — Bistro Tegelbruket"), description: t("Om oss — Bistro Tegelbruket, exempel byggt med YourCoSite.") };
}

export default function RestaurantAboutPage() {
  const t = getT();
  const stats = [
    { n: "7", label: t("År i drift") },
    { n: "48", label: t("Platser i matsalen") },
    { n: "12", label: t("Cocktails på kartan") },
  ];

  return (
    <Shell active="om-oss">
      <section className="max-w-5xl mx-auto px-6 md:px-16 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div className="relative h-[320px] md:h-[420px] rounded-2xl overflow-hidden">
          <Image src="/images/bistro-om-kok.jpg" alt={t("Köket på Bistro Tegelbruket")} fill className="object-cover" />
        </div>
        <div>
          <div className="text-[12.5px] tracking-[0.1em] mb-4" style={{ color: colors.inkDim }}>
            {t("VÅR HISTORIA")}
          </div>
          <h1 className="font-serif text-[30px] md:text-[34px] leading-[1.2] mb-5">
            {t("Från gammalt tegelbruk till kvarterets matsal")}
          </h1>
          <p className="text-[15px] leading-relaxed mb-4" style={{ color: colors.inkDim }}>
            {t("Bistro Tegelbruket öppnade 2019 i en före detta verkstadslokal med bevarade tegelväggar. Vi ville skapa en plats där man kan sätta sig med vänner och dela många små rätter.")}
          </p>
          <p className="text-[15px] leading-relaxed" style={{ color: colors.inkDim }}>
            {t("Köket lagar med skaldjur, ris och grönsaker i säsong, och i baren skakas drinkarna för hand. Fråga gärna personalen — vi hjälper dig att sätta ihop en måltid som passar sällskapet.")}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-3 max-w-3xl mx-auto px-6 py-14 text-center" style={{ borderTop: `1px solid ${colors.line}` }}>
        {stats.map((s) => (
          <div key={s.label}>
            <div className="font-serif text-[36px]" style={{ color: colors.accent }}>{s.n}</div>
            <div className="text-[13px] mt-1.5" style={{ color: colors.inkDim }}>{s.label}</div>
          </div>
        ))}
      </section>
    </Shell>
  );
}
