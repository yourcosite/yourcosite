"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type StaffRole = "support" | "admin" | "superadmin";

const ROLE_BADGE: Record<StaffRole, string> = {
  support: "Support",
  admin: "Admin",
  superadmin: "Superadmin",
};

const NAV_ITEMS: { href: string; label: string; roles: StaffRole[]; icon: (c: string) => React.ReactNode }[] = [
  {
    href: "/admin",
    label: "Översikt",
    roles: ["support", "admin", "superadmin"],
    icon: (c: string) => (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/admin/kunder",
    label: "Kunder",
    roles: ["support", "admin", "superadmin"],
    icon: (c: string) => (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/admin/ekonomi",
    label: "Ekonomi",
    roles: ["admin", "superadmin"],
    icon: (c: string) => (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9.5 9.8c0-1.3 1.2-2.3 2.5-2.3s2.5.8 2.5 2c0 2.5-5 1.5-5 4 0 1.2 1.2 2 2.5 2s2.5-1 2.5-2.3" />
      </svg>
    ),
  },
  {
    href: "/admin/team",
    label: "Team",
    roles: ["superadmin"],
    icon: (c: string) => (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="16" y1="11" x2="22" y2="11" />
      </svg>
    ),
  },
];

function initialsOf(name: string, email: string) {
  const base = name?.trim() || email;
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export default function AdminSidebar({
  adminName,
  adminEmail,
  role,
}: {
  adminName?: string;
  adminEmail?: string;
  role?: StaffRole;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="w-[232px] flex-shrink-0 bg-[#0E0E10] text-white flex flex-col py-6">
      <Link href="/admin" className="flex items-center gap-2.5 px-5 mb-1.5">
        <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
          <rect x="2" y="4" width="28" height="18" rx="7" fill="#C6FF5E" />
          <path d="M10 22 L10 29 L17 22 Z" fill="#C6FF5E" />
          <circle cx="11" cy="13" r="1.6" fill="#0C1004" />
          <circle cx="16" cy="13" r="1.6" fill="#0C1004" />
          <circle cx="21" cy="13" r="1.6" fill="#0C1004" />
        </svg>
        <span className="font-serif font-semibold text-[16px] text-white">YourCoSite</span>
      </Link>
      <div className="px-5 mb-6">
        <span className="text-[10px] font-bold tracking-wide uppercase text-accent bg-accent/15 px-2 py-1 rounded-full">
          Admin
        </span>
      </div>

      <nav className="px-3 flex-1">
        {NAV_ITEMS.filter((item) => !role || item.roles.includes(role)).map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          const color = active ? "#C6FF5E" : "#8C8A93";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[13.5px] mb-0.5 ${
                active ? "font-semibold text-white bg-accent/15" : "font-medium text-[#B5B3AE]"
              }`}
            >
              {item.icon(color)}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[13.5px] font-medium text-warm"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#E8714A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logga ut
        </button>
      </div>

      <div className="px-5 pt-4 mt-3.5 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#26262B] flex items-center justify-center font-bold text-[12px] text-accent flex-shrink-0">
            {initialsOf(adminName ?? "", adminEmail ?? "")}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-white truncate">
              {adminName || "Admin"}
            </div>
            <div className="text-[11px] text-[#8C8A86] truncate">
              {role ? ROLE_BADGE[role] : adminEmail}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
