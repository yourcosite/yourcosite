import { NextResponse } from "next/server";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, siteOrigin } from "@/lib/stripe";
import { withErrorLog } from "@/lib/errorLog";

// Stripes kundportal: byta kort, se kvitton, säga upp.
export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: t("Kortbetalning är inte öppen än.") }, { status: 403 });
  const { data: profile } = await createAdminClient().from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  if (!profile?.stripe_customer_id) return NextResponse.json({ error: t("Du har ingen kortbetalning kopplad.") }, { status: 400 });
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${siteOrigin(request)}/fakturering`,
  });
  return NextResponse.json({ url: session.url });
}

export const POST = withErrorLog("POST /api/billing/portal", POST_handler);
