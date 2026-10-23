import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export const colors = {
  bg: "#161110",
  surface: "#211916",
  ink: "#F4EEE6",
  inkDim: "#B9A999",
  line: "rgba(244,238,230,0.12)",
  accent: "#E39A55",
  accentInk: "#1E1008",
};

type Active = "hem" | "meny" | "om-oss" | "kontakt";

// Gemensam ram för restaurangexemplets fyra sidor: topplänk, meny och sidfot.
export function Shell({ active, children }: { active: Active; children: React.ReactNode }) {
  const t = getT();
  const items: { key: Active; href: string; label: string }[] = [
    { key: "hem", href: "/exempel/restaurang", label: t("Hem") },
    { key: "meny", href: "/exempel/restaurang/meny", label: t("Meny") },
    { key: "om-oss", href: "/exempel/restaurang/om-oss", label: t("Om oss") },
    { key: "kontakt", href: "/exempel/restaurang/kontakt", label: t("Kontakt") },
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

      <header className="flex items-center justify-between px-8 md:px-16 py-6 pt-16" style={{ borderBottom: `1px solid ${colors.line}` }}>
        <Link href="/exempel/restaurang" className="font-serif italic text-[21px]">
          {t("Bistro Tegelbruket")}
        </Link>
        <nav className="hidden md:flex items-center gap-9 text-[13.5px] font-semibold" style={{ color: colors.inkDim }}>
          {items.map((i) =>
            i.key === active ? (
              <span key={i.key} style={{ color: "#fff" }}>{i.label}</span>
            ) : (
              <Link key={i.key} href={i.href}>{i.label}</Link>
            )
          )}
        </nav>
        <Link
          href="/exempel/restaurang/kontakt"
          className="text-[13px] font-semibold px-5 py-2.5 rounded-full"
          style={{ background: colors.accent, color: colors.accentInk }}
        >
          {t("Boka bord")}
        </Link>
      </header>

      {children}

      <footer
        className="flex flex-col sm:flex-row gap-3 items-center justify-between px-8 md:px-16 py-6 text-[12.5px]"
        style={{ borderTop: `1px solid ${colors.line}`, color: colors.inkDim }}
      >
        <span>{t("Bistro Tegelbruket · Exempelsajt byggd med YourCoSite")}</span>
        <Link href="/exempel" style={{ color: colors.inkDim }}>
          {t("← Fler exempel")}
        </Link>
      </footer>
    </div>
  );
}
