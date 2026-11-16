// Läser statistik för YourCoSites egen Facebook-sida och Instagram via Metas
// Graph API, med samma miljövariabler som publiceringen (META_PAGE_ID,
// META_PAGE_TOKEN, META_IG_ID). Allt är "bästa försök": saknas en rättighet
// eller ett mått ger Meta ett fel, och då blir just det värdet null i stället
// för att hela rapporten faller.

const VERSION = process.env.META_GRAPH_VERSION || "v23.0";
const BASE = `https://graph.facebook.com/${VERSION}`;

async function get(path: string, params: Record<string, string> = {}): Promise<any | null> {
  const token = process.env.META_PAGE_TOKEN;
  if (!token) return null;
  const qs = new URLSearchParams({ ...params, access_token: token }).toString();
  try {
    const res = await fetch(`${BASE}/${path}?${qs}`, { cache: "no-store" });
    const data: any = await res.json().catch(() => null);
    if (!res.ok || data?.error) return null;
    return data;
  } catch {
    return null;
  }
}

export type PostStats = {
  facebook?: { reactions: number | null; comments: number | null; shares: number | null };
  instagram?: { likes: number | null; comments: number | null; reach: number | null };
};

export type AccountStats = {
  facebookFollowers: number | null;
  instagramFollowers: number | null;
  instagramReach7d: number | null;
};

export async function accountStats(): Promise<AccountStats> {
  const page = process.env.META_PAGE_ID;
  const ig = process.env.META_IG_ID;
  const day = 86400;
  const until = Math.floor(Date.now() / 1000);
  const since = until - 7 * day;
  const [fb, igi, igr] = await Promise.all([
    page ? get(page, { fields: "followers_count,fan_count" }) : null,
    ig ? get(ig, { fields: "followers_count,media_count" }) : null,
    ig ? get(`${ig}/insights`, { metric: "reach", period: "day", metric_type: "total_value", since: String(since), until: String(until) }) : null,
  ]);
  return {
    facebookFollowers: fb ? (fb.followers_count ?? fb.fan_count ?? null) : null,
    instagramFollowers: igi ? (igi.followers_count ?? null) : null,
    instagramReach7d: igr?.data?.[0]?.total_value?.value ?? null,
  };
}

// result är det publiceringen sparade i social_posts.result: {facebook:{id,post_id}, instagram:{id}}.
export async function postStats(result: any): Promise<PostStats> {
  const out: PostStats = {};
  const fbId = result?.facebook?.post_id || result?.facebook?.id;
  const igId = result?.instagram?.id;
  const [fb, ig, igIns] = await Promise.all([
    fbId ? get(fbId, { fields: "reactions.summary(true).limit(0),comments.summary(true).limit(0),shares" }) : null,
    igId ? get(igId, { fields: "like_count,comments_count" }) : null,
    igId ? get(`${igId}/insights`, { metric: "reach" }) : null,
  ]);
  if (fbId) {
    out.facebook = {
      reactions: fb?.reactions?.summary?.total_count ?? null,
      comments: fb?.comments?.summary?.total_count ?? null,
      shares: fb ? (fb.shares?.count ?? 0) : null,
    };
  }
  if (igId) {
    out.instagram = {
      likes: ig?.like_count ?? null,
      comments: ig?.comments_count ?? null,
      reach: igIns?.data?.[0]?.values?.[0]?.value ?? null,
    };
  }
  return out;
}
