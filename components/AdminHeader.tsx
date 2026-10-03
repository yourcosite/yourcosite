"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "./Logo";
import { createClient } from "@/lib/supabase/client";

export default function AdminHeader({ adminEmail }: { adminEmail?: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-line bg-ink flex-shrink-0">
      <Link href="/admin" className="flex items-center gap-2.5">
        <Logo />
        <span className="text-[12px] font-bold text-[#9E9C97] tracking-wide uppercase">
          Admin
        </span>
      </Link>
      <div className="flex items-center gap-5 text-[13.5px] text-[#C9C7C2]">
        {adminEmail && <span>{adminEmail}</span>}
        <button
          onClick={handleLogout}
          className="font-semibold text-white border border-white/20 px-3.5 py-1.5 rounded-lg"
        >
          Logga ut
        </button>
      </div>
    </div>
  );
}
