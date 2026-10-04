"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CONFIRM_PHRASE = "RADERA";

// Riktig, irreversibel kontoradering — tidigare fanns ingen sida bakom
// "Ta bort konto"-länken i sidomenyn alls (ett dött <a>-tag). Själva
// raderingen (auth.admin.deleteUser) kräver service_role-nyckeln och görs
// därför server-side i /api/account/delete, se den routen — samma mönster
// som admin-portalens kundradering (app/api/admin/customers/[id]/route.ts),
// fast här utan rollkrav: kunden raderar bara sitt EGET konto. Kaskaderar
// automatiskt till sajter, nyheter, besöksstatistik m.m. via FK:erna i
// supabase/schema.sql.
export default function DeleteAccountTab({ siteCount }: { siteCount: number }) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setDeleting(true);

    const res = await fetch("/api/account/delete", { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Något gick fel, kontot kunde inte raderas.");
      setDeleting(false);
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="flex-1 max-w-[560px]">
      <h1 className="text-[28px] font-medium mb-6.5">Ta bort konto</h1>

      <div className="bg-surface border border-warm/40 rounded-2xl p-6 mb-6">
        <div className="font-semibold text-[15px] mb-2 text-warm">Det här går inte att ångra</div>
        <p className="text-[13.5px] text-ink-dim leading-relaxed mb-4">
          Kontot, {siteCount > 0 ? `${siteCount} sajt${siteCount === 1 ? "" : "er"} (inklusive publicerat innehåll),` : "dina sajter,"}{" "}
          allt nyhetsinnehåll och all besöksstatistik raderas permanent. Det går inte att få tillbaka något av detta
          i efterhand.
        </p>
        <label className="block text-[13px] font-semibold mb-1.5">
          Skriv <span className="font-mono">{CONFIRM_PHRASE}</span> för att bekräfta
        </label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px] mb-4"
        />

        {error && <div className="text-[13.5px] text-warm font-medium mb-3">{error}</div>}

        <button
          onClick={handleDelete}
          disabled={confirmText !== CONFIRM_PHRASE || deleting}
          className="bg-warm text-white font-semibold text-[14.5px] px-6.5 py-3 rounded-[10px] disabled:opacity-40"
        >
          {deleting ? "Raderar …" : "Radera kontot permanent"}
        </button>
      </div>
    </div>
  );
}
