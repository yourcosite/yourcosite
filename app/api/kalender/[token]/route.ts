import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TIMEZONE } from "@/lib/booking";
import { loadSiteBookingData } from "@/lib/bookingServer";
import { buildCalendarFeed, type FeedBooking } from "@/lib/calendarFeed";
import { withErrorLog } from "@/lib/errorLog";

// Kalenderflödet som kunden prenumererar på (Google Kalender, Apple Kalender,
// Outlook). Adressen innehåller en hemlig kod per sajt (sites.calendar_token),
// så ingen inloggning behövs. Bokningar och bokningsbara tider i samma flöde.
export const dynamic = "force-dynamic";

async function GET_handler(_req: Request, { params }: { params: { token: string } }) {
  const token = params.token.replace(/\.ics$/i, "");
  if (!/^[0-9a-f]{32,80}$/i.test(token)) return new Response("Not found", { status: 404 });

  const db = createAdminClient();
  const { data: site } = await db.from("sites").select("id, name").eq("calendar_token", token).maybeSingle();
  if (!site) return new Response("Not found", { status: 404 });

  const data = await loadSiteBookingData(db, site.id);
  const since = new Date(Date.now() - 60 * 86400000).toISOString();
  const { data: rows } = await db
    .from("bookings")
    .select("id, package_name, starts_at, ends_at, status, customer_name, customer_email, customer_phone, message")
    .eq("site_id", site.id)
    .gte("ends_at", since)
    .order("starts_at");

  const body = buildCalendarFeed({
    siteId: site.id,
    siteName: site.name || "Bokningar",
    tz: data.settings.timezone || DEFAULT_TIMEZONE,
    maxDaysAhead: data.settings.max_days_ahead,
    bookings: (rows as FeedBooking[]) || [],
    packages: data.packages.map((p) => ({ id: p.id, name: p.name })),
    rules: data.rules,
    slots: data.slots,
    blocks: data.blocks,
    openLabel: "Bokningsbar tid",
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="bokningar.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}

export const GET = withErrorLog("GET /api/kalender", GET_handler);
