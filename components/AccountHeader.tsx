"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "./Logo";
import ContactSupportModal from "./ContactSupportModal";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/dashboard", label: "Sajter" },
  { href: "/statistik", label: "Statistik" },
  { href: "/fakturering", label: "Fakturering" },
  { href: "/installningar", label: "Inställningar" },
];

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AccountHeader({
  active,
  userName = "Ditt konto",
  userEmail = "",
}: {
  active?: string;
  userName?: string;
  userEmail?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex items-center justify-between px-5 md:px-12 py-4 md:py-5 border-b border-line bg-surface flex-shrink-0">
      <Link href="/dashboard">
        <Logo light={false} />
      </Link>
      <div className="flex items-center gap-8 text-[14.5px] text-ink-dim relative">
        {/* Navlänkarna får inte plats bredvid kontoknappen under md — där
            visas de istället överst i kontomenyn (se nedan), så all
            navigering fortfarande nås via EN knapp istället för att klämma
            in en egen hamburgermeny också. */}
        {navLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`hidden md:inline ${active === l.href ? "text-ink font-semibold" : ""}`}
          >
            {l.label}
          </Link>
        ))}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Kontomeny"
          aria-expanded={menuOpen}
          className="w-[34px] h-[34px] rounded-full bg-accent-soft text-ink flex items-center justify-center font-bold text-[13px] flex-shrink-0"
        >
          {initialsOf(userName)}
        </button>

        {menuOpen && (
          <div className="absolute top-11 right-0 w-[220px] bg-surface border border-line rounded-xl shadow-[0_12px_30px_rgba(0,0,0,0.12)] p-2 z-20">
            <div className="px-3 py-2.5 border-b border-line mb-1.5">
              <div className="font-semibold text-[13.5px] text-ink">{userName}</div>
              {userEmail && (
                <div className="text-[12px] text-ink-dim mt-0.5">{userEmail}</div>
              )}
            </div>
            {/* Bara på mobilen, där raden ovan är dold — annars skulle
                Sajter/Statistik stå dubbelt i både headern och menyn. */}
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={`md:hidden flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] ${
                  active === l.href ? "text-ink font-semibold" : "text-ink"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="md:hidden h-px bg-line my-1.5" />
            <button
              onClick={() => {
                setMenuOpen(false);
                setContactOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] text-ink text-left"
            >
              Kontakta oss
            </button>
            <div className="h-px bg-line my-1.5" />
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] text-warm text-left disabled:opacity-60"
            >
              {loggingOut ? "Loggar ut …" : "Logga ut"}
            </button>
          </div>
        )}
      </div>

      <ContactSupportModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        source="konto"
        intro="Fråga oss något, eller skicka in ett önskemål om något du vill kunna göra eller ändra på din sajt."
      />
    </div>
  );
}
