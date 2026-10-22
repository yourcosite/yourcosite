import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  created_at: string;
  source: string;
  fingerprint: string;
  message: string;
  stack: string | null;
  url: string | null;
  context: string | null;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", dateStyle: "short", timeStyle: "short" });

export default async function AdminFelPage() {
  const supabase = await createClient();
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("error_log")
    .select("id, created_at, source, fingerprint, message, stack, url, context")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);
  const rows = (data ?? []) as Row[];

  const groups = new Map<string, { last: Row; n: number; day: number }>();
  const dayAgo = Date.now() - 86400000;
  for (const r of rows) {
    const g = groups.get(r.fingerprint);
    const recent = new Date(r.created_at).getTime() > dayAgo ? 1 : 0;
    if (!g) groups.set(r.fingerprint, { last: r, n: 1, day: recent });
    else { g.n++; g.day += recent; }
  }
  const list = [...groups.values()].sort((a, b) => +new Date(b.last.created_at) - +new Date(a.last.created_at));
  const today = rows.filter((r) => new Date(r.created_at).getTime() > dayAgo).length;

  return (
    <div className="px-4 md:px-11 py-7.5">
      <div className="mb-6">
        <h1 className="text-[28px] font-medium font-serif">Fel</h1>
        <p className="text-[14.5px] text-ink-dim mt-1.5">
          Fel från servern och från kundernas webbläsare de senaste 14 dagarna. Samma fel grupperas. Ett larmmejl skickas när ett nytt fel dyker upp.
        </p>
      </div>

      {error && (
        <div className="bg-surface border border-line rounded-2xl p-5 mb-5 text-[13.5px]">
          Kunde inte läsa felloggen. Har tabellen error_log skapats i Supabase? ({error.message})
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-[520px]">
        <div className="bg-surface border border-line rounded-[14px] p-5">
          <div className="text-[12px] text-ink-dim uppercase tracking-wide mb-2">Senaste dygnet</div>
          <div className="text-[22px] font-semibold">{today}</div>
        </div>
        <div className="bg-surface border border-line rounded-[14px] p-5">
          <div className="text-[12px] text-ink-dim uppercase tracking-wide mb-2">Olika fel, 14 dagar</div>
          <div className="text-[22px] font-semibold">{list.length}</div>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-2xl p-5.5">
        {list.length === 0 && !error && (
          <p className="text-[13.5px] text-ink-dim">Inga fel har loggats. Bra.</p>
        )}
        <div className="flex flex-col">
          {list.map(({ last, n, day }) => (
            <details key={last.fingerprint} className="border-b border-line last:border-0 py-3">
              <summary className="cursor-pointer list-none flex flex-col gap-1">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold text-[14px] break-words min-w-0">{last.message}</span>
                  <span className="text-[12px] text-ink-dim whitespace-nowrap">{n} st ({day} senaste dygnet)</span>
                </div>
                <div className="text-[12.5px] text-ink-dim break-words">
                  {last.source === "server" ? "Server" : "Webbläsare"} · {last.context || last.url || "okänd plats"} · senast {fmt(last.created_at)}
                </div>
              </summary>
              <div className="mt-3 text-[12px] text-ink-dim">
                {last.url && <div className="mb-1">Adress: {last.url}</div>}
                {last.stack && (
                  <pre className="overflow-x-auto bg-bg rounded-lg p-3 text-[11.5px] leading-snug whitespace-pre-wrap break-words">{last.stack}</pre>
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
