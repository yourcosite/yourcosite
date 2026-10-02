import Link from "next/link";
import Logo from "./Logo";

const navLinks = [
  { href: "/funktioner", label: "Funktioner" },
  { href: "/priser", label: "Priser" },
  { href: "/exempel", label: "Exempel" },
  { href: "/om-oss", label: "Om oss" },
  { href: "/kontakt", label: "Kontakt" },
];

export default function Header({ active }: { active?: string }) {
  return (
    <div className="bg-ink">
      <div className="flex items-center justify-between px-6 md:px-12 py-5">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-[#C9C7C2]">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={active === l.href ? "text-white" : "hover:text-white transition-colors"}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/logga-in" className="text-white font-semibold">
            Logga in
          </Link>
          <Link
            href="/skapa-konto"
            className="bg-accent text-accent-ink font-bold px-[18px] py-[9px] rounded-lg text-[13.5px]"
          >
            Kom igång
          </Link>
        </nav>
      </div>
    </div>
  );
}
