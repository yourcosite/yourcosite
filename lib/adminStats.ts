import { createAdminClient } from "@/lib/supabase/admin";
import { USD_SEK } from "@/lib/aiUsage";
import { metaConfigured } from "@/lib/metaPublish";
import { accountStats, postStats, type AccountStats, type PostStats } from "@/lib/metaStats";

// Siffror till Admin, Statistik: sajten och YourCoSites egna sociala medier.
// Läses live varje gång sidan öppnas (inget mejl). Följarsiffrorna sparas i
// tabellen weekly_report_snapshots (högst ett värde per dygn) så att sidan
// kan visa förändringen. Allt är försiktigt byggt: saknas en tabell eller en
// Meta-rättighet blir just det värdet en strecksiffra, inte ett fel.

const DAY = 86400000;

export type StatsData = {
  days: number;
  customers: { total: number; fresh: number; prevFresh: number };
  sites: { live: number; draft: number };
  views: { now: number; prev: number; top: { name: string; views: number }[] };
  aiCostSek: number;
  errors: number;
  social: {
    configured: boolean;
    account: AccountStats | null;
    prevAccount: AccountStats | null;
    posts: { caption: string; publishedAt: string; stats: PostStats; error?: string | null }[];
    awaiting: number;
    approved: number;
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

export async function collectStats(days: number): Promise<StatsData> {
  const db = createAdminClient();
  const now = Date.now();
  const sA = new Date(now - days * DAY).toISOString();
  const sB = new Date(now - 2 * days * DAY).toISOString();
  const head = (table: string) => db.from(table).select("id", { count: "exact", head: true });

  const [total, fresh, prevFresh, viewsNow, viewsPrev, errors] = await Promise.all([
    count(head("profiles").eq("role", "customer")),
    count(head("profiles").eq("role", "customer").gte("created_at", sA)),
    count(head("profiles").eq("role", "customer").gte("created_at", sB).lt("created_at", sA)),
    count(head("site_pageviews").gte("visited_at", sA)),
    count(head("site_pageviews").gte("visited_at", sB).lt("visited_at", sA)),
    count(head("error_log").gte("created_at", sA)),
  ]);

  const { data: siteRows } = await db.from("sites").select("id, name, domain, status");
  const sites = (siteRows ?? []) as { id: string; name: string; domain: string | null; status: string }[];
  const nameOf = new Map(sites.map((s) => [s.id, s.domain || s.name]));
  const { data: recent } = await db.from("site_pageviews").select("site_id").gte("visited_at", sA).limit(50000);
  const perSite = new Map<string, number>();
  for (const r of (recent ?? []) as { site_id: string }[]) perSite.set(r.site_id, (perSite.get(r.site_id) ?? 0) + 1);
  const top = [...perSite.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, views]) => ({ name: nameOf.get(id) ?? "okänd sajt", views }));

  let aiUsd = 0;
  try {
    const { data: ai } = await db.from("ai_usage").select("cost_usd").gte("created_at", sA).limit(50000);
    aiUsd = (ai ?? []).reduce((s: number, r: any) => s + Number(r.cost_usd || 0), 0);
  } catch {}

  const configured = metaConfigured();
  let posts: StatsData["social"]["posts"] = [];
  let awaiting = 0;
  let approved = 0;
  let failed = 0;
  try {
    const { data: pub } = await db
      .from("social_posts")
      .select("caption, result, published_at, error")
      .eq("status", "published")
      .gte("published_at", sA)
      .order("published_at", { ascending: false })
      .limit(30);
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
    failed = await count(head("social_posts").eq("status", "error"));
  } catch {}

  let account: AccountStats | null = null;
  let prevAccount: AccountStats | null = null;
  if (configured) {
    account = await accountStats();
    try {
      const { data: newest } = await db.from("weekly_report_snapshots").select("created_at").order("created_at", { ascending: false }).limit(1);
      const last = newest?.[0]?.created_at ? new Date(newest[0].created_at).getTime() : 0;
      if (now - last > 20 * 3600_000) await db.from("weekly_report_snapshots").insert({ data: { account } });
      const { data: prev } = await db
        .from("weekly_report_snapshots")
        .select("data")
        .lte("created_at", new Date(now - (days - 1) * DAY).toISOString())
        .order("created_at", { ascending: false })
        .limit(1);
      prevAccount = (prev?.[0]?.data as any)?.account ?? null;
    } catch {}
  }

  return {
    days,
    customers: { total, fresh, prevFresh },
    sites: { live: sites.filter((s) => s.status === "live").length, draft: sites.filter((s) => s.status === "draft").length },
    views: { now: viewsNow, prev: viewsPrev, top },
    aiCostSek: aiUsd * USD_SEK,
    errors,
    social: { configured, account, prevAccount, posts, awaiting, approved, failed },
  };
}
