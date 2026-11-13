import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPublishedSite } from "@/lib/supabase/currentSite";
import { isValidSiteContent, type SiteContent } from "@/lib/contentModel";
import { withErrorLog } from "@/lib/errorLog";

// Egen delningsbild (visas när sajten delas på sociala medier) och egen
// favicon, uppladdade i redigerarens inställningar. Utan egna bilder
// genereras de automatiskt (lib/siteMeta.ts). multipart: kind=share|favicon
// och file, eller kind + remove=1 för att gå tillbaka till automatiskt.
export const dynamic = "force-dynamic";

const OK_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX = { share: 5 * 1024 * 1024, favicon: 1024 * 1024 };

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const kind = form?.get("kind");
  if (!form || (kind !== "share" && kind !== "favicon")) {
    return NextResponse.json({ error: t("Det gick inte att avgöra vad som ska sparas.") }, { status: 400 });
  }
  const siteIdRaw = form.get("siteId");
  const site = await getCurrentPublishedSite(supabase, user.id, typeof siteIdRaw === "string" && siteIdRaw ? siteIdRaw : null);
  if (!site || !isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Hittade ingen sajt att uppdatera.") }, { status: 400 });
  }
  const content: SiteContent = { ...site.content };
  const field = kind === "share" ? "shareImageUrl" : "faviconUrl";

  if (form.get("remove")) {
    delete content[field];
  } else {
    const file = form.get("file");
    if (!(file instanceof File) || !OK_TYPES.includes(file.type)) {
      return NextResponse.json({ error: t("Välj en bild i formatet PNG, JPG eller WebP.") }, { status: 400 });
    }
    if (file.size > MAX[kind]) {
      return NextResponse.json({ error: t("Bilden är för stor.") }, { status: 400 });
    }
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
    const admin = createAdminClient();
    const { error: upErr } = await admin.storage.from("logos").upload(path, file, { contentType: file.type, upsert: true });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    content[field] = admin.storage.from("logos").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from("sites").update({ content }).eq("id", site.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content });
}

export const POST = withErrorLog("POST /api/sites/site-meta", POST_handler);
