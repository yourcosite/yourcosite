import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminActivityPage() {
  const supabase = await createClient();

  const { data: log } = await supabase
    .from("admin_activity_log")
    .select("id, actor_name, action, target_type, target_id, target_label, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const entries = log ?? [];

  return (
    <div className="px-11 py-7.5">
      <div className="mb-6.5">
        <h1 className="text-[28px] font-medium font-serif">Aktivitet</h1>
        <p className="text-[14.5px] text-ink-dim mt-1.5">
          Vad admin-teamet har gjort, senaste 100 händelserna.
        </p>
      </div>

      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[12px] text-ink-dim uppercase tracking-wide bg-bg">
              <th className="py-3 px-5 font-semibold">Vem</th>
              <th className="py-3 px-5 font-semibold">Vad</th>
              <th className="py-3 px-5 font-semibold">Gällde</th>
              <th className="py-3 px-5 font-semibold">När</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="text-[13.5px] border-t border-line">
                <td className="py-3 px-5 font-semibold whitespace-nowrap">{e.actor_name}</td>
                <td className="py-3 px-5 text-ink-dim">{e.action}</td>
                <td className="py-3 px-5">
                  {e.target_type === "customer" && e.target_id ? (
                    <Link href={`/admin/kunder/${e.target_id}`} className="font-semibold hover:underline">
                      {e.target_label}
                    </Link>
                  ) : (
                    <span className="font-semibold">{e.target_label || "—"}</span>
                  )}
                </td>
                <td className="py-3 px-5 text-ink-dim whitespace-nowrap">{formatDateTime(e.created_at)}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 px-5 text-center text-ink-dim text-[13.5px]">
                  Ingen aktivitet loggad än.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
