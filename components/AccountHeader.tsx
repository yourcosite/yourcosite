"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "./Logo";

const navLinks = [
  { href: "/dashboard", label: "Sajter" },
  { href: "/fakturering", label: "Fakturering" },
  { href: "/installningar", label: "Inställningar" },
];

export default function AccountHeader({ active }: { active?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-line bg-surface flex-shrink-0">
      <Link href="/dashboard">
        <Logo light={false} />
      </Link>
      <div className="flex items-center gap-8 text-[14.5px] text-ink-dim relative">
        {navLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={active === l.href ? "text-ink font-semibold" : ""}
          >
            {l.label}
          </Link>
        ))}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Kontomeny"
          aria-expanded={menuOpen}
          className="w-[34px] h-[34px] rounded-full bg-accent-soft text-ink flex items-center justify-center font-bold text-[13px]"
        >
          CS
        </button>

        {menuOpen && (
          <div className="absolute top-11 right-0 w-[220px] bg-surface border border-line rounded-xl shadow-[0_12px_30px_rgba(0,0,0,0.12)] p-2 z-20">
            <div className="px-3 py-2.5 border-b border-line mb-1.5">
              <div className="font-semibold text-[13.5px] text-ink">Carl Schnell</div>
              <div className="text-[12px] text-ink-dim mt-0.5">hej@cskb.se</div>
            </div>
            <Link href="/installningar" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] text-ink">
              Inställningar
            </Link>
            <Link href="/fakturering" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] text-ink">
              Fakturering
            </Link>
            <div className="h-px bg-line my-1.5" />
            <Link href="/" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] text-warm">
              Logga ut
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
