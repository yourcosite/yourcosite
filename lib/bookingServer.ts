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
  formatWhen,
  type BookingBlock,
  type BookingBusy,
  type BookingPackage,
  type BookingRule,
  type BookingSettings,
  type BookingSlot,
} from "@/lib/booking";
import { emailLayout, sendEmail } from "@/lib/email";
import { siteLocale } from "@/lib/i18n/site-server";
import { BCP47 } from "@/lib/i18n/country";

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
    db.from("bookings").select("starts_at, ends_at, buffer_min").eq("site_id", siteId).eq("status", "confirmed").gte("ends_at", nowIso),
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
      // Villkoren gäller först när ägaren intygat dem (terms_ack_at).
      terms_text: s?.terms_ack_at && s?.terms_text?.trim() ? s.terms_text.trim() : null,
    },
    packages: (packages.data as BookingPackage[]) || [],
    rules: ((rules.data as BookingRule[]) || []).map((r) => ({ ...r, start_time: String(r.start_time).slice(0, 5), end_time: String(r.end_time).slice(0, 5) })),
    slots: (slots.data as BookingSlot[]) || [],
    blocks: (blocks.data as BookingBlock[]) || [],
    // Pausen efter varje bokning räknas som upptagen tid.
    busy: ((busy.data as any[]) || []).map((b) => ({ starts_at: b.starts_at, ends_at: new Date(new Date(b.ends_at).getTime() + (b.buffer_min || 0) * 60000).toISOString() })),
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

