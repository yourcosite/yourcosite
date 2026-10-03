import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LABELS, formatKr, planPrice } from "@/lib/pricing";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type SiteRow = { id: string; name: string; domain: string | null; status: string; plan: string };
type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
  sites: SiteRow[];
};

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("profiles")
    .select("id, full_name, email, created_at, sites(id, name, domain, status, plan)")
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  const list = (customers ?? []) as unknown as CustomerRow[];
  const allSites = list.flatMap((c) => c.sites ?? []);
  const liveSites = allSites.filter((s) => s.status === "live");
  const draftSites = allSites.filter((s) => s.status === "draft");
  const mrr = liveSites.reduce((sum, s) => sum + planPrice(s.plan), 0);

  const recent = list.slice(0, 6);
  const waitingToBuild = list.filter((c) => (c.sites ?? []).length === 0).slice(0, 4);

  return (
    <div className="px-11 py-7.5">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6.5">
        <div>
          <h1 className="text-[28px] font-medium font-serif">Översikt</h1>
          <p className="text-[14.5px] text-ink-dim mt-1.5">Hur plattformen mår just nu</p>
        </div>
        <Link
          href="/admin/kunder"
          className="bg-ink text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-lg"
        >
          Visa alla kunder →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4.5 mb-6.5">
        <StatCard label="Aktiva kunder" value={String(list.length)} />
        <StatCard label="MRR" value={formatKr(mrr)} />
        <StatCard
          label="Live-sajter"
          value={`${liveSites.length} / ${allSites.length}`}
          sub={`${draftSites.length} i utkastläge`}
        />
        <StatCard label="Betalande kunder" value={String(liveSites.length)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
        <div className="bg-surface border border-line rounded-2xl p-5.5">
          <div className="flex items-center justify-between mb-3.5">
            <div className="font-semibold text-[15.5px]">Senaste kunderna</div>
            <Link href="/admin/kunder" className="text-[13px] font-semibold">
              Se alla →
            </Link>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-[11.5px] text-ink-dim uppercase tracking-wide">
                <th className="py-1.5 font-semibold border-b border-line">Kund</th>
                <th className="py-1.5 font-semibold border-b border-line">Sajt</th>
                <th className="py-1.5 font-semibold border-b border-line">Status</th>
                <th className="py-1.5 font-semibold border-b border-line">Registrerad</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => {
                const site = c.sites?.[0];
                const status = site?.status === "live" ? "LIVE" : site ? "UTKAST" : "INGEN SAJT";
                const badge =
                  status === "LIVE"
                    ? "bg-[#DCFCE7] text-[#166534]"
                    : status === "UTKAST"
                    ? "bg-[#FDE68A] text-[#7C4A03]"
                    : "bg-line text-ink-dim";
                return (
                  <tr key={c.id} className="text-[13px]">
                    <td className="py-2.5 border-b border-line font-semibold">
                      {c.full_name || c.email}
                    </td>
                    <td className="py-2.5 border-b border-line text-ink-dim">
                      {site?.domain || site?.name || "—"}
                    </td>
                    <td className="py-2.5 border-b border-line">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badge}`}>
                        {status}
                      </span>
                    </td>
                    <td className="py-2.5 border-b border-line text-ink-dim">
                      {formatDate(c.created_at)}
                    </td>
                  </tr>
                );
              })}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-ink-dim text-[13px]">
                    Inga kunder ännu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-5">
          <div className="bg-surface border border-line rounded-2xl p-5.5">
            <div className="font-semibold text-[15.5px] mb-3.5">Fördelning per plan</div>
            <div className="flex flex-col gap-2.5">
              {(["bas", "standard", "premium"] as const).map((plan) => {
                const count = liveSites.filter((s) => s.plan === plan).length;
                const max = Math.max(liveSites.length, 1);
                return (
                  <div key={plan} className="flex items-center gap-3">
                    <span className="text-[12.5px] text-ink-dim w-[72px] flex-shrink-0">
                      {PLAN_LABELS[plan]}
                    </span>
                    <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                    <span className="text-[12.5px] font-semibold w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-surface border border-line rounded-2xl p-5.5 flex-1">
            <div className="font-semibold text-[15.5px] mb-3.5">Väntar på att bygga sin sajt</div>
            <div className="flex flex-col gap-3">
              {waitingToBuild.map((c) => (
                <div key={c.id} className="flex gap-2.5 items-start">
                  <div className="w-2 h-2 rounded-full bg-[#EAB308] mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="text-[13px] font-semibold">{c.full_name || c.email}</div>
                    <div className="text-[12px] text-ink-dim">Har inte påbörjat onboardingen än</div>
                  </div>
                </div>
              ))}
              {waitingToBuild.length === 0 && (
                <p className="text-[13px] text-ink-dim">Alla kunder har kommit igång. 🎉</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface border border-line rounded-[14px] p-5">
      <div className="text-[12px] text-ink-dim uppercase tracking-wide mb-2.5">{label}</div>
      <div className="text-[27px] font-semibold">{value}</div>
      {sub && <div className="text-[12.5px] text-ink-dim mt-1.5">{sub}</div>}
    </div>
  );
}
