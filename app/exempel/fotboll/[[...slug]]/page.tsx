import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocale, getT } from "@/lib/i18n/server";
import { buildFootballExample } from "@/lib/exempelFotboll";
import SitePreview from "@/components/SitePreview";

function pathOf(slug?: string[]) {
  return "/" + (slug?.join("/") || "");
}

export async function generateMetadata({ params }: { params: { slug?: string[] } }): Promise<Metadata> {
  const content = buildFootballExample(getT());
  const page = content.pages.find((p) => p.path === pathOf(params.slug));
  return { title: page?.seoTitle, description: page?.seoDescription };
}

// Fotbollsexemplet renderas av våra egna sektioner (samma som kundernas sajter).
export default function FootballExample({ params }: { params: { slug?: string[] } }) {
  const t = getT();
  const content = buildFootballExample(t);
  const path = pathOf(params.slug);
  if (!content.pages.some((p) => p.path === path)) notFound();

  return (
    <div>
      <SitePreview
        content={content}
        siteName={t("Lindvallens FK")}
        lang={getLocale()}
        currency="SEK"
        activePath={path}
        basePath="/exempel/fotboll"
      />
      <Link
        href="/exempel"
        className="fixed bottom-5 left-5 z-50 inline-flex items-center gap-2 text-[12.5px] font-semibold px-3.5 py-2 rounded-full"
        style={{ background: "rgba(0,0,0,0.65)", color: "#fff", backdropFilter: "blur(4px)" }}
      >
        {t("← Alla exempel")}
      </Link>
    </div>
  );
}
