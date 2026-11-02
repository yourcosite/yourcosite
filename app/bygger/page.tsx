"use client";

import { msg } from "@/lib/i18n/config";
import { useT } from "@/components/I18nProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

const steps = [
  msg("Läser in din verksamhet och ton"),
  msg("Skriver texter för varje sektion"),
  msg("Designar layout och väljer struktur"),
  msg("Sätter samman din sajt"),
];

const QUIPS = [
  msg("Jag väljer just nu mellan 47 nyanser av vitt. Det är svårt."),
  msg("Rubrikerna övar framför spegeln."),
  msg("Jag letar efter det perfekta kommatecknet."),
  msg("Marginalerna får en liten pratstund så alla blir överens."),
  msg("Knapparna tränar på att se inbjudande ut."),
  msg("Bilderna får sina bästa sidor att synas."),
  msg("Jag räknar pixlar. Hittills stämmer det."),
  msg("Någon måste bestämma hur stor rubriken ska vara. Det blir jag."),
  msg("Jag skickar en vänlig tanke till din meny. Den ska sitta snyggt."),
  msg("Texterna sträcker på sig innan de ska ut."),
  msg("Jag dubbelkollar att ingenting hamnar snett."),
  msg("Bra saker tar den tid de tar. Jag håller koll på klockan åt oss."),
  msg("Jag har bett färgerna att komma överens. De förhandlar."),
  msg("Kaffe hade varit bra nu, men jag har inga händer. Jag skriver vidare."),
  msg("Jag läser om din verksamhet och blir lite sugen på att vara kund."),
  msg("Sidfoten får också lite omsorg. Ingen ska glömmas bort."),
  msg("Jag lägger sista handen vid något. Sen lägger jag en till."),
  msg("Sajten byggs sektion för sektion, som ett riktigt bra smörgåsbord."),
  msg("Jag letar rätt ton i varje mening så det låter som er."),
  msg("Mellanrummen mellan sektionerna får en omgång frisk luft."),
  msg("Hör du ett litet klick? Det är bara en rubrik som hittar sin plats."),
];

