import Link from "next/link";
import Logo from "./Logo";

export default function OnboardingShell({
  step,
  totalSteps = 4,
  stepLabel,
  children,
}: {
  step: number;
  totalSteps?: number;
  stepLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-bg">
      <div className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-line bg-surface">
        <Link href="/">
          <Logo light={false} />
        </Link>
        <Link href="/dashboard" className="text-[14px] text-ink-dim font-medium">
          Avbryt
        </Link>
      </div>

      <div className="px-6 md:px-12 pt-6">
        <div className="flex items-center gap-2.5 max-w-xl">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              className={`flex-1 h-1 rounded-full ${
                n <= step ? "bg-accent" : "bg-line"
              }`}
            />
          ))}
        </div>
        <div className="text-[13px] text-ink-dim mt-2.5 font-medium">
          STEG {step} AV {totalSteps} · {stepLabel}
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-6 py-8 md:py-10">
        {children}
      </div>
    </div>
  );
}
