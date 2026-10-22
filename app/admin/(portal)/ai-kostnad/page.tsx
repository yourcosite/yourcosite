import { createClient } from "@/lib/supabase/server";
import { USD_SEK } from "@/lib/aiUsage";

export const dynamic = "force-dynamic";

type Row = { created_at: string; user_id: string | null; kind: string; cost_usd: number; input_tokens: number; output_tokens: number };

const KIND_LABELS: Record<string, string> = {
  generate: "Bygge av sajt (onboarding)",
  edit: "Ändring via Millie",
  news: "Nyhetshjälp",
  terms: "Villkorshjälp",
  translate: "Översättning av support",
};

const kr = (usd: number) => `${(usd * USD_SEK).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;

export default async function AdminAiKostnadPage() {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const { data } = await supabase
    .from("ai_usage")
    .select("created_at, user_id, kind, cost_usd, input_tokens, output_tokens")
    .gte("created_at", monthStart)
    .order("created_at", { ascending: false })
    .limit(50000);
  const rows = ((data ?? []) as Row[]).map((r) => ({ ...r, cost_usd: Number(r.cost_usd) }));

  const total = rows.reduce((s, r) => s + r.cost_usd, 0);
  const byKind = new Map<string, { n: number; cost: number }>();
  const byUser = new Map<string, { n: number; edits: number; cost: number }>();
  for (const r of rows) {
    const k = byKind.get(r.kind) ?? { n: 0, cost: 0 };
    k.n++; k.cost += r.cost_usd; byKind.set(r.kind, k);
    if (r.user_id) {
      const u = byUser.get(r.user_id) ?? { n: 0, edits: 0, cost: 0 };
      u.n++; if (r.kind === "edit") u.edits++; u.cost += r.cost_usd; byUser.set(r.user_id, u);
    }
  }
  const topUsers = [...byUser.entries()].sort((a, b) => b[1].cost - a[1].cost).slice(0, 25);
  const ids = topUsers.map(([id]) => id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] as { id: string; full_name: string | null; email: string }[] };
  const nameOf = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name || p.email]));

  const edit = byKind.get("edit");
  const gen = byKind.get("generate");
  const monthName = now.toLocaleDateString("sv-SE", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="px-4 md:px-11 py-6 md:py-7.5">
      <div className="mb-6">
        <h1 className="text-[24px] md:text-[28px] font-medium font-serif">AI-kostnad</h1>
        <p className="text-[14px] text-ink-dim mt-1.5">
          Verklig förbrukning för {monthName}, uträknad från det varje AI-anrop faktiskt använde. Räknat med {USD_SEK} kr per dollar.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card label="Kostnad hittills" value={kr(total)} />
        <Card label="Antal AI-anrop" value={String(rows.length)} />
        <Card label="Snitt per ändring" value={edit ? kr(edit.cost / edit.n) : "–"} />
        <Card label="Snitt per bygge" value={gen ? kr(gen.cost / gen.n) : "–"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-surface border border-line rounded-2xl p-4 md:p-5">
          <div className="font-semibold text-[15px] mb-3">Per typ av anrop</div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] min-w-[360px]">
              <thead>
                <tr className="text-left text-[11.5px] text-ink-dim uppercase tracking-wide">
                  <th className="py-1.5 font-semibold border-b border-line">Typ</th>
                  <th className="py-1.5 font-semibold border-b border-line text-right">Antal</th>
                  <th className="py-1.5 font-semibold border-b border-line text-right">Snitt</th>
                  <th className="py-1.5 font-semibold border-b border-line text-right">Summa</th>
                </tr>
              </thead>
              <tbody>
                {[...byKind.entries()].sort((a, b) => b[1].cost - a[1].cost).map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-2 border-b border-line">{KIND_LABELS[k] ?? k}</td>
                    <td className="py-2 border-b border-line text-right">{v.n}</td>
                    <td className="py-2 border-b border-line text-right">{kr(v.cost / v.n)}</td>
                    <td className="py-2 border-b border-line text-right font-semibold">{kr(v.cost)}</td>
                  </tr>
                ))}
                {byKind.size === 0 && (
                  <tr><td colSpan={4} className="py-4 text-ink-dim">Ingen förbrukning loggad än den här månaden.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-4 md:p-5">
          <div className="font-semibold text-[15px] mb-3">Dyraste kunderna</div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] min-w-[360px]">
              <thead>
                <tr className="text-left text-[11.5px] text-ink-dim uppercase tracking-wide">
                  <th className="py-1.5 font-semibold border-b border-line">Kund</th>
                  <th className="py-1.5 font-semibold border-b border-line text-right">Ändringar</th>
                  <th className="py-1.5 font-semibold border-b border-line text-right">Summa</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map(([id, v]) => (
                  <tr key={id}>
                    <td className="py-2 border-b border-line truncate max-w-[200px]">{nameOf.get(id) ?? "Okänd"}</td>
                    <td className="py-2 border-b border-line text-right">{v.edits}</td>
                    <td className="py-2 border-b border-line text-right font-semibold">{kr(v.cost)}</td>
                  </tr>
                ))}
                {topUsers.length === 0 && (
                  <tr><td colSpan={3} className="py-4 text-ink-dim">Inga kunder än.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-line rounded-2xl p-4">
      <div className="text-[11.5px] text-ink-dim uppercase tracking-wide font-semibold">{label}</div>
      <div className="text-[20px] md:text-[24px] font-semibold font-serif mt-1">{value}</div>
    </div>
  );
}
