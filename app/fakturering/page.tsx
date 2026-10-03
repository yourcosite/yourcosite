import Link from "next/link";
import AccountHeader from "@/components/AccountHeader";
import { createClient } from "@/lib/supabase/server";

const invoices = [
  { date: "1 oktober 2026", amount: "249 kr", status: "Betald" },
  { date: "1 september 2026", amount: "249 kr", status: "Betald" },
  { date: "1 augusti 2026", amount: "249 kr", status: "Betald" },
  { date: "1 juli 2026", amount: "249 kr", status: "Betald" },
];

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let userName = "Ditt konto";
  const userEmail = user?.email ?? "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    userName = profile?.full_name || userEmail;
  }

  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <AccountHeader active="/fakturering" userName={userName} userEmail={userEmail} />

      <div className="flex-1 px-6 md:px-12 py-10">
        <h1 className="text-[30px] font-medium mb-7">Fakturering</h1>

        <div className="grid md:grid-cols-[1.3fr_1fr] gap-6 mb-7">
          <div className="bg-surface border border-line rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4.5">
              <div>
                <div className="text-[12.5px] text-ink-dim uppercase tracking-wide">
                  Nuvarande plan
                </div>
                <div className="font-semibold text-[20px] mt-1">
                  Standardplan — 249 kr/mån
                </div>
              </div>
              <Link
                href="/priser"
                className="bg-accent text-accent-ink font-semibold text-[13.5px] px-4.5 py-2.5 rounded-lg"
              >
                Uppgradera
              </Link>
            </div>

            <div className="flex justify-between text-[13px] text-ink-dim mb-1.5">
              <span>Ändringar denna period</span>
              <span>38 av 60</span>
            </div>
            <div className="h-2 rounded-full bg-bg overflow-hidden">
              <div className="h-full bg-accent" style={{ width: "63%" }} />
            </div>
            <div className="text-[12.5px] text-ink-dim mt-2">
              Nästa betalning dras 1 november 2026
            </div>

            <div className="mt-4.5 pt-4 border-t border-line flex items-center justify-between">
              <div>
                <div className="text-[13px] font-semibold">
                  Uppsägningstid: 3 månader, löpande
                </div>
                <div className="text-[12px] text-ink-dim mt-0.5">
                  Ingen bindningstid i block — säger du upp idag avslutas
                  tjänsten exakt 3 månader senare, oavsett när i månaden du
                  gör det.
                </div>
              </div>
              <Link
                href="/anvandarvillkor"
                className="text-[12.5px] font-semibold text-ink underline flex-shrink-0 ml-4"
              >
                Prenumerationsvillkor
              </Link>
            </div>
          </div>

          <div className="bg-surface border border-line rounded-2xl p-6">
            <div className="text-[12.5px] text-ink-dim uppercase tracking-wide mb-3.5">
              Betalmetod
            </div>
            <div className="flex items-center gap-3 mb-3.5">
              <div className="w-10 h-7 rounded-[5px] bg-ink flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-[14px]">Visa •••• 4242</div>
                <div className="text-[12px] text-ink-dim">Utgår 08/28</div>
              </div>
            </div>
            <a href="#" className="text-[13.5px] font-semibold text-ink">
              Byt betalkort
            </a>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6">
          <div className="font-semibold text-[16px] mb-4">Fakturor</div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-[12.5px] text-ink-dim uppercase tracking-wide">
                <th className="py-2 font-semibold border-b border-line">Datum</th>
                <th className="py-2 font-semibold border-b border-line">Belopp</th>
                <th className="py-2 font-semibold border-b border-line">Status</th>
                <th className="py-2 font-semibold border-b border-line" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.date} className="text-[13.5px]">
                  <td className="py-3 border-b border-line">{inv.date}</td>
                  <td className="py-3 border-b border-line">{inv.amount}</td>
                  <td className="py-3 border-b border-line">
                    <span className="bg-[#DCFCE7] text-[#166534] text-[11.5px] font-bold px-2.5 py-1 rounded-full">
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 border-b border-line text-right">
                    <a href="#" className="text-ink font-semibold text-[13px]">
                      Ladda ner
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
