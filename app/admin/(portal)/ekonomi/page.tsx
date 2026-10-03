import { createClient } from "@/lib/supabase/server";
import { PLAN_LABELS, formatKr, planPrice } from "@/lib/pricing";

type SiteRow = { id: string; name: string; domain: string | null; status: string; plan: string };
type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string;
  sites: SiteRow[];
};

export default async function AdminEkonomiPage() {
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("profiles")
    .select("id, full_name, email, sites(id, name, domain, status, plan)")
    .eq("role", "customer");

  const list = (customers ?? []) as unknown as CustomerRow[];

  const payingCustomers = list
    .map((c) => ({ customer: c, site: (c.sites ?? []).find((s) => s.status === "live") }))
    .filter((x) => x.site) as { customer: CustomerRow; site: SiteRow }[];

  const waiting = list.filter((c) => !(c.sites ?? []).some((s) => s.status === "live"));

  const mrr = payingCustomers.reduce((sum, x) => sum + planPrice(x.site.plan), 0);
  const arr = mrr * 12;
  const arpu = payingCustomers.length ? Math.round(mrr / payingCustomers.length) : 0;

  const planCounts = (["bas", "standard", "premium"] as const).map((plan) => ({
    plan,
    count: payingCustomers.filter((x) => x.site.plan === plan).length,
  }));

  return (
    <div className="px-11 py-7.5">
      <div className="mb-6.5">
        <h1 className="text-[28px] font-medium font-serif">Ekonomi</h1>
        <p className="text-[14.5px] text-ink-dim mt-1.5">
          Beräknat från dina kunders aktiva planer — riktiga betalningar och kvitton kopplas
          in automatiskt när Stripe är aktiverat.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4.5 mb-6.5">
        <StatCard label="MRR" value={formatKr(mrr)} />
        <StatCard label="ARR" value={formatKr(arr)} />
        <StatCard label="Betalande kunder" value={String(payingCustomers.length)} />
        <StatCard label="Snitt / kund (ARPU)" value={formatKr(arpu)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5">
        <div className="bg-surface border border-line rounded-2xl p-5.5">
          <div className="font-semibold text-[15.5px] mb-4">Betalande kunder och deras plan</div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-[11.5px] text-ink-dim uppercase tracking-wide">
                <th className="py-1.5 font-semibold border-b border-line">Kund</th>
                <th className="py-1.5 font-semibold border-b border-line">Plan</th>
                <th className="py-1.5 font-semibold border-b border-line">Belopp / mån</th>
              </tr>
            </thead>
            <tbody>
              {payingCustomers.map(({ customer, site }) => (
                <tr key={customer.id} className="text-[13px]">
                  <td className="py-2.5 border-b border-line font-semibold">
                    {customer.full_name || customer.email}
                  </td>
                  <td className="py-2.5 border-b border-line text-ink-dim">
                    {PLAN_LABELS[site.plan] ?? site.plan}
                  </td>
                  <td className="py-2.5 border-b border-line font-semibold">
                    {formatKr(planPrice(site.plan))}
                  </td>
                </tr>
              ))}
              {payingCustomers.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-ink-dim text-[13px]">
                    Inga betalande kunder ännu.
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
              {planCounts.map(({ plan, count }) => {
                const max = Math.max(payingCustomers.length, 1);
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
            <div className="font-semibold text-[15.5px] mb-3.5">Väntar på att bli betalande</div>
            <div className="flex flex-col gap-2.5">
              {waiting.slice(0, 6).map((c) => (
                <div key={c.id} className="text-[13px]">
                  <span className="font-semibold">{c.full_name || c.email}</span>
                  <span className="text-ink-dim">
                    {" — "}
                    {(c.sites ?? []).length > 0 ? "sajt i utkastläge" : "ingen sajt ännu"}
                  </span>
                </div>
              ))}
              {waiting.length === 0 && (
                <p className="text-[13px] text-ink-dim">Alla kunder betalar. 🎉</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-line rounded-[14px] p-5">
      <div className="text-[12px] text-ink-dim uppercase tracking-wide mb-2.5">{label}</div>
      <div className="text-[22px] font-semibold">{value}</div>
    </div>
  );
}
