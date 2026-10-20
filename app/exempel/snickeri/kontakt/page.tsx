import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";

const colors = {
  bg: "#14201A",
  surface: "#1B2921",
  ink: "#F2EFE6",
  inkDim: "#9FAE9E",
  line: "rgba(242,239,230,0.12)",
  accent: "#C9B27C",
  accentInk: "#1B2921",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = getT();
  return { title: t("Kontakt — Ekfast Snickeri"), description: t("Begär offert — Ekfast Snickeri, exempel byggt med YourCoSite.") };
}

export default function SnickeriKontaktPage() {
  const t = getT();


  return (
    <div style={{ background: colors.bg, color: colors.ink, fontFamily: "'Work Sans', system-ui, sans-serif" }}>
      <Link
        href="/exempel"
        className="fixed top-5 left-5 z-10 inline-flex items-center gap-2 text-[12.5px] font-semibold px-3.5 py-2 rounded-full"
        style={{ background: "rgba(0,0,0,0.45)", color: "#fff" }}
      >
        {t("← Alla exempel")}
      </Link>

      <header className="flex items-center justify-between px-8 md:px-16 py-6" style={{ borderBottom: `1px solid ${colors.line}` }}>
        <Link href="/exempel/snickeri" className="font-serif text-[21px] font-medium">
          {t("Ekfast Snickeri")}
        </Link>
        <nav className="hidden md:flex items-center gap-9 text-[13.5px] font-semibold" style={{ color: colors.inkDim }}>
          <Link href="/exempel/snickeri">{t("Hem")}</Link>
          <Link href="/exempel/snickeri/vad-vi-gor">{t("Vad vi gör")}</Link>
          <Link href="/exempel/snickeri/referensprojekt">{t("Referensprojekt")}</Link>
          <span style={{ color: "#fff" }}>{t("Kontakt")}</span>
        </nav>
        <span
          className="text-[13px] font-semibold px-5 py-2.5 rounded-md"
          style={{ background: colors.accent, color: colors.accentInk }}
        >
          {t("Begär offert")}
        </span>
      </header>

      <div className="relative h-[200px]">
        <Image src="/images/snickeri-kontakt-banner.jpg" alt="" fill className="object-cover opacity-70" />
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
          style={{ background: "rgba(20,32,26,0.5)" }}
        >
          <div className="text-[12.5px] tracking-[0.1em] mb-3" style={{ color: colors.inkDim }}>
            {t("VERKSTADEN")}
          </div>
          <h1 className="font-serif text-[30px] md:text-[36px]">{t("Kom förbi och se hur vi jobbar")}</h1>
        </div>
      </div>

      <section className="max-w-5xl mx-auto px-6 md:px-16 py-16 grid md:grid-cols-[1.3fr_1fr] gap-12">
        <div className="rounded-2xl p-7" style={{ background: colors.surface }}>
          <div className="text-[12.5px] tracking-[0.1em] mb-2" style={{ color: colors.accent }}>
            {t("BEGÄR OFFERT")}
          </div>
          <h2 className="font-serif text-[23px] mb-6">{t("Berätta om ert projekt")}</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              placeholder={t("Namn")}
              className="px-3.5 py-3 rounded-lg text-[14px] bg-transparent outline-none"
              style={{ border: `1px solid ${colors.line}`, color: colors.ink }}
            />
            <input
              placeholder={t("Telefon")}
              className="px-3.5 py-3 rounded-lg text-[14px] bg-transparent outline-none"
              style={{ border: `1px solid ${colors.line}`, color: colors.ink }}
            />
          </div>
          <textarea
            placeholder={t("Vad vill ni bygga?")}
            rows={4}
            className="w-full box-border px-3.5 py-3 rounded-lg text-[14px] bg-transparent outline-none mb-5 resize-none"
            style={{ border: `1px solid ${colors.line}`, color: colors.ink }}
          />
          <button
            type="button"
            className="font-semibold text-[14px] px-6 py-3 rounded-md"
            style={{ background: colors.accent, color: colors.accentInk }}
          >
            {t("Skicka förfrågan")}
          </button>
          <p className="text-[12.5px] mt-3" style={{ color: colors.inkDim }}>
            {t("Vi svarar vanligtvis inom två arbetsdagar.")}
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="relative h-[140px] rounded-2xl overflow-hidden">
            <Image src="/images/snickeri-kontakt-side.jpg" alt="" fill className="object-cover" />
          </div>
          <div>
            <div className="text-[12px] font-bold tracking-[0.08em] mb-1.5" style={{ color: colors.accent }}>
              {t("VERKSTAD")}
            </div>
            <div className="text-[14.5px]" style={{ color: colors.inkDim }}>
              {t("Industrivägen 8")}<br />{t("591 44 Motala")}
            </div>
          </div>
          <div>
            <div className="text-[12px] font-bold tracking-[0.08em] mb-1.5" style={{ color: colors.accent }}>
              {t("ÖPPETTIDER")}
            </div>
            <div className="text-[14.5px]" style={{ color: colors.inkDim }}>
              {t("Mån–fre 7–16, besök efter bokning")}
            </div>
          </div>
          <div>
            <div className="text-[12px] font-bold tracking-[0.08em] mb-1.5" style={{ color: colors.accent }}>
              {t("KONTAKT")}
            </div>
            <div className="text-[14.5px]" style={{ color: colors.inkDim }}>
              0141 – 300 22<br />{t("info@ekfastsnickeri.se")}
            </div>
          </div>
        </div>
      </section>

      <footer
        className="flex flex-col sm:flex-row gap-3 items-center justify-between px-8 md:px-16 py-6 text-[12.5px]"
        style={{ borderTop: `1px solid ${colors.line}`, color: colors.inkDim }}
      >
        <span>{t("Ekfast Snickeri · Exempelsajt byggd med YourCoSite")}</span>
        <Link href="/exempel" style={{ color: colors.inkDim }}>
          {t("← Fler exempel")}
        </Link>
      </footer>
    </div>
  );
}
