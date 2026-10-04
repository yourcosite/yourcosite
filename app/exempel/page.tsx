import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Exempel",
  description: "Fyra helt olika branscher, fyra helt olika känslor — allihop byggda genom samma samtal.",
};

const examples = [
  {
    href: "/exempel/restaurang",
    name: "Björkängens Kök",
    category: "Restaurang",
    body: "Elegant, mörk och stämningsfull — med bordsbokning och meny i fokus.",
    img: "/images/restaurant-hero.jpg",
  },
  {
    href: "/exempel/inredning",
    name: "Nordlys Inredning",
    category: "Inredningsbutik",
    body: "Ljus, luftig skandinavisk känsla — byggd kring produkter och inspiration.",
    img: "/images/inredning-hero.jpg",
  },
  {
    href: "/exempel/snickeri",
    name: "Ekfast Snickeri",
    category: "Snickerifirma",
    body: "Robust och hantverksnära — referensprojekt och offertförfrågan i fokus.",
    img: "/images/snickeri-hero.jpg",
  },
  {
    href: "/exempel/studio-lind",
    name: "Studio Lind",
    category: "Inredningsarkitekt",
    body: "Redaktionell och bildrik — bildkollage, kursiv rubrik och nyckeltal i hero.",
    img: "/images/inredning-vadvigor-1.jpg",
  },
];

export default function ExamplesPage() {
  return (
    <div>
      <Header active="/exempel" />

      <section className="bg-ink">
        <div className="max-w-2xl mx-auto text-center px-6 py-16">
          <div className="text-[13.5px] text-[#9E9C97] tracking-wide mb-3.5">
            LIVE-DEMO
          </div>
          <h1 className="text-[36px] md:text-[42px] leading-[1.15] font-medium text-white">
            Fyra exempel på vad YourCoSite bygger
          </h1>
          <p className="text-[16px] leading-relaxed text-[#C9C7C2] mt-4">
            Fyra helt olika branscher, fyra helt olika känslor — allihop
            byggda genom samma samtal. Klicka runt i dem som riktiga sajter.
          </p>
        </div>
      </section>

      <section className="bg-surface">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 grid sm:grid-cols-2 gap-6">
          {examples.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="block bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_10px_24px_rgba(23,23,26,0.05)]"
            >
              <div className="relative h-[180px]">
                <Image src={e.img} alt={e.name} fill className="object-cover" />
              </div>
              <div className="px-5 py-5">
                <div className="text-[12px] text-ink-dim font-semibold uppercase tracking-wide mb-1">
                  {e.category}
                </div>
                <div className="font-semibold text-[17px] mb-2">{e.name}</div>
                <p className="text-[13.5px] text-ink-dim leading-relaxed mb-3">
                  {e.body}
                </p>
                <span className="text-[13.5px] font-semibold border-b border-ink pb-0.5">
                  Se demo →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center pb-16">
          <Link href="/" className="font-semibold text-[14.5px] border-b border-ink pb-0.5">
            Tillbaka till startsidan
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
