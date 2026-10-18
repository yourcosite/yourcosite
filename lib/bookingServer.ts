import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_CANCEL_INTRO_CUSTOMER,
  DEFAULT_CANCEL_INTRO_OWNER,
  DEFAULT_CONFIRM_INTRO,
  DEFAULT_CONFIRM_SUBJECT,
  DEFAULT_TIMEZONE,
  applyMailTemplate,
  type MailTexts,
  formatPrice,
  formatSwedish,
  type BookingBlock,
  type BookingBusy,
  type BookingPackage,
  type BookingRule,
  type BookingSettings,
  type BookingSlot,
} from "@/lib/booking";
import { emailLayout, sendEmail } from "@/lib/email";

// Serverhjälp för bokning. Tar emot en klient (admin-klienten i de publika
// rutterna) och läser allt som behövs för att räkna ut lediga tider.

export const DEFAULT_SETTINGS: BookingSettings = {
  min_notice_hours: 12,
  max_days_ahead: 60,
  timezone: DEFAULT_TIMEZONE,
};

export type SiteBookingData = {
  settings: BookingSettings & { notify_email: string | null } & MailTexts;
  packages: BookingPackage[];
  rules: BookingRule[];
  slots: BookingSlot[];
  blocks: BookingBlock[];
  busy: BookingBusy[];
};

export async function loadSiteBookingData(db: SupabaseClient, siteId: string): Promise<SiteBookingData> {
  const nowIso = new Date().toISOString();
  const [settings, packages, rules, slots, blocks, busy] = await Promise.all([
    db.from("booking_settings").select("*").eq("site_id", siteId).maybeSingle(),
    db.from("booking_packages").select("*").eq("site_id", siteId).order("sort_order").order("created_at"),
    db.from("booking_rules").select("*").eq("site_id", siteId),
    db.from("booking_slots").select("*").eq("site_id", siteId).gte("ends_at", nowIso),
    db.from("booking_blocks").select("*").eq("site_id", siteId).gte("ends_at", nowIso),
    db.from("bookings").select("starts_at, ends_at").eq("site_id", siteId).eq("status", "confirmed").gte("ends_at", nowIso),
  ]);
  const s = settings.data as any;
  return {
    settings: {
      min_notice_hours: s?.min_notice_hours ?? DEFAULT_SETTINGS.min_notice_hours,
      max_days_ahead: s?.max_days_ahead ?? DEFAULT_SETTINGS.max_days_ahead,
      timezone: s?.timezone || DEFAULT_SETTINGS.timezone,
      notify_email: s?.notify_email ?? null,
      confirm_subject: s?.confirm_subject ?? null,
      confirm_intro: s?.confirm_intro ?? null,
      confirm_extra: s?.confirm_extra ?? null,
      cancel_intro: s?.cancel_intro ?? null,
    },
    packages: (packages.data as BookingPackage[]) || [],
    rules: ((rules.data as BookingRule[]) || []).map((r) => ({ ...r, start_time: String(r.start_time).slice(0, 5), end_time: String(r.end_time).slice(0, 5) })),
    slots: (slots.data as BookingSlot[]) || [],
    blocks: (blocks.data as BookingBlock[]) || [],
    busy: (busy.data as BookingBusy[]) || [],
  };
}

type BookingRow = {
  id: string;
  package_name: string;
  duration_min: number;
  price_sek: number | null;
  starts_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  message: string | null;
  cancel_token: string;
};

// Mottagare av ägarens mejl: inställd adress, annars kontots inloggningsadress.
export async function ownerEmailFor(db: SupabaseClient, siteId: string, notifyEmail: string | null): Promise<string | null> {
  if (notifyEmail) return notifyEmail;
  const { data: site } = await db.from("sites").select("owner_id").eq("id", siteId).maybeSingle();
  if (!site) return null;
  const { data } = await db.auth.admin.getUserById((site as any).owner_id);
  return data?.user?.email ?? null;
}

