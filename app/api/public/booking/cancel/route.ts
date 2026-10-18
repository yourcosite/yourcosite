import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSiteBookingData, sendCancellationEmails } from "@/lib/bookingServer";
import { clientIp, rateLimited, TOO_MANY } from "@/lib/rateLimit";

// Kundens egen avbokning via länken i bekräftelsemejlet (/avboka/<token>).
// Token är lång och slumpmässig; den som har länken kan avboka just den tiden.
export const dynamic = "force-dynamic";

const validToken = (t: unknown): t is string => typeof t === "string" && /^[0-9a-f]{40,80}$/i.test(t);

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!validToken(token)) return NextResponse.json({ error: "Ogiltig länk." }, { status: 400 });
  const db = createAdminClient();
  const { data: b } = await db
    .from("bookings")
    .select("package_name, starts_at, duration_min, status, site_id")
    .eq("cancel_token", token)
    .maybeSingle();
  if (!b) return NextResponse.json({ error: "Hittade ingen bokning." }, { status: 404 });
  const { data: site } = await db.from("sites").select("name").eq("id", (b as any).site_id).maybeSingle();
  const data = await loadSiteBookingData(db, (b as any).site_id);
  return NextResponse.json({
    booking: { packageName: (b as any).package_name, startsAt: (b as any).starts_at, durationMin: (b as any).duration_min, status: (b as any).status },
    siteName: (site as any)?.name || "",
    timezone: data.settings.timezone,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!validToken(body.token)) return NextResponse.json({ error: "Ogiltig länk." }, { status: 400 });
  if (await rateLimited(`cancel:ip:${clientIp(request)}`, 20, 3600)) {
    return NextResponse.json({ error: TOO_MANY }, { status: 429 });
  }
  const db = createAdminClient();
  const { data: b } = await db
    .from("bookings")
    .select("id, site_id, package_name, duration_min, price_sek, starts_at, customer_name, customer_email, customer_phone, message, cancel_token, status")
    .eq("cancel_token", body.token)
    .maybeSingle();
  if (!b) return NextResponse.json({ error: "Hittade ingen bokning." }, { status: 404 });
  if ((b as any).status === "cancelled") return NextResponse.json({ ok: true, already: true });
  if (new Date((b as any).starts_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Tiden har redan passerat." }, { status: 400 });
  }
  const { error } = await db.from("bookings").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", (b as any).id);
  if (error) return NextResponse.json({ error: "Kunde inte avboka just nu." }, { status: 500 });

  const [{ data: site }, data] = await Promise.all([
    db.from("sites").select("name").eq("id", (b as any).site_id).maybeSingle(),
    loadSiteBookingData(db, (b as any).site_id),
  ]);
  await sendCancellationEmails({ db, siteId: (b as any).site_id, siteName: (site as any)?.name || "sajten", booking: b as any, settings: data.settings, cancelledBy: "customer" }).catch(() => {});
  return NextResponse.json({ ok: true });
}
