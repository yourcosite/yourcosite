import Link from "next/link";
import Logo from "@/components/Logo";
import Millie from "@/components/Millie";

// Egen 404-sida istället för Next.js standardtext — Millie (maskoten från
// chattredigeraren, se components/Millie.tsx) dyker upp lite ursäktande,
// med ett förslag istället för bara en felkod. Ett litet, roligt
// ögonblick snarare än en återvändsgränd.
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-bg">
      <div className="px-6 md:px-12 py-5">
        <Link href="/">
          <Logo light={false} />
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10 -mt-14">
        <Millie active size={88} />
        <div className="text-[13px] font-bold tracking-[0.1em] text-ink-dim mt-7 mb-2">
          FEL 404
        </div>
        <h1 className="text-[30px] md:text-[36px] font-medium max-w-[560px] leading-tight">
          Hoppsan — den här sidan har inte byggts än.
        </h1>
        <p className="text-[15.5px] text-ink-dim mt-3.5 max-w-[460px] leading-relaxed">
          Om du skulle be Millie om den skulle hon säkert fixa det på typ 10
          sekunder. Men just den här länken finns tyvärr inte, varken hos oss
          eller hos dig.
        </p>
        <div className="flex items-center gap-3 mt-8">
          <Link
            href="/"
            className="bg-accent text-accent-ink font-semibold text-[14.5px] px-6 py-3 rounded-[10px]"
          >
            Till startsidan
          </Link>
          <Link
            href="/dashboard"
            className="text-ink font-semibold text-[14.5px] px-6 py-3 rounded-[10px] border border-line"
          >
            Till kundzonen
          </Link>
        </div>
      </div>
    </div>
  );
}
