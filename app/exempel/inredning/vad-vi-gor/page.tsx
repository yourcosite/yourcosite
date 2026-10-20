import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";

const colors = {
  bg: "#FAF8F4",
  surface: "#FFFFFF",
  ink: "#2B2A27",
  inkDim: "#8A8780",
  line: "#E6E2D8",
  accent: "#7C8B6F",
  accentInk: "#FFFFFF",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = getT();
  return { title: t("Vad vi gör — Nordlys Inredning"), description: t("Vad vi gör — Nordlys Inredning, exempel byggt med YourCoSite.") };
}

export default function InredningVadViGorPage() {
  const t = getT();
  const items = [
    {
      title: t("Inredningsrådgivning"),
      body: t("Boka en timme med vår stylist — i butik eller hemma hos er. Vi hjälper er se helheten innan ni köper något."),
      img: "/images/inredning-vadvigor-1.jpg",
    },
    {
      title: t("Egen formgivning"),
      body: t("Vår kollektion designas i studion och tillverkas hos noga utvalda hantverkare i Europa."),
      img: "/images/inredning-vadvigor-2.jpg",
    },
    {
      title: t("Skräddarsydda beställningar"),
      body: t("Fel storlek eller tyg i katalogen? Vi hjälper er beställa måttanpassat."),
      img: "/images/inredning-vadvigor-3.jpg",
    },
  ];

  return (
    <div style={{ background: colors.bg, color: colors.ink, fontFamily: "'Work Sans', system-ui, sans-serif" }}>
      <Link
        href="/exempel"
        className="fixed top-5 left-5 z-10 inline-flex items-center gap-2 text-[12.5px] font-semibold px-3.5 py-2 rounded-full"
        style={{ background: "rgba(43,42,39,0.85)", color: "#fff" }}
      >
        {t("← Alla exempel")}
      </Link>

      <header className="flex items-center justify-between px-8 md:px-16 py-7" style={{ borderBottom: `1px solid ${colors.line}` }}>
        <Link href="/exempel/inredning" className="font-serif text-[20px] font-medium">
          {t("Nordlys Inredning")}
        </Link>
        <nav className="hidden md:flex items-center gap-9 text-[13px] font-semibold tracking-wide" style={{ color: colors.inkDim }}>
          <Link href="/exempel/inredning">{t("HEM")}</Link>
          <Link href="/exempel/inredning/kollektion">{t("KOLLEKTION")}</Link>
          <span style={{ color: colors.ink }}>{t("VAD VI GÖR")}</span>
          <Link href="/exempel/inredning/kontakt">{t("KONTAKT")}</Link>
        </nav>
        <Link
          href="/exempel/inredning/kontakt"
          className="text-[13px] font-semibold px-5 py-2.5 rounded-full"
          style={{ background: colors.accent, color: colors.accentInk }}
        >
          {t("Boka besök")}
        </Link>
      </header>

      <section className="px-8 md:px-16 py-16 max-w-3xl">
        <div className="text-[12.5px] tracking-[0.08em] mb-3" style={{ color: colors.accent }}>
          {t("VAD VI GÖR")}
        </div>
        <h1 className="font-serif text-[32px] md:text-[38px] font-medium mb-4">{t("Mer än en butik")}</h1>
        <p className="text-[15px] leading-relaxed" style={{ color: colors.inkDim }}>
          {t("Vi hjälper er hitta rätt möbler för ert hem — inte bara sälja dem. Tre sätt vi jobbar på:")}
        </p>
      </section>

      <section className="px-8 md:px-16 pb-20 grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
        {items.map((it) => (
          <div key={it.title}>
            <div className="relative h-[190px] rounded-md overflow-hidden mb-4">
              <Image src={it.img} alt={it.title} fill className="object-cover" />
            </div>
            <div className="font-serif text-[19px] mb-2.5">{it.title}</div>
            <p className="text-[14px] leading-relaxed" style={{ color: colors.inkDim }}>
              {it.body}
            </p>
          </div>
        ))}
      </section>

      <footer
        className="flex flex-col sm:flex-row gap-3 items-center justify-between px-8 md:px-16 py-6 text-[12.5px]"
        style={{ borderTop: `1px solid ${colors.line}`, color: colors.inkDim }}
      >
        <span>{t("Nordlys Inredning · Exempelsajt byggd med YourCoSite")}</span>
        <Link href="/exempel" style={{ color: colors.inkDim }}>
          {t("← Fler exempel")}
        </Link>
      </footer>
    </div>
  );
}
