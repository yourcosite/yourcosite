"use client";

import { EmojiIcon } from "@/components/ui/YIcon";
import { msg } from "@/lib/i18n/config";
import { useT } from "@/components/I18nProvider";
// "Vad kan Millie göra?" — en översikt över vad man kan be Millie om, med
// klickbara exempel som fylls i meddelanderutan. Visas automatiskt de första
// gångerna man öppnar redigeraren (räknas i webbläsaren), därefter via
// knappen "Tips" i chatten. Håll listan i takt med vad Millie faktiskt kan
// (app/api/sites/edit/route.ts).
const GROUPS: { icon: string; title: string; hint?: string; examples: string[] }[] = [
  {
    icon: "✏️",
    title: msg("Text och innehåll"),
    hint: msg("Säg vilken sida du menar, eller klicka på en text i förhandsvisningen först."),
    examples: [
      msg("På startsidan, byt rubriken till …"),
      msg("Gör texten under Om oss kortare"),
      msg("Lägg till en ruta efter Om oss med texten … och en knapp till kontaktsidan"),
      msg("Skriv egna kundomdömen: ”…” – Anna, ”…” – Marcus"),
    ],
  },
  {
    icon: "🎨",
    title: msg("Färger och stil"),
    examples: [
      msg("Byt accentfärg till mörkgrön"),
      msg("Gör bara kontaktsektionen mörkblå"),
      msg("Gör Om oss-sidan mörk"),
      msg("Gör hela sajten mörk och elegant"),
      msg("Gör rubrikerna större"),
      msg("Byt till pastell"),
    ],
  },
  {
    icon: "🧩",
    title: msg("Upplägg och ordning"),
    examples: [
      msg("Visa tjänsterna som en lista"),
      msg("Gör Om oss med en stor bild"),
      msg("Flytta kundcitaten högst upp på startsidan"),
      msg("Lägg Kontakt före Nyheter i menyn"),
      msg("Ta bort den här sektionen"),
    ],
  },
  {
    icon: "🔘",
    title: msg("Knappar, meny och luft"),
    examples: [
      msg("Gör knapparna kantiga"),
      msg("Centrera loggan och lägg menyn under"),
      msg("Gör sidan luftigare"),
      msg("Gör bara den här sektionen tajtare"),
      msg("Centrera texten i den här sektionen"),
      msg("Vänsterställ all text på sidan"),
      msg("Låt knappen leda till kontaktsidan"),
      msg("Byt menyn till en med en tydlig bokningsknapp"),
      msg("Ändra knappen i menyn till Boka tid"),
    ],
  },
  {
    icon: "📅",
    title: msg("Bokning"),
    hint: msg("Paket, tider och bokningar sköter du under Bokningar i menyn. Millie bestämmer var bokningen visas på sajten."),
    examples: [
      msg("Skapa en bokningssida"),
      msg("Lägg till bokningen längst ned på sidan Kontakt"),
      msg("Byt bokningen till bild bredvid"),
    ],
  },
  {
    icon: "🖼️",
    title: msg("Bilder"),
    hint: msg("Bifoga en bild med gem-knappen eller sök gratis stockbilder med bildknappen. Klicka på en bild i förhandsvisningen och välj \"Redigera bild\" för att beskära, vrida eller göra den ljusare."),
    examples: [msg("Använd den bifogade bilden som bild på startsidan"), msg("Byt bilden här (markera den först)")],
  },
  {
    icon: "🖼️",
    title: msg("Galleri och personer"),
    hint: msg("Klicka på galleriet eller personerna i förhandsvisningen: Lägg till bilder laddar upp många bilder på en gång, Redigera personer fyller i foto, namn, titel, e-post och telefon, och Byt layout visar alla uppställningar."),
    examples: [
      msg("Lägg till ett galleri med plats för 12 bilder"),
      msg("Gör galleriet till en mosaik"),
      msg("Visa personerna på kontaktsidan med runda porträtt"),
      msg("Lägg till en sektion med vårt team på sidan Kontakt: Anna, VD och Erik, projektledare"),
    ],
  },
  {
    icon: "✨",
    title: msg("Ikoner och layouter"),
    hint: msg("Klicka på en ikon i förhandsvisningen och välj Byt ikon för att se alla ikoner, eller Byt layout på en sektion för att se miniatyrer."),
    examples: [
      msg("Byt ikonerna i tjänsterna till något som passar bättre"),
      msg("Visa tjänsterna som ikonkort"),
    ],
  },
  {
    icon: "🍽️",
    title: msg("Restaurangmeny"),
    hint: msg("Bifoga din meny (PDF, Word, text eller ett foto) med gemet så läser Millie in alla rätter. Sedan ändrar du enskilda rätter och priser genom att skriva till henne. Byt layout på menyn visar fyra uppställningar."),
    examples: [
      msg("Lägg till en menysida med den bifogade menyn"),
      msg("Sänk priset på laxen till 245 kr"),
      msg("Lägg till en vegansk pasta under varmrätter för 165 kr"),
      msg("Ta bort rätten Råbiff från menyn"),
      msg("Flytta efterrätter före drycker"),
      msg("Gör menyn till flikar"),
    ],
  },
  {
    icon: "🔌",
    title: msg("Eget bokningssystem och kod"),
    hint: msg("Millie lägger till en ruta för koden. Själva koden klistrar du in själv: klicka på rutan i förhandsvisningen och välj Klistra in kod. Det går bra med script, iframe eller bara adressen."),
    examples: [
      msg("Lägg in mitt eget bokningssystem på sidan Boka"),
      msg("Lägg till en ruta för inbäddad kod längst ned på startsidan"),
    ],
  },
  {
    icon: "🔍",
    title: msg("Google och delning"),
    examples: [
      msg("Skriv en bra Google-titel och beskrivning för alla sidor"),
      msg("Förbättra hur startsidan syns i sökningar"),
    ],
  },
  {
    icon: "🗣️",
    title: msg("Ton och omskrivning"),
    hint: msg("Millie skriver om en sida i taget – säg vilken."),
    examples: [msg("Gör texten på startsidan mer personlig"), msg("Skriv om Om oss i en mer formell ton")],
  },
  {
    icon: "📄",
    title: msg("Sidor, nyheter och mer"),
    examples: [
      msg("Lägg till en ny sida som heter Priser"),
      msg("Ta bort sidan Galleri"),
      msg("Flytta sidan Priser före Kontakt i menyn"),
      msg("Ändra rubriken på nyheten om vår kampanj"),
      msg("Ta bort nyheten om vår kampanj"),
      msg("Skriv en nyhet om vår nya öppettid (börja gärna med en kort text – Millie utökar den och sätter rubrik och ingress)"),
      msg("Skriv en nyhet om vår kampanj, publicera den 1 november kl 08 och ta ner den 30 november"),
      msg("Ta ner nyheten om vår kampanj automatiskt den 30 november"),
      msg("Koppla på Google Analytics: G-XXXXXXXXXX"),
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
  const t = useT();
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("Vad kan Millie göra?")}
    >
      <div
        className="bg-surface rounded-2xl w-full max-w-[720px] max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-line">
          <div>
            <h2 className="text-[19px] font-medium">{t("Hej, jag är Millie!")}</h2>
            <p className="text-[13px] text-ink-dim mt-1 leading-relaxed">
              {t("Jag är din digitala assistent och hjälper dig med allt som rör din hemsida. Så här kan du be mig om hjälp: skriv som du pratar – eller tryck på mikrofonen vid skrivrutan och prata in det (finns i Chrome, Edge och Safari). Klicka på ett exempel nedan så hamnar det i meddelanderutan – ändra sedan texten så den passar dig. Du kan alltid ångra med knappen i chatten.")}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Stäng")} className="text-[22px] leading-none text-ink-dim px-1">
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 grid sm:grid-cols-2 gap-4">
          {GROUPS.map((g) => (
            <div key={g.title} className="border border-line rounded-xl p-4">
              <div className="font-semibold text-[14px] mb-1">
                <span className="inline-flex items-center gap-2"><EmojiIcon emoji={g.icon} size={19} />{t(g.title)}</span>
              </div>
              {g.hint && <p className="text-[12px] text-ink-dim mb-2 leading-relaxed">{t(g.hint)}</p>}
              <div className="flex flex-col gap-1.5">
                {g.examples.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      onPick(t(ex));
                      onClose();
                    }}
                    className="text-left text-[12.5px] bg-bg border border-line rounded-lg px-2.5 py-1.5 leading-snug hover:border-ink"
                  >
                    {t(ex)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-3.5 border-t border-line flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[12px] text-ink-dim">
            {t("Går något inte att göra? Millie säger till, och du kan skicka önskemålet till oss.")}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-accent text-accent-ink font-semibold text-[13.5px] px-4 py-2 rounded-[10px]"
          >
            {t("Okej, jag provar")}
          </button>
        </div>
      </div>
    </div>
  );
}
