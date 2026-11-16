import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { collectStats } from "@/lib/adminStats";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const nf = (v: number | null | undefined) => (v === null || v === undefined ? "–" : v.toLocaleString("sv-SE"));
function change(cur: number | null | undefined, prev: number | null | undefined) {
  if (cur === null || cur === undefined || prev === null || prev === undefined) return null;
  const d = cur - prev;
  return d === 0 ? "oförändrat" : `${d > 0 ? "+" : ""}${d.toLocaleString("sv-SE")}`;
}

export default async function AdminStatistikPage({ searchParams }: { searchParams: Promise<{ dagar?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["admin", "superadmin"].includes(me.role)) redirect("/admin");

  const sp = await searchParams;
  const days = sp.dagar === "30" ? 30 : 7;
  const d = await collectStats(days);
  const s = d.social;
  const day = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short", timeZone: "Europe/Stockholm" });
  const label = days === 7 ? "veckan före" : "månaden före";

  return (
    <div className="px-4 md:px-11 py-6 md:py-7.5">
      <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] md:text-[28px] font-medium font-serif">Statistik</h1>
          <p className="text-[14px] text-ink-dim mt-1.5">Sajten och våra egna sociala medier, de senaste {days} dagarna.</p>
        </div>
        <div className="flex gap-2 text-[13px]">
          {[7, 30].map((n) => (
            <Link
              key={n}
              href={n === 7 ? "/admin/statistik" : `/admin/statistik?dagar=${n}`}
              className={`px-3.5 py-1.5 rounded-full border font-semibold ${days === n ? "bg-ink text-white border-ink" : "border-line text-ink-dim"}`}
            >
              {n} dagar
            </Link>
          ))}
        </div>
      </div>

      <h2 className="text-[13px] text-ink-dim uppercase tracking-wide font-semibold mb-2">Sajten</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card label="Nya kunder" value={nf(d.customers.fresh)} sub={change(d.customers.fresh, d.customers.prevFresh)} subLabel={label} />
        <Card label="Kunder totalt" value={nf(d.customers.total)} />
        <Card label="Publicerade sajter" value={nf(d.sites.live)} sub={`${nf(d.sites.draft)} byggs`} />
        <Card label="Sidvisningar" value={nf(d.views.now)} sub={change(d.views.now, d.views.prev)} subLabel={label} />
        <Card label="AI-kostnad" value={`${d.aiCostSek.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr`} />
        <Card label="Fel i systemet" value={nf(d.errors)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <div className="bg-surface border border-line rounded-2xl p-4 md:p-5">
          <div className="font-semibold text-[15px] mb-3">Mest besökta sajter</div>
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              {d.views.top.map((t) => (
                <tr key={t.name}>
                  <td className="py-2 border-b border-line">{t.name}</td>
                  <td className="py-2 border-b border-line text-right font-semibold">{nf(t.views)}</td>
                </tr>
              ))}
              {d.views.top.length === 0 && (
                <tr><td className="py-4 text-ink-dim">Inga besök i perioden.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <h2 className="text-[13px] text-ink-dim uppercase tracking-wide font-semibold mb-2">Sociala medier</h2>
      {!s.configured && (
        <div className="bg-surface border border-line rounded-2xl p-4 mb-4 text-[13.5px] text-ink-dim">
          Meta är inte kopplat än. Följare och inläggsstatistik visas när META_PAGE_ID, META_PAGE_TOKEN och META_IG_ID finns i Vercel.
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card label="Facebook, följare" value={nf(s.account?.facebookFollowers)} sub={change(s.account?.facebookFollowers, s.prevAccount?.facebookFollowers)} subLabel={label} />
        <Card label="Instagram, följare" value={nf(s.account?.instagramFollowers)} sub={change(s.account?.instagramFollowers, s.prevAccount?.instagramFollowers)} subLabel={label} />
        <Card label="Instagram, räckvidd 7 dagar" value={nf(s.account?.instagramReach7d)} />
        <Card label="Inlägg publicerade" value={nf(s.posts.length)} />
        <Card label="Väntar på godkännande" value={nf(s.awaiting)} />
        <Card label="Godkända, schemalagda" value={nf(s.approved)} />
        {s.failed > 0 && <Card label="Misslyckade inlägg" value={nf(s.failed)} />}
      </div>

      <div className="bg-surface border border-line rounded-2xl p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-[15px]">Publicerade inlägg</div>
          <Link href="/admin/sociala-medier" className="text-[13px] text-ink-dim underline">Sociala medier</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px] min-w-[620px]">
            <thead>
              <tr className="text-left text-[11.5px] text-ink-dim uppercase tracking-wide">
                <th className="py-1.5 font-semibold border-b border-line">Inlägg</th>
                <th className="py-1.5 font-semibold border-b border-line">Datum</th>
                <th className="py-1.5 font-semibold border-b border-line text-right">FB reaktioner</th>
                <th className="py-1.5 font-semibold border-b border-line text-right">FB kommentarer</th>
                <th className="py-1.5 font-semibold border-b border-line text-right">IG gillningar</th>
                <th className="py-1.5 font-semibold border-b border-line text-right">IG räckvidd</th>
              </tr>
            </thead>
            <tbody>
              {s.posts.map((p, i) => (
                <tr key={i}>
                  <td className="py-2 border-b border-line">
                    {p.caption}
                    {p.error && <div className="text-[12px] text-red-600">{p.error}</div>}
                  </td>
                  <td className="py-2 border-b border-line whitespace-nowrap">{day(p.publishedAt)}</td>
                  <td className="py-2 border-b border-line text-right">{nf(p.stats.facebook?.reactions)}</td>
                  <td className="py-2 border-b border-line text-right">{nf(p.stats.facebook?.comments)}</td>
                  <td className="py-2 border-b border-line text-right">{nf(p.stats.instagram?.likes)}</td>
                  <td className="py-2 border-b border-line text-right">{nf(p.stats.instagram?.reach)}</td>
                </tr>
              ))}
              {s.posts.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-ink-dim">Inga inlägg publicerades i perioden.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[12px] text-ink-dim mt-3">Ett streck betyder att Meta inte lämnade ut siffran, vanligen för att rättigheten för statistik saknas på åtkomstnyckeln.</p>
      </div>
    </div>
  );
}

function Card({ label, value, sub, subLabel }: { label: string; value: string; sub?: string | null; subLabel?: string }) {
  return (
    <div className="bg-surface border border-line rounded-2xl p-4">
      <div className="text-[11.5px] text-ink-dim uppercase tracking-wide font-semibold">{label}</div>
      <div className="text-[20px] md:text-[24px] font-semibold font-serif mt-1">{value}</div>
      {sub ? <div className="text-[12px] text-ink-dim mt-0.5">{sub}{subLabel ? ` mot ${subLabel}` : ""}</div> : null}
    </div>
  );
}
