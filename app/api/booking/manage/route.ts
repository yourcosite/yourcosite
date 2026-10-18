import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TIMEZONE, addDays, timeToMinutes, zonedTimeToUtc } from "@/lib/booking";
import { loadSiteBookingData, sendCancellationEmails } from "@/lib/bookingServer";
import { siteLocale } from "@/lib/i18n/site-server";
import { LOCALES, isLocale } from "@/lib/i18n/config";
import { CURRENCIES, isCurrency } from "@/lib/i18n/country";

// Ägarens hantering av bokningen (sidan /bokningar). Allt går via
// inloggad användare och Row Level Security; sajten kontrolleras också
// uttryckligen. Mejl vid avbokning skickas med admin-klienten.
export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const isUuid = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);
const txt = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function ownedSite(siteId: unknown) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 }) } as const;
  if (!isUuid(siteId)) return { error: NextResponse.json({ error: t("Saknar sajt.") }, { status: 400 }) } as const;
  const { data: site } = await supabase.from("sites").select("id, name").eq("id", siteId).eq("owner_id", user.id).maybeSingle();
  if (!site) return { error: NextResponse.json({ error: t("Hittade ingen sajt.") }, { status: 404 }) } as const;
  return { supabase, user, site } as const;
}

export async function GET(request: Request) {
  const siteId = new URL(request.url).searchParams.get("site");
  const ctx = await ownedSite(siteId);
  if ("error" in ctx) return ctx.error;
  const { supabase, site } = ctx;

  const since = new Date(Date.now() - 2 * 86400000).toISOString();
  const [settings, packages, rules, slots, blocks, bookings] = await Promise.all([
    supabase.from("booking_settings").select("*").eq("site_id", site.id).maybeSingle(),
    supabase.from("booking_packages").select("*").eq("site_id", site.id).order("sort_order").order("created_at"),
    supabase.from("booking_rules").select("*").eq("site_id", site.id).order("weekday").order("start_time"),
    supabase.from("booking_slots").select("*").eq("site_id", site.id).gte("ends_at", since).order("starts_at"),
    supabase.from("booking_blocks").select("*").eq("site_id", site.id).gte("ends_at", since).order("starts_at"),
    supabase.from("bookings").select("*").eq("site_id", site.id).gte("starts_at", since).order("starts_at").limit(300),
  ]);
  const s: any = settings.data;
  const L = await siteLocale(createAdminClient(), site.id);
  return NextResponse.json({
    siteName: site.name,
    siteLang: L.lang,
    currency: L.currency,
    settings: {
      notify_email: s?.notify_email ?? "",
      min_notice_hours: s?.min_notice_hours ?? 12,
      max_days_ahead: s?.max_days_ahead ?? 60,
      timezone: s?.timezone || DEFAULT_TIMEZONE,
      confirm_subject: s?.confirm_subject ?? "",
      confirm_intro: s?.confirm_intro ?? "",
      confirm_extra: s?.confirm_extra ?? "",
      cancel_intro: s?.cancel_intro ?? "",
    },
    packages: packages.data || [],
    rules: ((rules.data as any[]) || []).map((r) => ({ ...r, start_time: String(r.start_time).slice(0, 5), end_time: String(r.end_time).slice(0, 5) })),
    slots: slots.data || [],
    blocks: blocks.data || [],
    bookings: bookings.data || [],
    mailConfigured: !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
  });
}

