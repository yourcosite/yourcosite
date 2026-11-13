import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribe } from "@/lib/unsubscribe";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return { title: getT()("Avanmälan"), robots: { index: false } };
}

// Länken i mejlen: slår av tips- och välkomstmejl för kontot. Servicemejl
// (till exempel återställning av lösenord) påverkas inte.
export default async function UnsubscribePage({ searchParams }: { searchParams: { u?: string; t?: string } }) {
  const t = getT();
  const userId = searchParams.u || "";
  const ok = !!userId && verifyUnsubscribe(userId, searchParams.t || "");
  let done = false;
  if (ok) {
    const { error } = await createAdminClient().from("profiles").update({ email_opt_out: true }).eq("id", userId);
    done = !error;
  }
  return (
    <div>
      <Header />
      <section className="bg-surface">
        <div className="max-w-xl mx-auto px-6 py-20 text-center">
          <h1 className="text-[28px] font-medium font-serif mb-3">{done ? t("Du är avanmäld") : t("Länken fungerar inte")}</h1>
          <p className="text-[15px] text-ink-dim">
            {done
              ? t("Du får inga fler tips- och välkomstmejl från oss. Viktiga meddelanden om ditt konto skickas fortfarande.")
              : t("Länken är ogiltig eller har gått ut. Hör av dig till oss så hjälper vi dig.")}
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
