import { getT, getLocale } from "@/lib/i18n/server";
import { BCP47 } from "@/lib/i18n/country";
import AccountHeader from "@/components/AccountHeader";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Kundens egen supporthistorik: det de skrivit till oss och svaren de fått,
// på det språk de själva använder. Kräver supabase/sprak.sql (RLS som låter
// kunden läsa sina egna rader).
export default async function SupportHistoryPage() {
  const t = getT();
  const locale = getLocale();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/logga-in");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const userEmail = user.email ?? "";
  const userName = profile?.full_name || userEmail;

  let messages: any[] = [];
  let replies: any[] = [];
  const m = await supabase
    .from("support_messages")
    .select("id, message, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  messages = m.data ?? [];
  const r = await supabase
    .from("support_replies")
    .select("id, message_id, body_sent, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  replies = r.data ?? [];

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(BCP47[locale] ?? locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Stockholm" }).format(new Date(iso));

  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <AccountHeader active="/support" userName={userName} userEmail={userEmail} />
      <div className="flex-1 px-6 md:px-12 py-10 max-w-[760px]">
        <h1 className="text-[30px] font-medium mb-2">{t("Din supporthistorik")}</h1>
        <p className="text-ink-dim text-[14.5px] mb-7">
          {t("Här ser du allt du skrivit till supporten och svaren du fått. Vill du skriva till oss igen väljer du Kontakta oss i kontomenyn.")}
        </p>
        {messages.length === 0 && (
          <div className="bg-surface border border-line rounded-2xl p-6 text-ink-dim">{t("Du har inte skrivit till supporten än.")}</div>
        )}
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-surface border border-line rounded-2xl p-5">
              <div className="flex items-center justify-between text-[12.5px] text-ink-dim mb-2">
                <span>{fmt(msg.created_at)}</span>
                <span>{msg.status === "klar" ? t("Besvarad") : t("Väntar på svar")}</span>
              </div>
              <div className="whitespace-pre-wrap text-[14.5px]">{msg.message}</div>
              {replies.filter((x) => x.message_id === msg.id).map((rep) => (
                <div key={rep.id} className="mt-3 border-l-2 border-accent pl-4">
                  <div className="text-[12.5px] text-ink-dim mb-1">{t("Svar från supporten")} · {fmt(rep.created_at)}</div>
                  <div className="whitespace-pre-wrap text-[14.5px]">{rep.body_sent}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
