import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const steps = [
  {
    n: "1",
    title: "Berätta om er",
    body: "Namn, ton, färger och egna bilder — så mycket eller lite ni vill.",
  },
  {
    n: "2",
    title: "Vi bygger sajten",
    body: "Text, bilder och design sätts samman snabbt och effektivt.",
  },
  {
    n: "3",
    title: "Fortsätt i samtalet",
    body: "Be om ändringar när som helst — och se dem direkt i sajten.",
  },
];

export default function LandingPage() {
  return (
    <div>
      <Header active="/" />

      {/* Hero */}
      <section className="bg-ink">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-[42px] md:text-[52px] leading-[1.1] font-medium text-white">
              Din hemsida.
              <br />
              <span className="italic text-accent">Byggd genom ett samtal.</span>
            </h1>
            <p className="text-[17px] leading-relaxed text-[#C9C7C2] mt-6 max-w-[42ch]">
              Beskriv verksamheten, visa oss vad ni gillar, och låt YourCoSite
              göra resten. Sen fortsätter ni bara att be om ändringar — precis
              som ni skulle till en kollega.
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <Link
                href="/skapa-konto"
                className="bg-accent text-accent-ink font-bold text-[15.5px] px-7 py-3.5 rounded-xl shadow-[0_16px_34px_rgba(198,255,94,0.3)]"
              >
                Bygg din sajt →
              </Link>
              <Link
                href="/exempel"
                className="text-white font-semibold text-[15.5px] border-b border-white/40 pb-0.5 self-center"
              >
                Se exempel
              </Link>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.4)] border border-white/10">
            <div className="bg-[#1C1C20] px-4 py-2.5 text-[11.5px] text-[#9E9C97]">
              solglantansbageri.se — byggd med YourCoSite
            </div>
            <div className="relative h-[300px] md:h-[360px]">
              <Image
                src="/images/hero-bakery.jpg"
                alt="Solgläntans Bageri — exempel på en hemsida byggd med YourCoSite"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="font-serif italic text-[13px] text-accent mb-1">
                  Nybakat med kärlek — sedan 1998
                </div>
                <div className="font-serif text-2xl">Solgläntans Bageri</div>
                <p className="text-[13.5px] text-[#E9E6E0] mt-1 max-w-[36ch]">
                  Surdegsbröd, kanelbullar och fika i hjärtat av stan
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-surface">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-20">
          <h2 className="text-[28px] md:text-[32px] font-medium text-center mb-12">
            Så här enkelt är det
          </h2>
          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((s) => (
              <div key={s.n}>
                <span className="font-serif italic text-accent-ink bg-accent w-9 h-9 rounded-full inline-flex items-center justify-center text-[15px] mb-4">
                  {s.n}
                </span>
                <h3 className="text-[19px] font-medium mb-2">{s.title}</h3>
                <p className="text-[14.5px] leading-relaxed text-ink-dim max-w-[32ch]">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
          <div className="text-center mt-14">
            <Link
              href="/funktioner"
              className="font-semibold text-[14.5px] border-b border-ink pb-0.5"
            >
              Se hur det går till, steg för steg →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-ink text-center px-6 md:px-12 py-16">
        <h2 className="text-white text-[28px] md:text-[30px] font-medium mb-3">
          Redo att komma igång?
        </h2>
        <p className="text-[#C9C7C2] text-[15.5px] mb-7">
          Det tar under en minut att skapa ett konto och börja berätta om er
          verksamhet.
        </p>
        <Link
          href="/skapa-konto"
          className="inline-block bg-accent text-accent-ink font-bold text-[15.5px] px-7 py-3.5 rounded-xl"
        >
          Kom igång →
        </Link>
      </section>

      <Footer />
    </div>
  );
}
