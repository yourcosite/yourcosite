import { NextResponse } from "next/server";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, siteOrigin, stripeEnabledFor } from "@/lib/stripe";
import { withErrorLog } from "@/lib/errorLog";

// Startar Stripe Checkout för månadsprenumerationen på paketet.
export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });
  const stripe = getStripe();
  if (!stripe || !stripeEnabledFor(user.email)) {
    return NextResponse.json({ error: t("Kortbetalning är inte öppen än.") }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, company_name, email, billing_email, stripe_customer_id, stripe_subscription_id, billing_status, billing_exempt")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: t("Hittade ingen profil.") }, { status: 404 });
  if (profile.billing_exempt) return NextResponse.json({ error: t("Ditt konto är kostnadsfritt.") }, { status: 400 });
  if (profile.stripe_subscription_id && profile.billing_status === "active") {
    return NextResponse.json({ error: t("Du har redan en aktiv prenumeration.") }, { status: 400 });
  }

  let customerId = profile.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.billing_email || profile.email || user.email || undefined,
      name: profile.company_name || profile.full_name || undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const origin = siteOrigin(request);
  const taxRate = process.env.STRIPE_TAX_RATE_ID;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1, ...(taxRate ? { tax_rates: [taxRate] } : {}) }],
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { name: "auto", address: "auto" },
    locale: "auto",
    subscription_data: { metadata: { user_id: user.id } },
    success_url: `${origin}/dashboard?betalning=klar`,
    cancel_url: `${origin}/skapa-konto/paket?betalning=avbruten`,
  });
  return NextResponse.json({ url: session.url });
}

export const POST = withErrorLog("POST /api/billing/checkout", POST_handler);
