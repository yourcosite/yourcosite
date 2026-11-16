import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { withErrorLog } from "@/lib/errorLog";

// Stripe skickar hit när en betalning lyckas eller misslyckas. Signaturen
// kontrolleras med STRIPE_WEBHOOK_SECRET. Bara den här vägen får markera en
// kund som betalande (billing_setup_complete).
export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const sig = request.headers.get("stripe-signature");
  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig || "", secret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  const db = createAdminClient();
  const byCustomer = (customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) =>
    typeof customer === "string" ? customer : customer?.id ?? null;

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode !== "subscription") break;
      const userId = s.client_reference_id;
      const customerId = byCustomer(s.customer);
      if (!userId || !customerId) break;
      await db.from("profiles").update({
        stripe_customer_id: customerId,
        stripe_subscription_id: typeof s.subscription === "string" ? s.subscription : s.subscription?.id ?? null,
        billing_status: "active",
        billing_setup_complete: true,
        chosen_plan: "bas",
      }).eq("id", userId);
      break;
    }
    case "invoice.paid": {
      const id = byCustomer((event.data.object as Stripe.Invoice).customer);
      if (id) await db.from("profiles").update({ billing_status: "active", billing_setup_complete: true }).eq("stripe_customer_id", id);
      break;
    }
    case "invoice.payment_failed": {
      const id = byCustomer((event.data.object as Stripe.Invoice).customer);
      if (id) await db.from("profiles").update({ billing_status: "past_due" }).eq("stripe_customer_id", id);
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const id = byCustomer(sub.customer);
      if (!id) break;
      const status = event.type === "customer.subscription.deleted" || sub.status === "canceled" ? "canceled"
        : sub.status === "past_due" || sub.status === "unpaid" ? "past_due" : "active";
      await db.from("profiles").update({
        billing_status: status,
        ...(status === "canceled" ? { billing_setup_complete: false } : {}),
      }).eq("stripe_customer_id", id);
      break;
    }
  }
  return NextResponse.json({ received: true });
}

export const POST = withErrorLog("POST /api/stripe/webhook", POST_handler);
