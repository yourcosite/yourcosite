import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";

const colors = {
  bg: "#1B120D",
  ink: "#F5EFE6",
  inkDim: "#BBA88F",
  line: "rgba(245,239,230,0.12)",
  accent: "#E8B14A",
  accentInk: "#241808",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = getT();
  return { title: t("Meny — Björkängens Kök"), description: t("Meny — Björkängens Kök, exempel byggt med YourCoSite.") };
}

export default function RestaurantMenuPage() {
  const t = getT();
  const courses = [
    {
      label: t("FÖRRÄTTER"),
      dishes: [
        { name: t("Rostad pumpa"), desc: t("Brynt smör, salvia, hasselnötter"), price: "165 kr", img: "/images/restaurant-meny-dish-1.jpg" },
        { name: t("Handskuren tartar"), desc: t("Kalv, kapris, äggula, rostat bröd"), price: "185 kr", img: "/images/restaurant-meny-dish-2.jpg" },
        { name: t("Kantarellsoppa"), desc: t("Gräddig, timjan, brödcrouton"), price: "145 kr" },
      ],
    },
    {
      label: t("HUVUDRÄTTER"),
      dishes: [
        { name: t("Kalvytterfilé"), desc: t("Rotselleri, svartkål, rödvinsjus"), price: "285 kr" },
        { name: t("Ugnsbakad torsk"), desc: t("Musselsås, dillolja, potatispuré"), price: "255 kr" },
        { name: t("Rotfruktsgryta"), desc: t("Höstens rotfrukter, örtolja (vegan)"), price: "215 kr" },
      ],
    },
    {
      label: t("EFTERRÄTTER"),
      dishes: [
        { name: t("Äppelkaka"), desc: t("Vaniljglass, kolasås"), price: "95 kr" },
        { name: t("Chokladfondant"), desc: t("Havtornssorbet"), price: "105 kr" },
      ],
    },
  ];

  return (
    <div style={{ background: colors.bg, color: colors.ink, fontFamily: "'Work Sans', system-ui, sans-serif" }}>
      <Link
        href="/exempel"
        className="fixed top-5 left-5 z-10 inline-flex items-center gap-2 text-[12.5px] font-semibold px-3.5 py-2 rounded-full"
        style={{ background: "rgba(0,0,0,0.5)", color: "#fff", backdropFilter: "blur(4px)" }}
      >
        {t("← Alla exempel")}
      </Link>

      <header className="flex items-center justify-between px-8 md:px-16 py-6" style={{ borderBottom: `1px solid ${colors.line}` }}>
        <Link href="/exempel/restaurang" className="font-serif italic text-[21px]">
          {t("Björkängens Kök")}
        </Link>
        <nav className="hidden md:flex items-center gap-9 text-[13.5px] font-semibold" style={{ color: colors.inkDim }}>
          <Link href="/exempel/restaurang">{t("Hem")}</Link>
          <span style={{ color: "#fff" }}>{t("Meny")}</span>
          <Link href="/exempel/restaurang/om-oss">{t("Om oss")}</Link>
          <Link href="/exempel/restaurang/kontakt">{t("Kontakt")}</Link>
        </nav>
        <Link
          href="/exempel/restaurang/kontakt"
          className="text-[13px] font-semibold px-5 py-2.5 rounded-full"
          style={{ background: colors.accent, color: colors.accentInk }}
        >
          {t("Boka bord")}
        </Link>
      </header>

      <div className="relative h-[220px]">
        <Image src="/images/restaurant-meny-banner.jpg" alt="" fill className="object-cover opacity-70" />
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
          style={{ background: "rgba(27,18,13,0.45)" }}
        >
          <div className="text-[12.5px] tracking-[0.1em] mb-3" style={{ color: colors.inkDim }}>
            {t("HÖSTMENY")}
          </div>
          <h1 className="font-serif text-[34px] md:text-[40px]">{t("Menyn just nu")}</h1>
          <p className="text-[14px] mt-2" style={{ color: colors.inkDim }}>
            {t("Byts när säsongen gör det. Fråga oss gärna om allergier.")}
          </p>
        </div>
      </div>

      <section className="max-w-3xl mx-auto px-6 md:px-0 py-16 flex flex-col gap-10">
        {courses.map((course) => (
          <div key={course.label}>
            <div className="text-[12.5px] font-bold tracking-[0.1em] mb-3" style={{ color: colors.accent }}>
              {course.label}
            </div>
            <div>
              {course.dishes.map((d) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between gap-4 py-3.5"
                  style={{ borderBottom: `1px solid ${colors.line}` }}
                >
                  <div className="flex items-center gap-3.5">
                    {d.img && (
                      <div className="relative w-[52px] h-[52px] rounded-lg overflow-hidden flex-shrink-0">
                        <Image src={d.img} alt={d.name} fill className="object-cover" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-[15px] text-white">{d.name}</div>
                      <div className="text-[12.5px] mt-1" style={{ color: colors.inkDim }}>
                        {d.desc}
                      </div>
                    </div>
                  </div>
                  <div className="font-semibold text-[14px] whitespace-nowrap" style={{ color: colors.accent }}>
                    {d.price}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <footer
        className="flex flex-col sm:flex-row gap-3 items-center justify-between px-8 md:px-16 py-6 text-[12.5px]"
        style={{ borderTop: `1px solid ${colors.line}`, color: colors.inkDim }}
      >
        <span>{t("Björkängens Kök · Exempelsajt byggd med YourCoSite")}</span>
        <Link href="/exempel" style={{ color: colors.inkDim }}>
          {t("← Fler exempel")}
        </Link>
      </footer>
    </div>
  );
}
