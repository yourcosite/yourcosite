import Image from "next/image";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { Shell, colors } from "../_shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = getT();
  return { title: t("Meny — Bistro Tegelbruket"), description: t("Meny — Bistro Tegelbruket, exempel byggt med YourCoSite.") };
}

type Tag = "v" | "vg" | "gf" | "lf" | "hot";

export default function RestaurantMenuPage() {
  const t = getT();
  const tagInfo: Record<Tag, { short: string; label: string }> = {
    v: { short: "V", label: t("Vegetarisk") },
    vg: { short: "VG", label: t("Vegansk") },
    gf: { short: "GF", label: t("Glutenfri") },
    lf: { short: "LF", label: t("Laktosfri") },
    hot: { short: "🌶", label: t("Stark") },
  };
  const courses: {
    id: string;
    label: string;
    intro?: string;
    img?: string;
    imgAlt?: string;
    dishes: { name: string; desc: string; price: string; tags?: Tag[] }[];
  }[] = [
    {
      id: "smatt",
      label: t("SMÅTT ATT DELA"),
      intro: t("Beställ två–tre per person och dela."),
      img: "/images/bistro-ostron.jpg",
      imgAlt: t("Ostron öppnas för hand"),
      dishes: [
        { name: t("Ostron, tre stycken"), desc: t("Citron, schalottenlök, rödvinsvinäger"), price: "98 kr", tags: ["gf", "lf"] },
        { name: t("Croquetas"), desc: t("Serranoskinka, krämig béchamel, aioli"), price: "85 kr" },
        { name: t("Spansk tortilla"), desc: t("Potatis, gul lök, ägg, aioli"), price: "79 kr", tags: ["v", "gf"] },
        { name: t("Oliver och mandel"), desc: t("Marinerade oliver, rostade mandlar, havssalt"), price: "59 kr", tags: ["vg", "gf"] },
      ],
    },
    {
      id: "havet",
      label: t("FRÅN HAVET"),
      dishes: [
        { name: t("Blåmusslor"), desc: t("Vitvin, vitlök, persilja, pommes frites"), price: "185 kr" },
        { name: t("Grillade scampi"), desc: t("Vitlöksolja, citron, rostat bröd"), price: "215 kr", tags: ["lf"] },
        { name: t("Laxrulle"), desc: t("Flammad lax, ärtskott, soja, wasabi"), price: "165 kr", tags: ["lf"] },
      ],
    },
    {
      id: "varmt",
      label: t("HUVUDRÄTTER"),
      img: "/images/bistro-tacos.jpg",
      imgAlt: t("Tacos fylls med het sås"),
      dishes: [
        { name: t("Paella med kyckling"), desc: t("Saffransris, vita bönor, haricots verts"), price: "225 kr", tags: ["gf", "lf"] },
        { name: t("Penne med aubergine"), desc: t("Körsbärstomat, basilika, olivolja, pecorino"), price: "175 kr", tags: ["v"] },
        { name: t("Tacos med het kyckling"), desc: t("Tre små tortillor, avokadokräm, het sås"), price: "165 kr", tags: ["hot", "lf"] },
        { name: t("Tomatris med rostad paprika"), desc: t("Svamp, rostad paprika, örtolja"), price: "195 kr", tags: ["vg", "gf"] },
      ],
    },
    {
      id: "efter",
      label: t("EFTERRÄTTER"),
      dishes: [
        { name: t("Baskisk cheesecake"), desc: t("Brända kanter, bärsylt"), price: "95 kr", tags: ["v", "gf"] },
        { name: t("Citronsorbet"), desc: t("Basilika, olivolja"), price: "79 kr", tags: ["vg", "gf", "lf"] },
      ],
    },
    {
      id: "baren",
      label: t("BAREN"),
      intro: t("Happy hour 17–19: alla cocktails till halva priset."),
      dishes: [
        { name: t("Manhattan"), desc: t("Rågwhisky, söt vermouth, bitter, körsbär"), price: "145 kr" },
        { name: t("Provarbricka"), desc: t("Fyra små smaker från baren, välj själv eller låt oss överraska"), price: "129 kr" },
        { name: t("Hibiskuslemonad"), desc: t("Alkoholfri, med lime och mynta"), price: "75 kr", tags: ["vg", "gf", "lf"] },
      ],
    },
  ];
  const used = Array.from(new Set(courses.flatMap((c) => c.dishes.flatMap((d) => d.tags || [])))) as Tag[];

  return (
    <Shell active="meny">
      <div className="relative h-[240px]">
        <Image src="/images/bistro-meny-banner.jpg" alt="" fill priority className="object-cover opacity-70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6" style={{ background: "rgba(22,17,16,0.5)" }}>
          <div className="text-[12.5px] tracking-[0.1em] mb-3" style={{ color: colors.inkDim }}>
            {t("KVÄLLSMENY")}
          </div>
          <h1 className="font-serif text-[34px] md:text-[40px]">{t("Menyn just nu")}</h1>
          <p className="text-[14px] mt-2" style={{ color: colors.inkDim }}>
            {t("Fråga oss gärna om allergier — vi hjälper till.")}
          </p>
        </div>
      </div>

      <nav
        className="sticky top-0 z-[5] flex flex-wrap justify-center gap-2 px-6 py-3.5 text-[12.5px] font-semibold"
        style={{ background: colors.bg, borderBottom: `1px solid ${colors.line}` }}
      >
        {courses.map((c) => (
          <a key={c.id} href={`#${c.id}`} className="px-3.5 py-1.5 rounded-full" style={{ border: `1px solid ${colors.line}`, color: colors.inkDim }}>
            {c.label}
          </a>
        ))}
      </nav>

      <section className="max-w-3xl mx-auto px-6 md:px-0 py-16 flex flex-col gap-14">
        {courses.map((course) => (
          <div key={course.id} id={course.id} className="scroll-mt-20">
            <div className="text-[12.5px] font-bold tracking-[0.1em]" style={{ color: colors.accent }}>
              {course.label}
            </div>
            {course.intro && <p className="text-[13px] mt-1" style={{ color: colors.inkDim }}>{course.intro}</p>}
            {course.img && (
              <div className="relative h-[180px] rounded-xl overflow-hidden mt-4">
                <Image src={course.img} alt={course.imgAlt || ""} fill className="object-cover" />
              </div>
            )}
            <div className="mt-2">
              {course.dishes.map((d) => (
                <div key={d.name} className="flex items-start justify-between gap-4 py-3.5" style={{ borderBottom: `1px solid ${colors.line}` }}>
                  <div>
                    <div className="font-semibold text-[15px] text-white">
                      {d.name}
                      {d.tags && (
                        <span className="inline-flex gap-1 ml-2 align-middle">
                          {d.tags.map((x) => (
                            <span
                              key={x}
                              title={tagInfo[x].label}
                              className="inline-flex items-center justify-center rounded-full text-[9.5px] font-bold leading-none px-1.5 py-[3px]"
                              style={{ border: `1px solid ${colors.accent}`, color: colors.accent }}
                            >
                              {tagInfo[x].short}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                    <div className="text-[12.5px] mt-1" style={{ color: colors.inkDim }}>{d.desc}</div>
                  </div>
                  <div className="font-semibold text-[14px] whitespace-nowrap" style={{ color: colors.accent }}>{d.price}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="text-center">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px]" style={{ color: colors.inkDim }}>
            {used.map((x) => (
              <span key={x}>
                <span className="font-bold" style={{ color: colors.accent }}>{tagInfo[x].short}</span> {tagInfo[x].label}
              </span>
            ))}
          </div>
          <p className="text-[12.5px] italic mt-4" style={{ color: colors.inkDim }}>
            {t("Menyn är ett exempel och rätterna är påhittade. Kontakta oss alltid vid allergi.")}
          </p>
        </div>
      </section>
    </Shell>
  );
}
