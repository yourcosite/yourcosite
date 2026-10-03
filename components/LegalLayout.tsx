import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Delad layout för de riktiga juridiska sidorna (/anvandarvillkor,
// /integritetspolicy) — innehållet kommer från "Juridik för YourCoSite"
// (Claude Docs-dokumentet), inte hittat på här. Använder barnens vanliga
// HTML-taggar (h2/h3/p/table/ul) och styr utseendet via wrapper-klasser
// istället för en typografi-plugin, eftersom Tailwind här inte har
// @tailwindcss/typography installerat.
export default function LegalLayout({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated?: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Header />
      <section className="bg-surface">
        <div className="max-w-[720px] mx-auto px-6 py-16 md:py-20">
          <h1 className="text-[32px] font-medium mb-2">{title}</h1>
          {updated && (
            <p className="text-[13px] text-ink-dim mb-8">Senast uppdaterad: {updated}</p>
          )}
          {intro && (
            <div className="bg-accent-soft rounded-xl px-5 py-4 text-[13.5px] text-ink leading-relaxed mb-10">
              {intro}
            </div>
          )}
          <div
            className="
              text-[15px] text-ink leading-relaxed
              [&>h2]:text-[23px] [&>h2]:font-semibold [&>h2]:mt-14 [&>h2]:mb-5 [&>h2]:pb-2.5 [&>h2]:border-b [&>h2]:border-line
              [&>h2:first-child]:mt-0
              [&>h3]:text-[16px] [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-2
              [&>p]:mb-4
              [&_strong]:font-semibold
              [&_a]:underline
              [&_table]:w-full [&_table]:border-collapse [&_table]:my-5 [&_table]:text-[13.5px]
              [&_th]:text-left [&_th]:bg-bg [&_th]:border [&_th]:border-line [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold
              [&_td]:border [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_td]:align-top
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1.5
              [&_.note]:bg-bg [&_.note]:border [&_.note]:border-line [&_.note]:rounded-xl [&_.note]:px-4 [&_.note]:py-3.5 [&_.note]:text-[13.5px] [&_.note]:text-ink-dim [&_.note]:my-5
            "
          >
            {children}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