// Sajtens logga (om kunden har laddat upp en) och namn, till mejlens topp.
async function brandFor(db: SupabaseClient, siteId: string, siteName: string) {
  const { data } = await db.from("sites").select("logo_url").eq("id", siteId).maybeSingle();
  return { name: siteName, logoUrl: ((data as any)?.logo_url as string | null) ?? null };
}

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
  notifyOwner?: boolean;
}) {
  const { db, siteId, siteName, booking: b, settings, origin } = opts;
  // Kundens mejl skrivs på sajtens språk, ägarens på ägarens eget.
  const L = await siteLocale(db, siteId);
  const { t, ownerT } = L;
  const when = formatWhen(new Date(b.starts_at), settings.timezone, L.bcp47);
  const ownerWhen = formatWhen(new Date(b.starts_at), settings.timezone, BCP47[L.ownerLang]);
  const price = formatPrice(b.price_sek, L.currency, L.bcp47);
  const duration = t("{n} minuter", { n: b.duration_min });
  const rows: [string, string][] = [
    [t("Tjänst"), b.package_name],
    [t("Tid"), when],
    [t("Längd"), duration],
    [t("Pris"), price],
  ];
  const ownerRows: [string, string][] = [
    [ownerT("Tjänst"), b.package_name],
    [ownerT("Tid"), ownerWhen],
    [ownerT("Längd"), ownerT("{n} minuter", { n: b.duration_min })],
    [ownerT("Pris"), formatPrice(b.price_sek, L.currency, BCP47[L.ownerLang])],
  ];
  const cancelUrl = `${origin}/avboka/${b.cancel_token}`;
  const ownerTo = await ownerEmailFor(db, siteId, settings.notify_email);
  const brand = await brandFor(db, siteId, siteName);
  const vars = { namn: b.customer_name, tjänst: b.package_name, tid: when, längd: duration, pris: price, sajt: siteName };
  const subject = applyMailTemplate(settings.confirm_subject?.trim() || t(DEFAULT_CONFIRM_SUBJECT), vars).replace(/\s+/g, " ").slice(0, 200);
  const intro = applyMailTemplate(settings.confirm_intro?.trim() || t(DEFAULT_CONFIRM_INTRO), vars);
  const baseExtra = settings.confirm_extra?.trim() ? applyMailTemplate(settings.confirm_extra.trim(), vars) : "";
  // Villkoren besökaren godkände följer med bekräftelsen.
  const termsText: string = (b as any).terms_snapshot || "";
  const extraText = termsText ? (baseExtra ? `${baseExtra}\n\n${t("Villkor")}:\n${termsText}` : termsText) : baseExtra;
  const extraHeading = termsText && !baseExtra ? t("Villkor") : t("Bra att veta");

  const customer = sendEmail({
    to: b.customer_email,
    subject,
    html: emailLayout({
      brand,
      lang: L.lang,
      poweredBy: t("Bokat via YourCoSite"),
      title: t("Din bokning är bekräftad"),
      intro,
      rows,
      extra: extraText ? { heading: extraHeading, text: extraText } : undefined,
      button: { label: t("Avboka tiden"), url: cancelUrl },
      footer: t("Behöver du ändra något kan du avboka via knappen och boka en ny tid, eller svara på det här mejlet."),
    }),
    text: `${intro}\n\n${rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n")}${extraText ? `\n\n${extraHeading}:\n${extraText}` : ""}\n\n${t("Avboka")}: ${cancelUrl}`,
    replyTo: ownerTo || undefined,
  });

  const owner = ownerTo && opts.notifyOwner !== false
    ? sendEmail({
        to: ownerTo,
        subject: ownerT("Ny bokning: {namn}, {tid}", { namn: b.customer_name, tid: ownerWhen }),
        html: emailLayout({
          brand,
          lang: L.ownerLang,
          poweredBy: ownerT("Bokat via YourCoSite"),
          title: ownerT("Du har fått en ny bokning"),
          intro: ownerT("{namn} har bokat en tid på {sajt}. Tiden är nu blockerad i din kalender.", { namn: b.customer_name, sajt: siteName }),
          rows: [
            ...ownerRows,
            [ownerT("Namn"), b.customer_name],
            [ownerT("E-post"), b.customer_email],
            [ownerT("Telefon"), b.customer_phone || ""],
            [ownerT("Meddelande"), b.message || ""],
          ],
          button: { label: ownerT("Öppna bokningarna"), url: `${origin}/bokningar?site=${siteId}` },
        }),
        text: `${ownerT("Ny bokning på {sajt}", { sajt: siteName })}\n\n${[...ownerRows, [ownerT("Namn"), b.customer_name], [ownerT("E-post"), b.customer_email], [ownerT("Telefon"), b.customer_phone || ""], [ownerT("Meddelande"), b.message || ""]].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n")}`,
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
  const L = await siteLocale(db, siteId);
  const { t, ownerT } = L;
  const when = formatWhen(new Date(b.starts_at), settings.timezone, L.bcp47);
  const ownerWhen = formatWhen(new Date(b.starts_at), settings.timezone, BCP47[L.ownerLang]);
  const rows: [string, string][] = [[t("Tjänst"), b.package_name], [t("Tid"), when]];
  const ownerTo = await ownerEmailFor(db, siteId, settings.notify_email);
  const brand = await brandFor(db, siteId, siteName);
  const cancelVars = { namn: b.customer_name, tjänst: b.package_name, tid: when, längd: t("{n} minuter", { n: b.duration_min }), pris: formatPrice(b.price_sek, L.currency, L.bcp47), sajt: siteName };
  const cancelIntro = applyMailTemplate(
    settings.cancel_intro?.trim() || t(cancelledBy === "owner" ? DEFAULT_CANCEL_INTRO_OWNER : DEFAULT_CANCEL_INTRO_CUSTOMER),
    cancelVars
  );
  const tasks: Promise<unknown>[] = [];
  if (b.customer_email) tasks.push(
    sendEmail({
      to: b.customer_email,
      subject: t("Avbokad: {tjänst}, {tid}", { tjänst: b.package_name, tid: when }),
      html: emailLayout({
        brand,
        lang: L.lang,
        poweredBy: t("Bokat via YourCoSite"),
        title: t("Din bokning är avbokad"),
        intro: cancelIntro,
        rows,
      }),
      text: `${cancelIntro}\n\n${t("Tjänst")}: ${b.package_name}\n${t("Tid")}: ${when}`,
      replyTo: ownerTo || undefined,
    })
  );
  if (ownerTo && cancelledBy === "customer") {
    tasks.push(
      sendEmail({
        to: ownerTo,
        subject: ownerT("Avbokning: {namn}, {tid}", { namn: b.customer_name, tid: ownerWhen }),
        html: emailLayout({
          brand,
          lang: L.ownerLang,
          poweredBy: ownerT("Bokat via YourCoSite"),
          title: ownerT("En bokning har avbokats"),
          intro: ownerT("{namn} har avbokat sin tid. Tiden är ledig igen.", { namn: b.customer_name }),
          rows: [[ownerT("Tjänst"), b.package_name], [ownerT("Tid"), ownerWhen], [ownerT("Namn"), b.customer_name], [ownerT("E-post"), b.customer_email]],
        }),
        text: `${ownerT("{namn} har avbokat.", { namn: b.customer_name })}\n\n${ownerT("Tjänst")}: ${b.package_name}\n${ownerT("Tid")}: ${ownerWhen}`,
        replyTo: b.customer_email,
      })
    );
  }
  await Promise.all(tasks);
}
