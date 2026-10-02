import Link from "next/link";
import OnboardingShell from "@/components/OnboardingShell";

export default function OnboardingStep2() {
  return (
    <OnboardingShell step={2} stepLabel="INSPIRATION">
      <div className="w-full max-w-[620px]">
        <h1 className="text-[34px] font-medium mb-2.5">Vad gillar du?</h1>
        <p className="text-[15.5px] text-ink-dim mb-7">
          Klistra in sajter vars känsla eller stil du gillar. Vi tittar på
          ton, struktur och stämning — aldrig text eller bilder rakt av.
          Helt valfritt.
        </p>

        <form className="flex flex-col gap-4">
          <div>
            <label htmlFor="u1" className="block text-[13.5px] font-semibold mb-1.5">
              Länk 1
            </label>
            <input
              id="u1"
              type="url"
              placeholder="https://"
              className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
            />
          </div>
          <div>
            <label htmlFor="u2" className="block text-[13.5px] font-semibold mb-1.5">
              Länk 2 (valfritt)
            </label>
            <input
              id="u2"
              type="url"
              placeholder="https://"
              className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
            />
          </div>
          <div>
            <label htmlFor="u3" className="block text-[13.5px] font-semibold mb-1.5">
              Länk 3 (valfritt)
            </label>
            <input
              id="u3"
              type="url"
              placeholder="https://"
              className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
            />
          </div>

          <div className="flex items-start gap-2.5 bg-accent-soft rounded-xl px-4 py-3.5 mt-2">
            <span className="text-[13.5px] text-ink leading-relaxed">
              Har du ingen favorit? Hoppa över det här steget — vi föreslår
              ändå tre olika stilriktningar i nästa steg.
            </span>
          </div>

          <div className="flex justify-between mt-4">
            <Link
              href="/onboarding/1"
              className="text-ink-dim font-semibold text-[15px] py-3.5 px-2.5"
            >
              ← Tillbaka
            </Link>
            <Link
              href="/onboarding/3"
              className="bg-accent text-accent-ink font-semibold text-[15px] px-7 py-3.5 rounded-[10px]"
            >
              Nästa →
            </Link>
          </div>
        </form>
      </div>
    </OnboardingShell>
  );
}
