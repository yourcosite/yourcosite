import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, escapeHtml } from "@/lib/email";
import { USD_SEK } from "@/lib/aiUsage";
import { metaConfigured } from "@/lib/metaPublish";
import { accountStats, postStats, type AccountStats, type PostStats } from "@/lib/metaStats";

// Veckorapport till ägaren: siffror från sajten och från YourCoSites egna
// sociala medier. Skickas av Vercel Cron varje måndag morgon (se
// app/api/cron/weekly-report). Mottagare: WEEKLY_REPORT_TO (kommaseparerat),
// annars ALERT_EMAIL, annars alla superadmin i profiles. Allt är försiktigt
// byggt: saknas en tabell eller en Meta-rättighet blir den raden en
// strecksiffra i stället för att rapporten uteblir.

const DAY = 86400000;

export type WeeklyData = {
  periodFrom: string;
  periodTo: string;
  customers: { total: number; new7: number; newPrev7: number };
  sites: { live: number; draft: number };
  views: { week: number; prevWeek: number; top: { name: string; views: number }[] };
  aiCostSek: number;
  errors7: number;
  social: {
    configured: boolean;
    account: AccountStats | null;
    prevAccount: AccountStats | null;
    posts: { caption: string; publishedAt: string; stats: PostStats; error?: string | null }[];
    awaiting: number; // utkast som väntar på godkännande
    approved: number; // godkända och schemalagda
    failed: number;
  };
};

async function count(q: PromiseLike<{ count: number | null }>): Promise<number> {
  try {
    const r = await q;
    return r.count ?? 0;
  } catch {
    return 0;
  }
}

export async function collectWeekly(): Promise<WeeklyData> {
  const db = createAdminClient();
  const now = Date.now();
  const s7 = new Date(now - 7 * DAY).toISOString();
  const s14 = new Date(now - 14 * DAY).toISOString();

  const head = (table: string) => db.from(table).select("id", { count: "exact", head: true });

  const [total, new7, newPrev7, views7, viewsPrev, errors7] = await Promise.all([
    count(head("profiles").eq("role", "customer")),
    count(head("profiles").eq("role", "customer").gte("created_at", s7)),
    count(head("profiles").eq("role", "customer").gte("created_at", s14).lt("created_at", s7)),
    count(head("site_pageviews").gte("visited_at", s7)),
    count(head("site_pageviews").gte("visited_at", s14).lt("visited_at", s7)),
    count(head("error_log").gte("created_at", s7)),
  ]);

  const { data: siteRows } = await db.from("sites").select("id, name, domain, status");
  const sites = (siteRows ?? []) as { id: string; name: string; domain: string | null; status: string }[];
  const nameOf = new Map(sites.map((s) => [s.id, s.domain || s.name]));

  const { data: recent } = await db.from("site_pageviews").select("site_id").gte("visited_at", s7).limit(20000);
  const perSite = new Map<string, number>();
  for (const r of (recent ?? []) as { site_id: string }[]) perSite.set(r.site_id, (perSite.get(r.site_id) ?? 0) + 1);
  const top = [...perSite.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, views]) => ({ name: nameOf.get(id) ?? "okänd sajt", views }));

  let aiCostUsd = 0;
  try {
    const { data: ai } = await db.from("ai_usage").select("cost_usd").gte("created_at", s7).limit(50000);
    aiCostUsd = (ai ?? []).reduce((s: number, r: any) => s + Number(r.cost_usd || 0), 0);
  } catch {}

  // Sociala medier
  const configured = metaConfigured();
  let posts: WeeklyData["social"]["posts"] = [];
  let awaiting = 0;
  let approved = 0;
  let failed = 0;
  try {
    const { data: pub } = await db
      .from("social_posts")
      .select("caption, result, published_at, error, status")
      .eq("status", "published")
      .gte("published_at", s7)
      .order("published_at", { ascending: true });
    const rows = (pub ?? []) as any[];
    const stats = configured ? await Promise.all(rows.map((r) => postStats(r.result))) : rows.map(() => ({}) as PostStats);
    posts = rows.map((r, i) => ({
      caption: String(r.caption || "").split("\n")[0].slice(0, 90),
      publishedAt: r.published_at,
      stats: stats[i],
      error: r.error,
    }));
    awaiting = await count(head("social_posts").eq("status", "draft"));
    approved = await count(head("social_posts").eq("status", "approved"));
    failed = await count(head("social_posts").eq("status", "error").gte("created_at", s7));
  } catch {}

  let account: AccountStats | null = null;
  let prevAccount: AccountStats | null = null;
  if (configured) {
    account = await accountStats();
    try {
      const { data: prev } = await db
        .from("weekly_report_snapshots")
        .select("data")
        .order("created_at", { ascending: false })
        .limit(1);
      prevAccount = (prev?.[0]?.data as any)?.account ?? null;
      await db.from("weekly_report_snapshots").insert({ data: { account, customers: total } });
    } catch {}
  }

  return {
    periodFrom: s7,
    periodTo: new Date(now).toISOString(),
    customers: { total, new7, newPrev7 },
    sites: { live: sites.filter((s) => s.status === "live").length, draft: sites.filter((s) => s.status === "draft").length },
    views: { week: views7, prevWeek: viewsPrev, top },
    aiCostSek: aiCostUsd * USD_SEK,
    errors7,
    social: { configured, account, prevAccount, posts, awaiting, approved, failed },
  };
}