export async function POST(request: Request) {
  const t = getT();
  const body = await request.json().catch(() => ({}));
  const ctx = await ownedSite(body.siteId);
  if ("error" in ctx) return ctx.error;
  const { supabase, site, user } = ctx;
  const fail = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

  const { data: st } = await supabase.from("booking_settings").select("timezone").eq("site_id", site.id).maybeSingle();
  const tz = (st as any)?.timezone || DEFAULT_TIMEZONE;

  switch (body.action) {
    case "saveSiteLocale": {
      // Sajtens språk (cookiebanner, bokning, formulär, kundmejl) och valuta.
      const update: Record<string, string> = {};
      if (body.language !== undefined) {
        if (!isLocale(body.language)) return fail(t("Språket stöds inte."));
        update.language = body.language;
      }
      if (body.currency !== undefined) {
        if (!isCurrency(body.currency)) return fail(t("Valutan stöds inte."));
        update.currency = body.currency;
      }
      if (!Object.keys(update).length) return fail(t("Inget att spara."));
      const { error } = await supabase.from("sites").update(update).eq("id", site.id);
      if (error) return fail(t("Kunde inte spara."), 500);
      return NextResponse.json({ ok: true });
    }
    case "savePackage": {
      const name = txt(body.name, 80);
      if (!name) return fail(t("Skriv ett namn på paketet."));
      const duration = Math.round(Number(body.duration_min));
      if (!Number.isFinite(duration) || duration < 5 || duration > 1440) return fail(t("Längden måste vara mellan 5 och 1440 minuter."));
      const priceRaw = body.price_sek === null || body.price_sek === "" || body.price_sek === undefined ? null : Math.round(Number(body.price_sek));
      if (priceRaw !== null && (!Number.isFinite(priceRaw) || priceRaw < 0)) return fail(t("Priset måste vara 0 kr eller mer."));
      const row = {
        site_id: site.id,
        name,
        description: txt(body.description, 400) || null,
        duration_min: duration,
        price_sek: priceRaw,
        active: body.active !== false,
      } as Record<string, unknown>;
      // Valfri bild: bara vår egen uppladdningsmapp för den här användaren
      // godtas. Fältet skickas bara med när bilden sätts eller tas bort.
      if (typeof body.image_url === "string" && body.image_url) {
        if (!/^https:\/\//.test(body.image_url) || !body.image_url.includes(`/uploads/${user.id}/`) || body.image_url.length > 600) {
          return fail(t("Bilden måste vara uppladdad här i verktyget."));
        }
        row.image_url = body.image_url;
      } else if (body.clearImage === true) {
        row.image_url = null;
      }
      const q = isUuid(body.id)
        ? supabase.from("booking_packages").update(row).eq("id", body.id).eq("site_id", site.id)
        : supabase.from("booking_packages").insert(row);
      const { error } = await q;
      if (error) return fail(t("Kunde inte spara paketet."), 500);
      return NextResponse.json({ ok: true });
    }
    case "deletePackage": {
      if (!isUuid(body.id)) return fail(t("Saknar paket."));
      const { error } = await supabase.from("booking_packages").delete().eq("id", body.id).eq("site_id", site.id);
      if (error) return fail(t("Kunde inte ta bort paketet."), 500);
      return NextResponse.json({ ok: true });
    }
    case "saveRules": {
      const input = Array.isArray(body.rules) ? body.rules : [];
      const rows: any[] = [];
      for (const r of input.slice(0, 100)) {
        const wd = Number(r.weekday);
        if (!(wd >= 1 && wd <= 7) || !TIME.test(r.start_time) || !TIME.test(r.end_time)) return fail(t("En av tiderna är ogiltig."));
        if (timeToMinutes(r.end_time) <= timeToMinutes(r.start_time)) return fail(t("Sluttiden måste vara efter starttiden."));
        rows.push({ site_id: site.id, weekday: wd, start_time: r.start_time, end_time: r.end_time, package_id: isUuid(r.package_id) ? r.package_id : null });
      }
      const del = await supabase.from("booking_rules").delete().eq("site_id", site.id);
      if (del.error) return fail(t("Kunde inte spara tiderna."), 500);
      if (rows.length) {
        const ins = await supabase.from("booking_rules").insert(rows);
        if (ins.error) return fail(t("Kunde inte spara tiderna."), 500);
      }
      return NextResponse.json({ ok: true });
    }
    case "addSlot": {
      if (!DATE.test(body.date) || !TIME.test(body.start) || !TIME.test(body.end)) return fail(t("Fyll i datum, start och slut."));
      if (timeToMinutes(body.end) <= timeToMinutes(body.start)) return fail(t("Sluttiden måste vara efter starttiden."));
      const { error } = await supabase.from("booking_slots").insert({
        site_id: site.id,
        package_id: isUuid(body.package_id) ? body.package_id : null,
        starts_at: zonedTimeToUtc(body.date, body.start, tz).toISOString(),
        ends_at: zonedTimeToUtc(body.date, body.end, tz).toISOString(),
      });
      if (error) return fail(t("Kunde inte lägga till tiden."), 500);
      return NextResponse.json({ ok: true });
    }
    case "deleteSlot":
    case "deleteBlock": {
      if (!isUuid(body.id)) return fail(t("Saknar rad."));
      const table = body.action === "deleteSlot" ? "booking_slots" : "booking_blocks";
      const { error } = await supabase.from(table).delete().eq("id", body.id).eq("site_id", site.id);
      if (error) return fail(t("Kunde inte ta bort."), 500);
      return NextResponse.json({ ok: true });
    }
    case "addBlock": {
      if (!DATE.test(body.startDate)) return fail(t("Välj ett startdatum."));
      const endDate = DATE.test(body.endDate) ? body.endDate : body.startDate;
      if (endDate < body.startDate) return fail(t("Slutdatum kan inte vara före startdatum."));
      let startsAt: Date, endsAt: Date;
      if (body.allDay !== false) {
        startsAt = zonedTimeToUtc(body.startDate, "00:00", tz);
        endsAt = zonedTimeToUtc(addDays(endDate, 1), "00:00", tz);
      } else {
        if (!TIME.test(body.start) || !TIME.test(body.end)) return fail(t("Fyll i start och slut."));
        startsAt = zonedTimeToUtc(body.startDate, body.start, tz);
        endsAt = zonedTimeToUtc(endDate, body.end, tz);
        if (endsAt <= startsAt) return fail(t("Sluttiden måste vara efter starttiden."));
      }
      const { error } = await supabase.from("booking_blocks").insert({
        site_id: site.id, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), note: txt(body.note, 120) || null,
      });
      if (error) return fail(t("Kunde inte stänga tiden."), 500);
      return NextResponse.json({ ok: true });
    }
    case "saveSettings": {
      const email = txt(body.notify_email, 200);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(t("E-postadressen ser inte rätt ut."));
      const notice = Math.round(Number(body.min_notice_hours));
      const ahead = Math.round(Number(body.max_days_ahead));
      if (!(notice >= 0 && notice <= 720)) return fail(t("Förvarningen måste vara mellan 0 och 720 timmar."));
      if (!(ahead >= 1 && ahead <= 365)) return fail(t("Hur långt fram måste vara mellan 1 och 365 dagar."));
      const { error } = await supabase.from("booking_settings").upsert({
        site_id: site.id, notify_email: email || null, min_notice_hours: notice, max_days_ahead: ahead, timezone: tz,
        confirm_subject: txt(body.confirm_subject, 150) || null,
        confirm_intro: txt(body.confirm_intro, 1000) || null,
        confirm_extra: txt(body.confirm_extra, 1500) || null,
        cancel_intro: txt(body.cancel_intro, 1000) || null,
      });
      if (error) return fail(t("Kunde inte spara inställningarna."), 500);
      return NextResponse.json({ ok: true });
    }
    case "cancelBooking": {
      if (!isUuid(body.id)) return fail(t("Saknar bokning."));
      const { data: b } = await supabase
        .from("bookings")
        .select("id, package_name, duration_min, price_sek, starts_at, customer_name, customer_email, customer_phone, message, cancel_token, status")
        .eq("id", body.id).eq("site_id", site.id).maybeSingle();
      if (!b) return fail(t("Hittade ingen bokning."), 404);
      if ((b as any).status === "cancelled") return NextResponse.json({ ok: true });
      const { error } = await supabase.from("bookings").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", body.id);
      if (error) return fail(t("Kunde inte avboka."), 500);
      const admin = createAdminClient();
      const data = await loadSiteBookingData(admin, site.id);
      await sendCancellationEmails({ db: admin, siteId: site.id, siteName: site.name, booking: b as any, settings: data.settings, cancelledBy: "owner" }).catch(() => {});
      return NextResponse.json({ ok: true });
    }
    default:
      return fail(t("Okänt kommando."));
  }
}
