import Link from "next/link";
import type { Metadata } from "next";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "Logga in",
};

export default function LoginPage() {
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

      <div className="flex-1 flex items-center justify-center bg-surface px-6 py-16">
        <div className="w-full max-w-[380px]">
          <h2 className="text-[28px] font-medium mb-2">Välkommen tillbaka</h2>
          <p className="text-[15px] text-ink-dim mb-8">
            Logga in för att fortsätta jobba på era sajter.
          </p>

          <form className="flex flex-col gap-4">
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
                placeholder="••••••••"
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>
            <div className="text-right -mt-1">
              <a href="#" className="text-[13.5px] font-medium">
                Glömt lösenord?
              </a>
            </div>
            <Link
              href="/dashboard"
              className="block text-center bg-accent text-accent-ink font-semibold text-[15.5px] py-3.5 rounded-[10px] mt-1"
            >
              Logga in
            </Link>
          </form>

          <div className="flex items-center gap-3 my-7">
            <div className="flex-1 h-px bg-line" />
            <span className="text-[12.5px] text-ink-dim">ELLER</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <p className="text-center text-[14.5px] text-ink-dim">
            Ny hos YourCoSite?{" "}
            <Link href="/skapa-konto" className="font-semibold text-ink">
              Skapa konto
            </Link>
          </p>
          <p className="text-center text-[11.5px] text-ink-dim mt-4 leading-relaxed">
            Genom att logga in godkänner du våra{" "}
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