const INK = "#17171A";
const GREEN = "#C6FF5E";
const dash = "–";
const n = (v: number | null | undefined) => (v === null || v === undefined ? dash : v.toLocaleString("sv-SE"));
function delta(cur: number | null | undefined, prev: number | null | undefined) {
  if (cur === null || cur === undefined || prev === null || prev === undefined) return "";
  const d = cur - prev;
  if (d === 0) return " (oförändrat)";
  return ` (${d > 0 ? "+" : ""}${d.toLocaleString("sv-SE")} mot veckan före)`;
}

export function renderWeekly(d: WeeklyData): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const day = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short", timeZone: "Europe/Stockholm" });
  const period = `${day(d.periodFrom)} till ${day(d.periodTo)}`;
  const lines: [string, string][] = [];
  const row = (label: string, value: string) =>
    `<tr><td style="padding:7px 0;border-bottom:1px solid #ecebe6;font-size:14.5px;color:#4a4a46">${e(label)}</td><td align="right" style="padding:7px 0;border-bottom:1px solid #ecebe6;font-size:14.5px;font-weight:700;color:${INK}">${e(value)}</td></tr>`;
  const h = (t: string) => `<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:#6b6a66;margin:26px 0 6px">${e(t)}</div>`;

  const s = d.social;
  const sajt: [string, string][] = [
    ["Nya kunder", `${n(d.customers.new7)}${delta(d.customers.new7, d.customers.newPrev7)}`],
    ["Kunder totalt", n(d.customers.total)],
    ["Publicerade sajter", n(d.sites.live)],
    ["Sajter som byggs (utkast)", n(d.sites.draft)],
    ["Sidvisningar på kundsajterna", `${n(d.views.week)}${delta(d.views.week, d.views.prevWeek)}`],
    ["AI-kostnad", `${d.aiCostSek.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr`],
    ["Fel i systemet", n(d.errors7)],
  ];
  lines.push(...sajt);

  const socialRows: [string, string][] = [];
  if (s.configured) {
    socialRows.push(["Facebook, följare", `${n(s.account?.facebookFollowers)}${delta(s.account?.facebookFollowers, s.prevAccount?.facebookFollowers)}`]);
    socialRows.push(["Instagram, följare", `${n(s.account?.instagramFollowers)}${delta(s.account?.instagramFollowers, s.prevAccount?.instagramFollowers)}`]);
    socialRows.push(["Instagram, räckvidd senaste 7 dagarna", n(s.account?.instagramReach7d)]);
  } else {
    socialRows.push(["Meta", "ej kopplat"]);
  }
  socialRows.push(["Inlägg publicerade", n(s.posts.length)]);
  socialRows.push(["Väntar på ditt godkännande", n(s.awaiting)]);
  socialRows.push(["Godkända och schemalagda", n(s.approved)]);
  if (s.failed) socialRows.push(["Inlägg som misslyckades", n(s.failed)]);

  const postHtml = s.posts.length
    ? s.posts
        .map((p) => {
          const fb = p.stats.facebook;
          const ig = p.stats.instagram;
          const detail = [
            fb ? `FB: ${n(fb.reactions)} reaktioner, ${n(fb.comments)} kommentarer, ${n(fb.shares)} delningar` : "",
            ig ? `IG: ${n(ig.likes)} gillningar, ${n(ig.comments)} kommentarer, räckvidd ${n(ig.reach)}` : "",
            p.error ? `Fel: ${p.error}` : "",
          ].filter(Boolean).join(" · ");
          return `<tr><td style="padding:9px 0;border-bottom:1px solid #ecebe6;font-size:14px;color:${INK}"><b>${e(p.caption)}</b><div style="font-size:13px;color:#6b6a66;margin-top:2px">${e(day(p.publishedAt))}${detail ? ` · ${e(detail)}` : ""}</div></td></tr>`;
        })
        .join("")
    : `<tr><td style="padding:9px 0;font-size:14px;color:#6b6a66">Inga inlägg publicerades den här veckan.</td></tr>`;

  const topHtml = d.views.top.length
    ? d.views.top.map((t) => row(t.name, n(t.views))).join("")
    : `<tr><td style="padding:9px 0;font-size:14px;color:#6b6a66">Inga besök än.</td></tr>`;

  const html = `<!doctype html><html><body style="margin:0;background:#f7f5f2;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:${INK};padding:22px 28px"><span style="font-size:20px;font-weight:700;color:${GREEN}">YourCoSite</span><span style="font-size:14px;color:#cfcfca"> · veckorapport</span></td></tr>
<tr><td style="padding:24px 28px 30px">
<div style="font-size:22px;font-weight:700;color:${INK}">Så gick veckan</div>
<div style="font-size:14px;color:#6b6a66;margin-top:4px">${e(period)}</div>
${h("Sajten")}<table width="100%" cellpadding="0" cellspacing="0">${sajt.map(([a, b]) => row(a, b)).join("")}</table>
${h("Mest besökta sajter")}<table width="100%" cellpadding="0" cellspacing="0">${topHtml}</table>
${h("Sociala medier")}<table width="100%" cellpadding="0" cellspacing="0">${socialRows.map(([a, b]) => row(a, b)).join("")}</table>
${h("Veckans inlägg")}<table width="100%" cellpadding="0" cellspacing="0">${postHtml}</table>
<div style="margin-top:26px"><a href="https://www.yourcosite.com/admin/sociala-medier" style="background:${GREEN};color:#0C1004;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14.5px;display:inline-block">Öppna Sociala medier</a></div>
</td></tr></table></td></tr></table></body></html>`;

  const text = [
    `YourCoSite, veckorapport ${period}`,
    "",
    "SAJTEN",
    ...sajt.map(([a, b]) => `${a}: ${b}`),
    "",
    "MEST BESÖKTA",
    ...(d.views.top.length ? d.views.top.map((t) => `${t.name}: ${t.views}`) : ["Inga besök än."]),
    "",
    "SOCIALA MEDIER",
    ...socialRows.map(([a, b]) => `${a}: ${b}`),
    "",
    "VECKANS INLÄGG",
    ...(s.posts.length ? s.posts.map((p) => `- ${p.caption} (${day(p.publishedAt)})`) : ["Inga inlägg publicerades den här veckan."]),
  ].join("\n");

  return { subject: `YourCoSite veckorapport: ${n(d.customers.new7)} nya kunder, ${n(d.views.week)} besök`, html, text };
}

async function recipients(): Promise<string[]> {
  const env = process.env.WEEKLY_REPORT_TO || process.env.ALERT_EMAIL;
  if (env) return env.split(",").map((x) => x.trim()).filter(Boolean);
  try {
    const { data } = await createAdminClient().from("profiles").select("email").eq("role", "superadmin");
    return (data ?? []).map((r: any) => r.email).filter(Boolean);
  } catch {
    return [];
  }
}

export async function sendWeeklyReport(): Promise<{ sent: number; to: string[]; reason?: string }> {
  const to = await recipients();
  if (!to.length) return { sent: 0, to, reason: "Ingen mottagare. Sätt WEEKLY_REPORT_TO i Vercel." };
  const data = await collectWeekly();
  const { subject, html, text } = renderWeekly(data);
  let sent = 0;
  let reason: string | undefined;
  for (const addr of to) {
    const r = await sendEmail({ to: addr, subject, html, text });
    if (r.sent) sent++;
    else reason = r.reason;
  }
  return { sent, to, reason };
}
