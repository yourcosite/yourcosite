import Stripe from "stripe";

// Stripe-koppling. Allt är avstängt tills STRIPE_SECRET_KEY finns.
// Under test: sätt STRIPE_TEST_EMAILS (kommaseparerad lista) så ser bara de
// kontona betalsteget. När det är provat: STRIPE_ENABLED=all öppnar för alla.
//
// Miljövariabler (Vercel):
//   STRIPE_SECRET_KEY       sk_test_... (sandlåda) eller sk_live_...
//   STRIPE_PRICE_ID         priset för paketet (200 kr/mån)
//   STRIPE_WEBHOOK_SECRET   whsec_... från webhooken
//   STRIPE_TAX_RATE_ID      (valfri) momssats 25 procent, om priset är exkl. moms
//   STRIPE_TEST_EMAILS      (valfri) vilka som får se betalsteget under test (standard: testkontot)
//   STRIPE_ENABLED          (valfri) "all" för att öppna för alla

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) client = new Stripe(key);
  return client;
}

export function stripeEnabledFor(email: string | null | undefined): boolean {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) return false;
  if (process.env.STRIPE_ENABLED === "all") return true;
  // Under test ser bara det här kontot betalsteget (kan ersättas med STRIPE_TEST_EMAILS).
  const list = (process.env.STRIPE_TEST_EMAILS || "calle_schnell@hotmail.com").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

export function siteOrigin(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "www.yourcosite.com";
  return `${proto}://${host}`;
}
