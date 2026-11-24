import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSiteBookingData, sendRescheduleEmails, sendCancellationEmails } from "@/lib/bookingServer";
import { computeAvailability, isStartAvailable } from "@/lib/booking";
import { siteLocale } from "@/lib/i18n/site-server";
import { clientIp, rateLimited, TOO_MANY } from "@/lib/rateLimit";
import { withErrorLog } from "@/lib/errorLog";

// Kundens egen avbokning via länken i bekräftelsemejlet (/avboka/<token>).
// Token är lång och slumpmässig; den som har länken kan avboka just den tiden.
export const dynamic = "force-dynamic";

const validToken = (t: unknown): t is string => typeof t === "string" && /^[0-9a-f]{40,80}$/i.test(t);

async function GET_handler(request: Request) {
  const t = getT();
  const token = new URL(request.url).searchParams.get("token");
  if (!validToken(token)) return NextResponse.json({ error: t("Ogiltig länk.") }, { status: 400 });
  const db = createAdminClient();
  const { data: b } = await db
    .from("bookings")
    .select("package_name, starts_at, duration_min, status, site_id, package_id, buffer_min, ends_at")
    .eq("cancel_token", token)
    .maybeSingle();
  if (!b) return NextResponse.json({ error: t("Hittade ingen bokning.") }, { status: 404 });
  const { data: site } = await db.from("sites").select("name").eq("id", (b as any).site_id).maybeSingle();
  const data = await loadSiteBookingData(db, (b as any).site_id);
  const minHours = (data.settings as any).cancel_min_hours ?? 0;
  const locked = new Date((b as any).starts_at).getTime() - Date.now() < minHours * 3600000;
  const url = new URL(request.url);
  const base = {
    booking: { packageName: (b as any).package_name, startsAt: (b as any).starts_at, durationMin: (b as any).duration_min, status: (b as any).status },
    siteName: (site as any)?.name || "",
    timezone: data.settings.timezone,
    // Inom avbokningsgränsen får kunden inte ändra själv.
    locked,
    minHours,
    canReschedule: !!(b as any).package_id,
  };
  if (url.searchParams.get("slots") && (b as any).package_id && !locked && (b as any).status !== "cancelled") {
    const pkg = data.packages.find((p) => p.id === (b as any).package_id);
    if (pkg) {
      // Egen bokning ska inte blockera sin egen tid.
      const own = new Date((b as any).starts_at).getTime();
      const busy = data.busy.filter((x) => new Date(x.starts_at).getTime() !== own);
      const availability = computeAvailability({ pkg, rules: data.rules, slots: data.slots, blocks: data.blocks, busy, settings: data.settings });
      return NextResponse.json({ ...base, availability });
    }
  }
  return NextResponse.json(base);
}

async function POST_handler(request: Request) {
  const t = getT();
  const body = await request.json().catch(() => ({}));
  if (!validToken(body.token)) return NextResponse.json({ error: t("Ogiltig länk.") }, { status: 400 });
  if (await rateLimited(`cancel:ip:${clientIp(request)}`, 20, 3600)) {
    return NextResponse.json({ error: t(TOO_MANY) }, { status: 429 });
  }
  const db = createAdminClient();
  const { data: b } = await db
    .from("bookings")
    .select("id, site_id, package_id, buffer_min, package_name, duration_min, price_sek, starts_at, customer_name, customer_email, customer_phone, message, cancel_token, status")
    .eq("cancel_token", body.token)
    .maybeSingle();
  if (!b) return NextResponse.json({ error: t("Hittade ingen bokning.") }, { status: 404 });
  if ((b as any).status === "cancelled") return NextResponse.json({ ok: true, already: true });
  if (new Date((b as any).starts_at).getTime() < Date.now()) {
    return NextResponse.json({ error: t("Tiden har redan passerat.") }, { status: 400 });
  }
  const settingsData = await loadSiteBookingData(db, (b as any).site_id);
  const tt = (await siteLocale(db, (b as any).site_id)).t;
  const minHours = (settingsData.settings as any).cancel_min_hours ?? 0;
  if (new Date((b as any).starts_at).getTime() - Date.now() < minHours * 3600000) {
    return NextResponse.json({ error: tt("Det är för sent att ändra tiden själv. Kontakta oss så hjälper vi dig."), locked: true }, { status: 403 });
  }

  if (body.action === "reschedule") {
    const startsAt = typeof body.startsAt === "string" ? body.startsAt : "";
    const pkg = settingsData.packages.find((p) => p.id === (b as any).package_id);
    if (!pkg) return NextResponse.json({ error: tt("Den här bokningen kan inte bokas om själv. Kontakta oss.") }, { status: 400 });
    const own = new Date((b as any).starts_at).getTime();
    const busy = settingsData.busy.filter((x) => new Date(x.starts_at).getTime() !== own);
    const avail = computeAvailability({ pkg, rules: settingsData.rules, slots: settingsData.slots, blocks: settingsData.blocks, busy, settings: settingsData.settings });
    if (!isStartAvailable(startsAt, avail, settingsData.settings.timezone)) {
      return NextResponse.json({ error: tt("Den tiden är tyvärr inte ledig längre. Välj en annan.") }, { status: 409 });
    }
    const start = new Date(startsAt);
    const end = new Date(start.getTime() + (b as any).duration_min * 60000);
    const { data: row, error: upErr } = await db
      .from("bookings")
      .update({ starts_at: start.toISOString(), ends_at: end.toISOString(), reminder_sent_at: null })
      .eq("id", (b as any).id).eq("status", "confirmed")
      .select("id, package_name, duration_min, price_sek, starts_at, customer_name, customer_email, customer_phone, message, cancel_token")
      .single();
    if (upErr || !row) {
      if (upErr?.code === "23P01") return NextResponse.json({ error: tt("Den tiden är tyvärr inte ledig längre. Välj en annan.") }, { status: 409 });
      return NextResponse.json({ error: tt("Kunde inte boka om just nu.") }, { status: 500 });
    }
    const { data: site } = await db.from("sites").select("name").eq("id", (b as any).site_id).maybeSingle();
    await sendRescheduleEmails({ db, siteId: (b as any).site_id, siteName: (site as any)?.name || "sajten", booking: row as any, oldStartsAt: (b as any).starts_at, settings: settingsData.settings, origin: new URL(request.url).origin }).catch(() => {});
    return NextResponse.json({ ok: true, startsAt: (row as any).starts_at, timezone: settingsData.settings.timezone });
  }

  const { error } = await db.from("bookings").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", (b as any).id);
  if (error) return NextResponse.json({ error: t("Kunde inte avboka just nu.") }, { status: 500 });

  const [{ data: site }, data] = await Promise.all([
    db.from("sites").select("name").eq("id", (b as any).site_id).maybeSingle(),
    loadSiteBookingData(db, (b as any).site_id),
  ]);
  await sendCancellationEmails({ db, siteId: (b as any).site_id, siteName: (site as any)?.name || "sajten", booking: b as any, settings: data.settings, cancelledBy: "customer" }).catch(() => {});
  return NextResponse.json({ ok: true });
}

export const GET = withErrorLog("GET /api/public/booking/cancel", GET_handler);
export const POST = withErrorLog("POST /api/public/booking/cancel", POST_handler);
