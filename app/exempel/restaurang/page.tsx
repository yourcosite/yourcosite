import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { Shell, colors } from "./_shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = getT();
  return { title: t("Exempel: Bistro Tegelbruket"), description: t("Bistro Tegelbruket — exempel byggt med YourCoSite.") };
}

export default function RestaurantExamplePage() {
  const t = getT();
  const features = [
    { title: t("Färskt från havet"), body: t("Ostron, blåmusslor och dagens fångst — levererat flera gånger i veckan."), img: "/images/bistro-feature-1.jpg" },
    { title: t("Mycket att dela"), body: t("Tapas, paella och stora fat. Beställ flera och ta det i er egen takt."), img: "/images/bistro-feature-2.jpg" },
    { title: t("Baren öppnar tidigt"), body: t("Klassiska cocktails och alkoholfria alternativ, happy hour mellan 17 och 19."), img: "/images/bistro-feature-3.jpg" },
  ];
  const gallery = [
    { src: "/images/bistro-gal-1.jpg", alt: t("Skål vid middagsbordet") },
    { src: "/images/bistro-gal-2.jpg", alt: t("Provarbricka med fyra smaker") },
    { src: "/images/bistro-gal-3.jpg", alt: t("Långbordet i matsalen") },
    { src: "/images/bistro-gal-4.jpg", alt: t("Lunch vid tegelväggen") },
  ];

  return (
    <Shell active="hem">
      <section className="relative">
        <div className="relative h-[420px] md:h-[540px]">
          <Image src="/images/bistro-hero.jpg" alt={t("Matsalen på Bistro Tegelbruket")} fill priority className="object-cover opacity-70" />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(0deg, ${colors.bg} 0%, rgba(22,17,16,0.3) 60%, rgba(22,17,16,0.6) 100%)` }}
          />
        </div>
        <div className="max-w-2xl mx-auto text-center px-6 -mt-32 relative">
          <div className="text-[12.5px] tracking-[0.1em] mb-4" style={{ color: colors.inkDim }}>
            {t("SEDAN 2019 · NORRKÖPING")}
          </div>
          <h1 className="font-serif text-[40px] md:text-[48px] leading-[1.15] mb-5">
            {t("Mat att dela, i ett gammalt tegelbruk")}
          </h1>
          <p className="text-[15.5px] leading-relaxed mb-8" style={{ color: colors.inkDim }}>
            {t("Havets smaker, spanska klassiker och en bar som tar cocktails på allvar. Mellan tegelväggar och gröna växter.")}
          </p>
          <Link
            href="/exempel/restaurang/kontakt"
            className="inline-block font-semibold text-[14px] px-7 py-3.5 rounded-full"
            style={{ background: colors.accent, color: colors.accentInk }}
          >
            {t("Boka bord →")}
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 md:px-16 py-20 grid md:grid-cols-3 gap-10">
        {features.map((f) => (
          <div key={f.title}>
            <div className="relative h-[170px] rounded-xl overflow-hidden mb-4">
              <Image src={f.img} alt={f.title} fill className="object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(22,17,16,0.45), rgba(22,17,16,0.05))" }} />
            </div>
            <div className="font-serif text-[19px] mb-2.5">{f.title}</div>
            <p className="text-[14px] leading-relaxed" style={{ color: colors.inkDim }}>{f.body}</p>
          </div>
        ))}
      </section>

      <section
        className="relative text-center px-6 py-24"
        style={{ borderTop: `1px solid ${colors.line}`, borderBottom: `1px solid ${colors.line}` }}
      >
        <Image src="/images/bistro-quote-bg.jpg" alt="" fill className="object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(22,17,16,0.88) 0%, rgba(22,17,16,0.7) 55%, rgba(22,17,16,0.35) 100%)" }} />
        <div className="font-serif italic text-[26px] max-w-xl mx-auto leading-relaxed relative">
          {t("“Man kommer för maten och stannar för stämningen.”")}
        </div>
        <div className="text-[13.5px] mt-5 relative" style={{ color: colors.inkDim }}>
          {t("— En återkommande kvällsgäst")}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 md:px-16 py-20">
        <h2 className="font-serif text-[26px] text-center mb-2">{t("Kvällar hos oss")}</h2>
        <p className="text-[14px] text-center mb-10" style={{ color: colors.inkDim }}>
          {t("Födelsedagar, afterwork och vanliga tisdagar.")}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {gallery.map((g) => (
            <div key={g.src} className="relative aspect-[4/5] rounded-xl overflow-hidden">
              <Image src={g.src} alt={g.alt} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />
            </div>
          ))}
        </div>
      </section>

      <section className="text-center px-6 pb-24">
        <h2 className="font-serif text-[26px] mb-6">{t("Nyfiken på kvällens meny?")}</h2>
        <Link
          href="/exempel/restaurang/meny"
          className="inline-block font-semibold text-[14px] px-7 py-3.5 rounded-full"
          style={{ background: colors.accent, color: colors.accentInk }}
        >
          {t("Se hela menyn →")}
        </Link>
      </section>
    </Shell>
  );
}
