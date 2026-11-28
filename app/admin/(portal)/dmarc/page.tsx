import { createClient } from "@/lib/supabase/server";
import type { DmarcRow } from "@/lib/dmarc";

export const dynamic = "force-dynamic";

type Rep = {
  id: string;
  report_id: string;
  org_name: string;
  domain: string;
  date_begin: string;
  date_end: string;
  policy: string | null;
  total: number;
  passed: number;
  failed: number;
  rows: DmarcRow[];
};

const day = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });

export default async function AdminDmarcPage() {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("dmarc_reports")
    .select("id, report_id, org_name, domain, date_begin, date_end, policy, total, passed, failed, rows")
    .gte("date_end", since)
    .order("date_end", { ascending: false })
    .limit(500);
  const reps = (data ?? []) as Rep[];

  const total = reps.reduce((a, r) => a + r.total, 0);
  const passed = reps.reduce((a, r) => a + r.passed, 0);
  const failed = total - passed;
  const pct = total ? Math.round((passed / total) * 1000) / 10 : 0;

  // Misslyckade avsändare (IP) över alla rapporter
  const bad = new Map<string, { n: number; orgs: Set<string>; from: string }>();
  for (const r of reps)
    for (const row of r.rows ?? []) {
      if (row.dkim === "pass" || row.spf === "pass") continue;
      const g = bad.get(row.ip) ?? { n: 0, orgs: new Set<string>(), from: row.headerFrom };
      g.n += row.count;
      g.orgs.add(r.org_name);
      bad.set(row.ip, g);
    }
  const badList = [...bad.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 15);

  // Per dag
  const perDay = new Map<string, { t: number; p: number }>();
  for (const r of reps) {
    const d = day(r.date_end);
    const g = perDay.get(d) ?? { t: 0, p: 0 };
    g.t += r.total;
    g.p += r.passed;
    perDay.set(d, g);
  }
  const days = [...perDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <div className="px-4 md:px-11 py-7.5">
      <div className="mb-6">
        <h1 className="text-[28px] font-medium font-serif">DMARC</h1>
        <p className="text-[14.5px] text-ink-dim mt-1.5 max-w-[640px]">
          Mejlmottagare som Google, Microsoft och Yahoo skickar dagliga rapporter om hur mejl i din domäns namn har klarat kontrollerna. Här ser du sammanfattningen de senaste 30 dagarna, så du slipper mejlen.
        </p>
      </div>

      {error && (
        <div className="bg-surface border border-line rounded-2xl p-5 mb-5 text-[13.5px]">
          Kunde inte läsa rapporterna. Har tabellen dmarc_reports skapats i Supabase? ({error.message})
        </div>
      )}

      {!error && reps.length === 0 && (
        <div className="bg-surface border border-line rounded-2xl p-5 mb-5 text-[13.5px] max-w-[640px]">
          Inga rapporter har kommit in ännu. De första dyker normalt upp inom ett dygn efter att DNS-posten (rua) pekar hit.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 max-w-[860px]">
        {[
          ["Rapporter", String(reps.length)],
          ["Mejl granskade", String(total)],
          ["Godkända", total ? `${pct} %` : "–"],
          ["Underkända", String(failed)],
        ].map(([l, v]) => (
          <div key={l} className="bg-surface border border-line rounded-[14px] p-5">
            <div className="text-[12px] text-ink-dim uppercase tracking-wide mb-2">{l}</div>
            <div className="text-[22px] font-semibold">{v}</div>
          </div>
        ))}
      </div>

      {badList.length > 0 && (
        <section className="mb-8 max-w-[860px]">
          <h2 className="text-[16px] font-medium mb-1">Underkända avsändare</h2>
          <p className="text-[13px] text-ink-dim mb-3">
            Mejl som skickats i din domäns namn men inte klarade SPF eller DKIM. Känner du inte igen IP-adressen kan det vara förfalskade mejl. Känner du igen den (t.ex. ett nyhetsbrevsverktyg) behöver den läggas in i SPF/DKIM.
          </p>
          <div className="bg-surface border border-line rounded-2xl overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left text-ink-dim text-[12px]">
                  <th className="px-4 py-2.5 font-medium">IP-adress</th>
                  <th className="px-4 py-2.5 font-medium">Antal</th>
                  <th className="px-4 py-2.5 font-medium">Sett hos</th>
                </tr>
              </thead>
              <tbody>
                {badList.map(([ip, g]) => (
                  <tr key={ip} className="border-t border-line">
                    <td className="px-4 py-2.5 font-mono">{ip}</td>
                    <td className="px-4 py-2.5">{g.n}</td>
                    <td className="px-4 py-2.5">{[...g.orgs].join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {days.length > 0 && (
        <section className="mb-8 max-w-[860px]">
          <h2 className="text-[16px] font-medium mb-3">Per dag</h2>
          <div className="bg-surface border border-line rounded-2xl overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left text-ink-dim text-[12px]">
                  <th className="px-4 py-2.5 font-medium">Datum</th>
                  <th className="px-4 py-2.5 font-medium">Mejl</th>
                  <th className="px-4 py-2.5 font-medium">Godkända</th>
                </tr>
              </thead>
              <tbody>
                {days.map(([d, g]) => (
                  <tr key={d} className="border-t border-line">
                    <td className="px-4 py-2.5">{d}</td>
                    <td className="px-4 py-2.5">{g.t}</td>
                    <td className="px-4 py-2.5">{g.t ? Math.round((g.p / g.t) * 1000) / 10 : 0} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {reps.length > 0 && (
        <section className="max-w-[860px]">
          <h2 className="text-[16px] font-medium mb-3">Alla rapporter</h2>
          <div className="bg-surface border border-line rounded-2xl overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left text-ink-dim text-[12px]">
                  <th className="px-4 py-2.5 font-medium">Från</th>
                  <th className="px-4 py-2.5 font-medium">Domän</th>
                  <th className="px-4 py-2.5 font-medium">Period</th>
                  <th className="px-4 py-2.5 font-medium">Mejl</th>
                  <th className="px-4 py-2.5 font-medium">Underkända</th>
                  <th className="px-4 py-2.5 font-medium">Policy</th>
                </tr>
              </thead>
              <tbody>
                {reps.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="px-4 py-2.5">{r.org_name}</td>
                    <td className="px-4 py-2.5">{r.domain}</td>
                    <td className="px-4 py-2.5">{day(r.date_begin)}</td>
                    <td className="px-4 py-2.5">{r.total}</td>
                    <td className={`px-4 py-2.5 ${r.failed ? "text-red-600 font-medium" : ""}`}>{r.failed}</td>
                    <td className="px-4 py-2.5">{r.policy ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
