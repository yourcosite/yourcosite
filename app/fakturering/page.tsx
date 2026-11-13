import { getT, getLocale } from "@/lib/i18n/server";
import { formatMoney, planPrice } from "@/lib/pricing";
import { billingCurrencyFor } from "@/lib/i18n/country";
import Link from "next/link";
import AccountHeader from "@/components/AccountHeader";
import { createClient } from "@/lib/supabase/server";

export default async function BillingPage() {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const locale = getLocale();
  let userName = t("Ditt konto");
  let country: string | null = null;
  let billingEmail = "";
  let exempt = false;
  const userEmail = user?.email ?? "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    userName = profile?.full_name || userEmail;
    // Ny kolumn (supabase/sprak.sql): hämtas separat så sidan funkar även utan den.
    const { data: c } = await supabase.from("profiles").select("country").eq("id", user.id).single();
    country = c?.country ?? null;
    const { data: b } = await supabase.from("profiles").select("billing_email, email").eq("id", user.id).single();
    billingEmail = b?.billing_email || b?.email || userEmail;
    // Ny kolumn (supabase/andringar-spark.sql): hämtas separat så sidan funkar även utan den.
    const { data: ex } = await supabase.from("profiles").select("billing_exempt").eq("id", user.id).maybeSingle();
    exempt = !!ex?.billing_exempt;
  }

  const currency = billingCurrencyFor(country);
  const price = formatMoney(planPrice("bas", currency), currency, locale);

  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <AccountHeader active="/fakturering" userName={userName} userEmail={userEmail} />

      <div className="flex-1 px-6 md:px-12 py-10">
        <h1 className="text-[30px] font-medium mb-7">{t("Fakturering")}</h1>

        <div className="grid md:grid-cols-[1.3fr_1fr] gap-6 mb-7">
          <div className="bg-surface border border-line rounded-2xl p-6">
            <div className="text-[12.5px] text-ink-dim uppercase tracking-wide">
              {t("Nuvarande plan")}
            </div>
            <div className="font-semibold text-[20px] mt-1">
              {exempt ? t("Ditt konto är kostnadsfritt") : t("Paket — {price}/mån", { price })}
            </div>
            <p className="text-[13px] text-ink-dim mt-2">
              {exempt
                ? t("Du faktureras inte för det här kontot.")
                : t("Alla priser exkl. moms. Tillägg (extra ändringar, språk, sajter) faktureras tillsammans med paketet.")}
            </p>
            {!exempt && (
              <div className="mt-4">
                <Link
                  href="/priser"
                  className="inline-block bg-accent text-accent-ink font-semibold text-[13.5px] px-4.5 py-2.5 rounded-lg"
                >
                  {t("Se priser och tillägg")}
                </Link>
              </div>
            )}

            <div className="mt-4.5 pt-4 border-t border-line flex items-center justify-between">
              <div>
                <div className="text-[13px] font-semibold">
                  {t("Uppsägningstid: 3 månader, löpande")}
                </div>
                <div className="text-[12px] text-ink-dim mt-0.5">
                  {t("Ingen bindningstid i block — säger du upp idag avslutas tjänsten exakt 3 månader senare, oavsett när i månaden du gör det.")}
                </div>
              </div>
              <Link
                href="/anvandarvillkor"
                className="text-[12.5px] font-semibold text-ink underline flex-shrink-0 ml-4"
              >
                {t("Prenumerationsvillkor")}
              </Link>
            </div>
          </div>

          <div className="bg-surface border border-line rounded-2xl p-6">
            <div className="text-[12.5px] text-ink-dim uppercase tracking-wide mb-3.5">
              {t("Betalning")}
            </div>
            {exempt ? (
              <p className="text-[13.5px]">{t("Ingen betalning behövs.")}</p>
            ) : (
              <>
                <div className="font-semibold text-[14px] mb-1">{t("Faktura en gång i månaden")}</div>
                <p className="text-[12.5px] text-ink-dim">
                  {t("Fakturan skickas till {email}. Behöver du ändra faktureringsadress eller e-post, hör av dig till oss.", { email: billingEmail })}
                </p>
                <Link href="/kontakt" className="inline-block mt-3 text-[13.5px] font-semibold text-ink">
                  {t("Kontakta oss")}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
