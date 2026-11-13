"use client";

import Link from "next/link";
import { useState } from "react";

type Order = {
  id: string;
  kind: string;
  label: string;
  created_at: string;
  handled_at: string | null;
  user_id: string;
  customer: { full_name: string | null; email: string } | null;
  site: { name: string } | null;
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function BestallningarClient({ initial, missingTable }: { initial: Order[]; missingTable: boolean }) {
  const [orders, setOrders] = useState(initial);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const open = orders.filter((o) => !o.handled_at);
  const done = orders.filter((o) => o.handled_at);

  const handle = async (id: string, handled: boolean) => {
    setBusy(id);
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handled }),
    });
    if (res.ok) {
      const d = await res.json().catch(() => ({}));
      setOrders((os) => os.map((o) => (o.id === id ? { ...o, handled_at: handled ? new Date().toISOString() : null } : o)));
      if (handled) setNotice(d.emailed ? "Markerad som hanterad. Kunden har fått ett mejl om att tillägget är klart." : "Markerad som hanterad, men mejlet till kunden gick inte att skicka.");
      else setNotice("");
    }
    setBusy("");
  };

  const row = (o: Order, isOpen: boolean) => (
    <div key={o.id} className="bg-surface border border-line rounded-xl p-4 flex items-center gap-4 flex-wrap">
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[14.5px]">{o.label}</div>
        <div className="text-[13px] text-ink-dim mt-0.5">
          {o.customer?.full_name || o.customer?.email || "Okänd kund"}
          {o.customer?.full_name && o.customer?.email ? ` (${o.customer.email})` : ""}
          {o.site?.name ? ` · ${o.site.name}` : ""} · {when(o.created_at)}
        </div>
      </div>
      <Link href={`/admin/kunder/${o.user_id}`} className="text-[13px] font-semibold border border-line rounded-lg px-3.5 py-2">Öppna kunden</Link>
      <button
        type="button"
        disabled={busy === o.id}
        onClick={() => handle(o.id, isOpen)}
        className={`text-[13px] font-semibold rounded-lg px-3.5 py-2 disabled:opacity-60 ${isOpen ? "bg-accent text-accent-ink" : "border border-line text-ink-dim"}`}
      >
        {isOpen ? "Hanterad, meddela kunden" : "Ångra"}
      </button>
    </div>
  );

  return (
    <div className="px-4 md:px-11 py-7.5">
      <h1 className="text-[28px] font-medium font-serif">Beställningar</h1>
      <p className="text-[14.5px] text-ink-dim mt-1.5 mb-6">
        Tillägg som kunder har beställt (extra sajt, fler ändringar, språk). Lägg in tillägget på kunden och klicka sedan på Hanterad, så får kunden ett mejl om att det är klart.
      </p>
      {missingTable && (
        <p className="text-[13.5px] bg-[#FEF3C7] text-[#92400E] rounded-lg px-4 py-3 mb-5">
          Tabellen för beställningar saknas. Kör SQL-blocket sist i supabase/andringar-spark.sql i Supabase.
        </p>
      )}
      {notice && <p className="text-[13.5px] bg-accent-soft border border-accent rounded-lg px-4 py-3 mb-5">{notice}</p>}
      <div className="text-[12px] text-ink-dim uppercase tracking-wide mb-2">Att hantera ({open.length})</div>
      <div className="flex flex-col gap-3 mb-8">
        {open.map((o) => row(o, true))}
        {open.length === 0 && <p className="text-[13.5px] text-ink-dim">Inga nya beställningar.</p>}
      </div>
      {done.length > 0 && (
        <>
          <div className="text-[12px] text-ink-dim uppercase tracking-wide mb-2">Hanterade</div>
          <div className="flex flex-col gap-3">{done.map((o) => row(o, false))}</div>
        </>
      )}
    </div>
  );
}
