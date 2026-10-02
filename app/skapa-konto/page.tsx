import Link from "next/link";
import type { Metadata } from "next";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "Skapa konto",
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen font-sans">
      <div className="hidden md:flex w-[46%] bg-ink text-[#F4F3F0] p-14 flex-col justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <div className="max-w-[440px]">
          <div className="text-[15px] text-[#9E9C97] mb-4 tracking-wide">
            HEMSIDAN BYGGS I ETT SAMTAL
          </div>
          <h1 className="text-[46px] leading-[1.12] font-medium text-white">
            Din hemsida.
            <br />
            <span className="italic text-accent">Byggd genom ett samtal.</span>
          </h1>
          <p className="text-[17px] leading-relaxed text-[#C9C7C2] mt-5">
            Beskriv verksamheten, visa oss vad ni gillar, och låt YourCoSite
            göra resten. Sen fortsätter ni bara att be om ändringar.
          </p>
        </div>
        <div />
      </div>

      <div className="flex-1 flex items-center justify-center bg-surface px-6 py-16 overflow-y-auto">
        <div className="w-full max-w-[380px]">
          <h2 className="text-[28px] font-medium mb-2">Skapa ditt konto</h2>
          <p className="text-[15px] text-ink-dim mb-7">
            Tar under en minut. Nästa steg är att berätta om er
            verksamhet.
          </p>

          <form className="flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="block text-[13.5px] font-semibold mb-1.5">
                Namn
              </label>
              <input
                id="name"
                type="text"
                placeholder="Förnamn Efternamn"
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-[13.5px] font-semibold mb-1.5">
                E-post
              </label>
              <input
                id="email"
                type="email"
                placeholder="du@företag.se"
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>
            <div>
              <label htmlFor="pw" className="block text-[13.5px] font-semibold mb-1.5">
                Lösenord
              </label>
              <input
                id="pw"
                type="password"
                placeholder="Minst 8 tecken"
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>
            <div>
              <label htmlFor="pw2" className="block text-[13.5px] font-semibold mb-1.5">
                Bekräfta lösenord
              </label>
              <input
                id="pw2"
                type="password"
                placeholder="••••••••"
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>
            <Link
              href="/onboarding/1"
              className="block text-center bg-accent text-accent-ink font-semibold text-[15.5px] py-3.5 rounded-[10px] mt-1"
            >
              Skapa konto →
            </Link>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-line" />
            <span className="text-[12.5px] text-ink-dim">ELLER</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <p className="text-center text-[14.5px] text-ink-dim">
            Har du redan ett konto?{" "}
            <Link href="/logga-in" className="font-semibold text-ink">
              Logga in
            </Link>
          </p>
          <p className="text-center text-[11.5px] text-ink-dim mt-4 leading-relaxed">
            Genom att skapa ett konto godkänner du våra{" "}
            <Link href="/anvandarvillkor" className="font-semibold underline">
              användarvillkor
            </Link>{" "}
            och vår{" "}
            <Link href="/integritetspolicy" className="font-semibold underline">
              integritetspolicy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
