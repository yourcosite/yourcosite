// Publicerar YourCoSites egna inlägg på Facebook-sidan och Instagram via Metas Graph API.
// Hemligheterna ligger bara som miljövariabler i Vercel (aldrig i koden):
//   META_PAGE_ID        Facebook-sidans ID
//   META_PAGE_TOKEN     långlivad sid-token (page access token) för just den sidan
//   META_IG_ID          Instagram Business-kontots ID
//   META_GRAPH_VERSION  valfri, standard v23.0
// Tokenen gäller bara YourCoSites egen sida, inga andra konton.

const VERSION = process.env.META_GRAPH_VERSION || "v23.0";
const BASE = `https://graph.facebook.com/${VERSION}`;

export function metaConfigured() {
  return !!(process.env.META_PAGE_ID && process.env.META_PAGE_TOKEN && process.env.META_IG_ID);
}

async function graph(path: string, body?: Record<string, unknown>, method = "POST") {
  const token = process.env.META_PAGE_TOKEN!;
  const res = await fetch(`${BASE}/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify({ ...body, access_token: token }) : undefined,
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Meta svarade ${res.status}`);
  return data;
}

async function publishFacebook(caption: string, imageUrl: string) {
  const page = process.env.META_PAGE_ID!;
  const data = await graph(`${page}/photos`, { url: imageUrl, caption });
  return data as { id: string; post_id?: string };
}

async function publishInstagram(caption: string, imageUrl: string) {
  const ig = process.env.META_IG_ID!;
  const container = await graph(`${ig}/media`, { image_url: imageUrl, caption });
  // Instagram behöver en stund på sig att hämta bilden innan den går att publicera.
  for (let i = 0; i < 10; i++) {
    const st: any = await graph(`${container.id}?fields=status_code&access_token=${encodeURIComponent(process.env.META_PAGE_TOKEN!)}`, undefined, "GET");
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR" || st.status_code === "EXPIRED") throw new Error("Instagram kunde inte bearbeta bilden.");
    await new Promise((r) => setTimeout(r, 3000));
  }
  const pub = await graph(`${ig}/media_publish`, { creation_id: container.id });
  return pub as { id: string };
}

async function comment(objectId: string, message: string) {
  return graph(`${objectId}/comments`, { message });
}

export type PublishOutcome = {
  facebook?: { id?: string; error?: string };
  instagram?: { id?: string; error?: string };
};

// Publicerar på båda. Misslyckas den ena får den andra ändå gå ut, och felet sparas.
export async function publishToMeta(post: { caption: string; image_url: string; first_comment?: string | null }): Promise<PublishOutcome> {
  const out: PublishOutcome = {};
  try {
    const fb = await publishFacebook(post.caption, post.image_url);
    out.facebook = { id: fb.post_id || fb.id };
    if (post.first_comment) await comment(fb.post_id || fb.id, post.first_comment).catch(() => {});
  } catch (e: any) {
    out.facebook = { error: e.message };
  }
  try {
    const ig = await publishInstagram(post.caption, post.image_url);
    out.instagram = { id: ig.id };
    if (post.first_comment) await comment(ig.id, post.first_comment).catch(() => {});
  } catch (e: any) {
    out.instagram = { error: e.message };
  }
  return out;
}