export default function GeneratingPage() {
  const t = useT();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [percent, setPercent] = useState(0);
  const [pageInfo, setPageInfo] = useState<{ page: number; pages: number } | null>(null);
  const [error, setError] = useState("");
  // Roliga kommentarer i stället för ett löfte om hur lång tid det tar —
  // byts ungefär var fjärde sekund, i slumpad ordning utan upprepning.
  const [quip, setQuip] = useState<number | null>(null);
  const [quipShown, setQuipShown] = useState(true);
  // Kort sammanfattning som visas när sajten är klar: vilka dokument som lästes
  // och om extra bilder blev ett galleri.
  const [notes, setNotes] = useState<string[]>([]);
  // Ingen fallback-text som "din" — hellre visa rubriken en stund senare
  // än att blinka till en felaktig/konstig text innan det riktiga namnet
  // hämtats.
  const [siteName, setSiteName] = useState<string | null>(null);

  useEffect(() => {
    const order = QUIPS.map((_, i) => i).sort(() => Math.random() - 0.5);
    let n = 0;
    setQuip(order[0]);
    const timer = setInterval(() => {
      setQuipShown(false);
      setTimeout(() => {
        n = (n + 1) % order.length;
        setQuip(order[n]);
        setQuipShown(true);
      }, 350);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false

    fetch("/api/onboarding/current")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.site?.name) setSiteName(data.site.name);
      })
      .catch(() => {});

    // Servern strömmar riktiga framsteg (rader med JSON, se
    // app/api/sites/generate/route.ts): först "progress"-rader medan sajten
    // skrivs, sist en "result"-rad med själva resultatet.
    const failText =
      t("Bygget avbröts innan det blev klart, troligen för att det tog för lång tid. Inget har gått förlorat, tryck på Försök igen.");
    fetch("/api/sites/generate", { method: "POST", headers: { "x-progress": "1" } })
      .then(async (res) => {
        if (!res.body) throw new Error(failText);
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let result: { status: number; body: any } | null = null;
        const handle = (line: string) => {
          if (!line.trim()) return;
          let msg: any;
          try {
            msg = JSON.parse(line);
          } catch {
            return;
          }
          if (msg.type === "progress" && !cancelled) {
            setPercent((cur) => Math.max(cur, msg.value * 100));
            setPageInfo(msg.page > 0 ? { page: msg.page, pages: msg.pages } : null);
            setActiveStep(msg.value < 0.1 ? 0 : msg.value < 0.88 ? 1 : 2);
          } else if (msg.type === "result") {
            result = { status: msg.status, body: msg.body };
          }
        };
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          lines.forEach(handle);
        }
        handle(buf);
        // Ingen resultatrad = servern avbröts mitt i (t.ex. tidsgränsen).
        if (!result) throw new Error(failText);
        const r = result as { status: number; body: any };
        if (r.status < 200 || r.status >= 300) throw new Error(r.body?.error || t("Något gick fel."));
        if (!cancelled) {
          setActiveStep(steps.length - 1);
          setPercent(100);
          const b = r.body || {};
          const lines: string[] = [];
          if (b.imagesUploaded > 0 || b.documentsRead > 0) {
            lines.push(
              t("Du laddade upp {images} bilder och {docs} textfiler med totalt {chars} tecken.", {
                images: b.imagesUploaded ?? 0,
                docs: b.documentsRead ?? 0,
                chars: Number(b.documentChars ?? 0).toLocaleString("sv-SE"),
              })
            );
          }
          if (b.documentsRead > 0) lines.push(t("Texten i dokumenten har använts på sajten."));
          if (b.documentsFailed > 0) lines.push(t("{n} dokument gick inte att läsa. Spara dem som .docx, PDF eller .txt och försök igen.", { n: b.documentsFailed }));
          setNotes(lines);
          // En kort stund på 100 % så man hinner se att det blev klart —
          // längre när det finns en sammanfattning att läsa.
          setTimeout(() => router.push("/forslag"), lines.length > 0 ? 4500 : 600);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-ink text-white flex flex-col items-center justify-center relative font-sans px-6">
      <div className="absolute top-8 left-6 md:left-12">
        <Logo />
      </div>

      {!error && (
        <div className="w-[46px] h-[46px] rounded-full border-[3px] border-[#3A3A3E] animate-spin mb-7" style={{ borderTopColor: "#C6FF5E" }} />
      )}

      <h1 className="text-[28px] md:text-[30px] font-medium mb-2.5 text-center">
        {error
          ? t("Något gick fel")
          : siteName
          ? t("Bygger {siteName}s nya sajt", { siteName })
          : " "}
      </h1>
      <p
        className="text-[15px] text-[#9E9C97] mb-11 text-center min-h-[44px] max-w-[420px] transition-opacity duration-300"
        style={{ opacity: error || quipShown ? 1 : 0 }}
        aria-live="polite"
      >
        {error ? error : siteName && quip !== null ? t(QUIPS[quip]) : "\u00a0"}
      </p>

      {error && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-accent text-accent-ink font-semibold text-[14.5px] px-6 py-3 rounded-[10px]"
        >
          {t("Försök igen")}
        </button>
      )}

      {!error && siteName && (
        <div className="w-full max-w-[420px] mb-9">
          <div className="flex items-center justify-between text-[13px] mb-2">
            <span className="text-[#9E9C97]">{percent >= 100 ? t("Klart!") : pageInfo ? t("Skriver sidan {page} av {pages}", { page: pageInfo.page, pages: pageInfo.pages }) : t("Förbereder")}</span>
            <span className="font-semibold tabular-nums">{Math.round(percent)} %</span>
          </div>
          <div
            className="h-2 w-full rounded-full bg-[#2A2A2E] overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percent)}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
                  </div>
      )}

      {!error && (
        <div className="w-full max-w-[420px] flex flex-col gap-4">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              {i < activeStep ? (
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#0C1004" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              ) : i === activeStep ? (
                <div className="w-6 h-6 rounded-full border-2 border-accent flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-[#3A3A3E] flex-shrink-0" />
              )}
              <span
                className={`text-[14.5px] ${
                  i < activeStep ? "text-[#E5E4E1]" : i === activeStep ? "text-white font-semibold" : "text-[#6E6C68]"
                }`}
              >
                {t(label)}
              </span>
            </div>
          ))}
        </div>
      )}

      {!error && notes.length > 0 && (
        <div className="w-full max-w-[420px] mt-8 text-[13.5px] text-[#E5E4E1] flex flex-col gap-1.5" role="status">
          {notes.map((n) => (
            <div key={n}>✓ {n}</div>
          ))}
        </div>
      )}

      {error && (
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-accent text-accent-ink font-semibold text-[15px] px-7.5 py-3.5 rounded-[10px]"
        >
          {t("Försök igen")}
        </button>
      )}
    </div>
  );
}
