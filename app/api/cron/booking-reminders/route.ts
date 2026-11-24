import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSiteBookingData, sendReminderEmail } from "@/lib/bookingServer";
import { withErrorLog } from "@/lib/errorLog";

// Påminnelsemejl till bokade kunder. Körs var 30:e minut av Vercel Cron.
// Varje bokning får högst en påminnelse (reminder_sent_at). Bokningar som
// gjordes efter att påminnelsetiden redan passerat får ingen (de har just
// fått sin bekräftelse).
export const dynamic = "force-dynamic";
const MAX_PER_RUN = 100;

async function GET_handler(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Behörighet saknas." }, { status: 401 });
  }
  const db = createAdminClient();
  const now = Date.now();
  // Allt som börjar inom en vecka kan vara aktuellt; exakt fönster avgörs per sajt.
  const { data: rows, error } = await db
    .from("bookings")
    .select("id, site_id, package_name, duration_min, price_sek, starts_at, customer_name, customer_email, customer_phone, message, cancel_token, created_at")
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .not("customer_email", "is", null)
    .gt("starts_at", new Date(now).toISOString())
    .lt("starts_at", new Date(now + 8 * 86400000).toISOString())
    .order("starts_at")
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.yourcosite.com";
  const cache = new Map<string, { settings: any; name: string }>();
  let sent = 0, skipped = 0;
  for (const b of (rows as any[]) ?? []) {
    if (sent >= MAX_PER_RUN) break;
    let c = cache.get(b.site_id);
    if (!c) {
      const [data, { data: site }] = await Promise.all([
        loadSiteBookingData(db, b.site_id),
        db.from("sites").select("name").eq("id", b.site_id).maybeSingle(),
      ]);
      c = { settings: data.settings, name: (site as any)?.name || "sajten" };
      cache.set(b.site_id, c);
    }
    const hours = c.settings.reminder_hours ?? 24;
    if (c.settings.reminder_enabled === false) continue;
    const startsIn = new Date(b.starts_at).getTime() - now;
    if (startsIn > hours * 3600000) continue; // inte dags än
    // Bokad inom påminnelsefönstret: ingen påminnelse behövs.
    if (new Date(b.created_at).getTime() >= new Date(b.starts_at).getTime() - hours * 3600000) {
      await db.from("bookings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", b.id);
      skipped++;
      continue;
    }
    const r = await sendReminderEmail({ db, siteId: b.site_id, siteName: c.name, booking: b, settings: c.settings, origin }).catch(() => ({ sent: false }));
    if (r.sent) {
      await db.from("bookings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", b.id);
      sent++;
    }
  }
  return NextResponse.json({ ok: true, sent, skipped });
}

export const GET = withErrorLog("GET /api/cron/booking-reminders", GET_handler);
