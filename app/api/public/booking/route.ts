import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeAvailability, isStartAvailable } from "@/lib/booking";
import { loadSiteBookingData, sendBookingEmails } from "@/lib/bookingServer";

// Publika bokningsrutten för en kundsajt (besökare är inte inloggade hos
// oss, därför service role med egen koll av siteId — samma mönster som
// /api/public/form-submit).
//
// GET ?siteId=…                  → aktiva paket
// GET ?siteId=…&packageId=…      → lediga tider för paketet (datum → starttider)
// POST { siteId, packageId, startsAt, name, email, phone?, message? } → boka
export const dynamic = "force-dynamic";

const isUuid = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId");
  const packageId = url.searchParams.get("packageId");
  if (!isUuid(siteId)) return NextResponse.json({ error: "Saknar siteId." }, { status: 400 });

  const db = createAdminClient();
  const data = await loadSiteBookingData(db, siteId);
  const packages = data.packages.filter((p) => p.active !== false);

  if (!packageId) {
    return NextResponse.json({
      packages: packages.map((p) => ({ id: p.id, name: p.name, description: p.description, duration_min: p.duration_min, price_sek: p.price_sek })),
      timezone: data.settings.timezone,
    });
  }
  const pkg = packages.find((p) => p.id === packageId);
  if (!pkg) return NextResponse.json({ error: "Hittade inte paketet." }, { status: 404 });
  const availability = computeAvailability({ pkg, rules: data.rules, slots: data.slots, blocks: data.blocks, busy: data.busy, settings: data.settings });
  return NextResponse.json({ availability, timezone: data.settings.timezone });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const siteId = body.siteId;
  const packageId = body.packageId;
  const startsAt = typeof body.startsAt === "string" ? body.startsAt : "";
  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const phone = clean(body.phone, 60);
  const message = clean(body.message, 1500);

  if (!isUuid(siteId) || !isUuid(packageId) || !startsAt) {
    return NextResponse.json({ error: "Bokningen saknar uppgifter." }, { status: 400 });
  }
  if (!name) return NextResponse.json({ error: "Skriv ditt namn." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Skriv en giltig e-postadress, dit bekräftelsen skickas." }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: site } = await db.from("sites").select("id, name").eq("id", siteId).maybeSingle();
  if (!site) return NextResponse.json({ error: "Okänd sajt." }, { status: 404 });

  const data = await loadSiteBookingData(db, siteId);
  const pkg = data.packages.find((p) => p.id === packageId && p.active !== false);
  if (!pkg) return NextResponse.json({ error: "Paketet finns inte längre." }, { status: 404 });

  // Kontrollera tiden på servern, aldrig bara i webbläsaren.
  const avail = computeAvailability({ pkg, rules: data.rules, slots: data.slots, blocks: data.blocks, busy: data.busy, settings: data.settings });
  const start = new Date(startsAt);
  if (!isStartAvailable(startsAt, avail, data.settings.timezone)) {
    return NextResponse.json({ error: "Tiden hann tyvärr bli upptagen. Välj en annan tid.", taken: true }, { status: 409 });
  }
  const end = new Date(start.getTime() + pkg.duration_min * 60000);

  const { data: row, error } = await db
    .from("bookings")
    .insert({
      site_id: siteId,
      package_id: pkg.id,
      package_name: pkg.name,
      duration_min: pkg.duration_min,
      price_sek: pkg.price_sek ?? null,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      customer_name: name,
      customer_email: email,
      customer_phone: phone || null,
      message: message || null,
    })
    .select("id, package_name, duration_min, price_sek, starts_at, customer_name, customer_email, customer_phone, message, cancel_token")
    .single();

  if (error || !row) {
    // 23P01 = exclusion_violation: någon hann boka samma tid i samma ögonblick.
    if (error?.code === "23P01") {
      return NextResponse.json({ error: "Tiden hann tyvärr bli upptagen. Välj en annan tid.", taken: true }, { status: 409 });
    }
    return NextResponse.json({ error: "Kunde inte spara bokningen just nu." }, { status: 500 });
  }

  const mail = await sendBookingEmails({
    db,
    siteId,
    siteName: (site as any).name || "sajten",
    booking: row as any,
    settings: data.settings,
    origin: new URL(request.url).origin,
  }).catch(() => ({ customerSent: false, ownerSent: false }));

  return NextResponse.json({
    ok: true,
    booking: { packageName: row.package_name, startsAt: row.starts_at, durationMin: row.duration_min, priceSek: row.price_sek },
    timezone: data.settings.timezone,
    emailSent: mail.customerSent,
  });
}
