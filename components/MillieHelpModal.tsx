"use client";

// "Vad kan Millie göra?" — en översikt över vad man kan be Millie om, med
// klickbara exempel som fylls i meddelanderutan. Visas automatiskt de första
// gångerna man öppnar redigeraren (räknas i webbläsaren), därefter via
// knappen "Tips" i chatten. Håll listan i takt med vad Millie faktiskt kan
// (app/api/sites/edit/route.ts).
const GROUPS: { icon: string; title: string; hint?: string; examples: string[] }[] = [
  {
    icon: "✏️",
    title: "Text och innehåll",
    hint: "Säg vilken sida du menar, eller klicka på en text i förhandsvisningen först.",
    examples: [
      "På startsidan, byt rubriken till …",
      "Gör texten under Om oss kortare",
      "Lägg till en ruta efter Om oss med texten … och en knapp till kontaktsidan",
      "Skriv egna kundomdömen: ”…” – Anna, ”…” – Marcus",
    ],
  },
  {
    icon: "🎨",
    title: "Färger och stil",
    examples: [
      "Byt accentfärg till mörkgrön",
      "Gör bara kontaktsektionen mörkblå",
      "Gör Om oss-sidan mörk",
      "Gör hela sajten mörk och elegant",
      "Gör rubrikerna större",
      "Byt till pastell",
    ],
  },
  {
    icon: "🧩",
    title: "Upplägg och ordning",
    examples: [
      "Visa tjänsterna som en lista",
      "Gör Om oss med en stor bild",
      "Flytta kundcitaten högst upp på startsidan",
      "Lägg Kontakt före Nyheter i menyn",
      "Ta bort den här sektionen",
    ],
  },
  {
    icon: "🔘",
    title: "Knappar, meny och luft",
    examples: [
      "Gör knapparna kantiga",
      "Centrera loggan och lägg menyn under",
      "Gör sidan luftigare",
      "Låt knappen leda till kontaktsidan",
    ],
  },
  {
    icon: "🖼️",
    title: "Bilder",
    hint: "Bifoga en bild med gem-knappen eller sök gratis stockbilder med bildknappen.",
    examples: ["Använd den bifogade bilden som bild på startsidan", "Byt bilden här (markera den först)"],
  },
  {
    icon: "🔍",
    title: "Google och delning",
    examples: [
      "Skriv en bra Google-titel och beskrivning för alla sidor",
      "Förbättra hur startsidan syns i sökningar",
    ],
  },
  {
    icon: "🗣️",
    title: "Ton och omskrivning",
    hint: "Millie skriver om en sida i taget – säg vilken.",
    examples: ["Gör texten på startsidan mer personlig", "Skriv om Om oss i en mer formell ton"],
  },
  {
    icon: "📄",
    title: "Sidor, nyheter och mer",
    examples: [
      "Lägg till en ny sida som heter Priser",
      "Ta bort sidan Galleri",
      "Skriv en nyhet om vår nya öppettid (börja gärna med en kort text – Millie utökar den och sätter rubrik och ingress)",
      "Koppla på Google Analytics: G-XXXXXXXXXX",
    ],
  },
];

export const MILLIE_HELP_SEEN_KEY = "yourcosite-millie-help-seen";

export default function MillieHelpModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (text: string) => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Vad kan Millie göra?"
    >
      <div
        className="bg-surface rounded-2xl w-full max-w-[720px] max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-line">
          <div>
            <h2 className="text-[19px] font-medium">Vad kan Millie göra?</h2>
            <p className="text-[13px] text-ink-dim mt-1 leading-relaxed">
              Skriv som du pratar. Klicka på ett exempel nedan så hamnar det i meddelanderutan – ändra sedan texten så den
              passar dig. Du kan alltid ångra med knappen i chatten.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Stäng" className="text-[22px] leading-none text-ink-dim px-1">
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 grid sm:grid-cols-2 gap-4">
          {GROUPS.map((g) => (
            <div key={g.title} className="border border-line rounded-xl p-4">
              <div className="font-semibold text-[14px] mb-1">
                {g.icon} {g.title}
              </div>
              {g.hint && <p className="text-[12px] text-ink-dim mb-2 leading-relaxed">{g.hint}</p>}
              <div className="flex flex-col gap-1.5">
                {g.examples.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      onPick(ex);
                      onClose();
                    }}
                    className="text-left text-[12.5px] bg-bg border border-line rounded-lg px-2.5 py-1.5 leading-snug hover:border-ink"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-3.5 border-t border-line flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[12px] text-ink-dim">
            Går något inte att göra? Millie säger till, och du kan skicka önskemålet till oss.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-accent text-accent-ink font-semibold text-[13.5px] px-4 py-2 rounded-[10px]"
          >
            Okej, jag provar
          </button>
        </div>
      </div>
    </div>
  );
}