export async function sendBookingEmails(opts: {
  db: SupabaseClient;
  siteId: string;
  siteName: string;
  booking: BookingRow;
  settings: BookingSettings & { notify_email: string | null } & MailTexts;
  origin: string;
}) {
  const { db, siteId, siteName, booking: b, settings, origin } = opts;
  const when = formatSwedish(new Date(b.starts_at), settings.timezone);
  const price = formatPrice(b.price_sek);
  const rows: [string, string][] = [
    ["Tjänst", b.package_name],
    ["Tid", when],
    ["Längd", `${b.duration_min} minuter`],
    ["Pris", price],
  ];
  const cancelUrl = `${origin}/avboka/${b.cancel_token}`;
  const ownerTo = await ownerEmailFor(db, siteId, settings.notify_email);
  const vars = { namn: b.customer_name, tjänst: b.package_name, tid: when, längd: `${b.duration_min} minuter`, pris: price, sajt: siteName };
  const subject = applyMailTemplate(settings.confirm_subject?.trim() || DEFAULT_CONFIRM_SUBJECT, vars).replace(/\s+/g, " ").slice(0, 200);
  const intro = applyMailTemplate(settings.confirm_intro?.trim() || DEFAULT_CONFIRM_INTRO, vars);
  const extraText = settings.confirm_extra?.trim() ? applyMailTemplate(settings.confirm_extra.trim(), vars) : "";

  const customer = sendEmail({
    to: b.customer_email,
    subject,
    html: emailLayout({
      title: "Din bokning är bekräftad",
      intro,
      rows,
      extra: extraText ? { heading: "Bra att veta", text: extraText } : undefined,
      button: { label: "Avboka tiden", url: cancelUrl },
      footer: "Behöver du ändra något kan du avboka via knappen och boka en ny tid, eller svara på det här mejlet.",
    }),
    text: `${intro}\n\n${rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n")}${extraText ? `\n\nBra att veta:\n${extraText}` : ""}\n\nAvboka: ${cancelUrl}`,
    replyTo: ownerTo || undefined,
  });

  const owner = ownerTo
    ? sendEmail({
        to: ownerTo,
        subject: `Ny bokning: ${b.customer_name}, ${when}`,
        html: emailLayout({
          title: "Du har fått en ny bokning",
          intro: `${b.customer_name} har bokat en tid på ${siteName}. Tiden är nu blockerad i din kalender.`,
          rows: [
            ...rows,
            ["Namn", b.customer_name],
            ["E-post", b.customer_email],
            ["Telefon", b.customer_phone || ""],
            ["Meddelande", b.message || ""],
          ],
          button: { label: "Öppna bokningarna", url: `${origin}/bokningar?site=${siteId}` },
        }),
        text: `Ny bokning på ${siteName}\n\n${[...rows, ["Namn", b.customer_name], ["E-post", b.customer_email], ["Telefon", b.customer_phone || ""], ["Meddelande", b.message || ""]].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n")}`,
        replyTo: b.customer_email,
      })
    : Promise.resolve({ sent: false });

  const [c, o] = await Promise.all([customer, owner]);
  return { customerSent: c.sent, ownerSent: o.sent };
}

export async function sendCancellationEmails(opts: {
  db: SupabaseClient;
  siteId: string;
  siteName: string;
  booking: BookingRow;
  settings: BookingSettings & { notify_email: string | null } & MailTexts;
  cancelledBy: "customer" | "owner";
}) {
  const { db, siteId, siteName, booking: b, settings, cancelledBy } = opts;
  const when = formatSwedish(new Date(b.starts_at), settings.timezone);
  const rows: [string, string][] = [["Tjänst", b.package_name], ["Tid", when]];
  const ownerTo = await ownerEmailFor(db, siteId, settings.notify_email);
  const cancelVars = { namn: b.customer_name, tjänst: b.package_name, tid: when, längd: `${b.duration_min} minuter`, pris: formatPrice(b.price_sek), sajt: siteName };
  const cancelIntro = applyMailTemplate(
    settings.cancel_intro?.trim() || (cancelledBy === "owner" ? DEFAULT_CANCEL_INTRO_OWNER : DEFAULT_CANCEL_INTRO_CUSTOMER),
    cancelVars
  );
  const tasks: Promise<unknown>[] = [
    sendEmail({
      to: b.customer_email,
      subject: `Avbokad: ${b.package_name}, ${when}`,
      html: emailLayout({
        title: "Din bokning är avbokad",
        intro: cancelIntro,
        rows,
      }),
      text: `${cancelIntro}\n\nTjänst: ${b.package_name}\nTid: ${when}`,
      replyTo: ownerTo || undefined,
    }),
  ];
  if (ownerTo && cancelledBy === "customer") {
    tasks.push(
      sendEmail({
        to: ownerTo,
        subject: `Avbokning: ${b.customer_name}, ${when}`,
        html: emailLayout({ title: "En bokning har avbokats", intro: `${b.customer_name} har avbokat sin tid. Tiden är ledig igen.`, rows: [...rows, ["Namn", b.customer_name], ["E-post", b.customer_email]] }),
        text: `${b.customer_name} har avbokat.\n\nTjänst: ${b.package_name}\nTid: ${when}`,
        replyTo: b.customer_email,
      })
    );
  }
  await Promise.all(tasks);
}
