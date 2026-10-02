import Link from "next/link";

export default function Footer() {
  return (
    <div className="px-6 md:px-12 py-4 border-t border-line flex flex-col sm:flex-row gap-3 justify-between items-center text-[12.5px] text-ink-dim bg-surface">
      <span>© 2026 YourCoSite, en produkt från CS Kommunikationsbyrå AB</span>
      <div className="flex gap-4">
        <Link href="/om-oss">Om oss</Link>
        <Link href="/kontakt">Kontakt</Link>
        <Link href="/anvandarvillkor">Användarvillkor</Link>
        <Link href="/integritetspolicy">Integritetspolicy</Link>
      </div>
    </div>
  );
}
