import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SupportFaq from "@/components/SupportFaq";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Kontakt och support",
  description: "Vanliga frågor, och ett sätt att nå oss direkt.",
};

export default function SupportPage() {
  return (
    <div>
      <Header active="/kontakt" />

      <section className="bg-surface">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-14 md:py-16 grid md:grid-cols-[1.2fr_1fr] gap-12">
          <div>
            <div className="text-[12.5px] text-ink-dim uppercase tracking-wide mb-2">
              Vanliga frågor
            </div>
            <h1 className="text-[28px] font-medium mb-5">
              Kontakt och support
            </h1>
            <SupportFaq />
          </div>

          <div className="flex flex-col gap-5">
            <div className="bg-ink rounded-2xl p-7 text-white">
              <div className="font-serif italic text-[19px] text-accent mb-2.5">
                Hittar du inte svaret?
              </div>
              <p className="text-[13.5px] text-[#C9C7C2] leading-relaxed mb-4">
                Mejla oss, vi svarar vanligtvis inom 24 timmar på vardagar.
              </p>
              <a
                href="mailto:support@yourcosite.com"
                className="inline-flex items-center gap-2 bg-accent text-accent-ink font-bold text-[13.5px] px-4.5 py-2.5 rounded-lg"
              >
                support@yourcosite.com
              </a>
            </div>

            <ContactForm />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
