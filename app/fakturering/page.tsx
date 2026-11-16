import { getT, getLocale } from "@/lib/i18n/server";
import { formatMoney, planPrice } from "@/lib/pricing";
import { billingCurrencyFor } from "@/lib/i18n/country";
import Link from "next/link";
import AccountHeader from "@/components/AccountHeader";
import { createClient } from "@/lib/supabase/server";
import { getStripe, stripeEnabledFor } from "@/lib/stripe";
import BillingActions from "./BillingActions";

export default async function BillingPage() {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const locale = getLocale();
  let userName = t("Ditt konto");
  let country: string | null = null;
  let billingEmail = "";
  let exempt = false;
  let stripeCustomer = false;
  let billingStatus: string | null = null;
  let customerId: string | null = null;
  let invoices: { id: string; date: string; amount: string; status: string; url: string | null }[] = [];
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
    // Nya kolumner (supabase/stripe.sql): hämtas separat så sidan funkar även utan dem.
    const { data: st } = await supabase.from("profiles").select("stripe_customer_id, stripe_subscription_id, billing_status").eq("id", user.id).maybeSingle();
    stripeCustomer = !!st?.stripe_customer_id && !!st?.stripe_subscription_id;
    billingStatus = st?.billing_status ?? null;
    customerId = st?.stripe_customer_id ?? null;
  }

  // Senaste betalningarna hämtas live från Stripe (bara för kunder med kortbetalning).
  if (stripeCustomer && customerId) {
    try {
      const stripe = getStripe();
      if (stripe) {
        const list = await stripe.invoices.list({ customer: customerId, limit: 5 });
        invoices = list.data
          .filter((inv) => inv.status !== "draft")
          .map((inv) => ({
            id: inv.id as string,
            date: new Date(inv.created * 1000).toLocaleDateString(locale),
            amount: formatMoney(inv.total / 100, inv.currency.toUpperCase() as any, locale),
            status: inv.status === "paid" ? "paid" : inv.status === "open" ? "open" : "other",
            url: inv.hosted_invoice_url ?? null,
          }));
      }
    } catch (e) {
      console.error("invoices list", e);
    }
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
            ) : stripeCustomer ? (
              <>
                <div className="font-semibold text-[14px] mb-1">{t("Kortbetalning varje månad")}</div>
                <p className="text-[12.5px] text-ink-dim">
                  {billingStatus === "past_due"
                    ? t("Senaste betalningen gick inte igenom. Uppdatera ditt kort så försöker vi igen.")
                    : t("Din prenumeration dras automatiskt från ditt kort. Du kan byta kort och se dina kvitton.")}
                </p>
                <BillingActions mode="portal" />
                {invoices.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-line">
                    <div className="text-[12.5px] text-ink-dim uppercase tracking-wide mb-2">{t("Senaste betalningar")}</div>
                    <ul className="divide-y divide-line">
                      {invoices.map((inv) => (
                        <li key={inv.id} className="flex items-center justify-between gap-3 py-2 text-[13.5px]">
                          <span className="text-ink-dim">{inv.date}</span>
                          <span className="font-semibold">{inv.amount}</span>
                          <span className={inv.status === "paid" ? "text-[#1E6B34]" : "text-warm"}>
                            {inv.status === "paid" ? t("Betald") : inv.status === "open" ? t("Obetald") : t("Annan")}
                          </span>
                          {inv.url ? (
                            <a href={inv.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline">{t("Kvitto")}</a>
                          ) : <span />}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="font-semibold text-[14px] mb-1">{t("Faktura en gång i månaden")}</div>
                <p className="text-[12.5px] text-ink-dim">
                  {t("Fakturan skickas till {email}. Behöver du ändra faktureringsadress eller e-post, hör av dig till oss.", { email: billingEmail })}
                </p>
                {stripeEnabledFor(userEmail) && <BillingActions mode="pay" />}
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
