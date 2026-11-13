import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidSiteContent } from "@/lib/contentModel";
import { withErrorLog } from "@/lib/errorLog";

// Publicera eller avpublicera en sajt. En publicerad sajt får en publik adress
// (www.yourcosite.com/s/<slug>) och visas för alla; en egen domän kopplas
// separat (/api/sites/domain). Admin kan pausa en sajt (status "pausad"):
// då kan kunden inte publicera den igen själv.
function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/å|ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/é|è|ê/g, "e")
    .replace(/ü/g, "u")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "sajt";
}

async function POST_handler(request: Request) {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const siteId = typeof body.siteId === "string" ? body.siteId : "";
  const publish = body.publish !== false;
  if (!siteId) return NextResponse.json({ error: t("Sajten saknas.") }, { status: 400 });

  const { data: site } = await supabase.from("sites").select("id, name, status, content, slug").eq("id", siteId).eq("owner_id", user.id).maybeSingle();
  if (!site) return NextResponse.json({ error: t("Hittade inte sajten.") }, { status: 404 });
  if (site.status === "pausad") {
    return NextResponse.json({ error: t("Sajten är pausad. Kontakta oss så hjälper vi dig.") }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!publish) {
    const { error } = await admin.from("sites").update({ status: "draft" }).eq("id", site.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: "draft", slug: site.slug });
  }

  if (!isValidSiteContent(site.content)) {
    return NextResponse.json({ error: t("Sajten är inte färdigbyggd ännu.") }, { status: 400 });
  }

  // Adressen väljs en gång och ligger sedan fast.
  let slug: string | null = site.slug;
  if (!slug) {
    const base = slugify(site.name || "sajt");
    for (let i = 0; i < 20 && !slug; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;
      const { data: taken } = await admin.from("sites").select("id").ilike("slug", candidate).maybeSingle();
      if (!taken) slug = candidate;
    }
    if (!slug) slug = `${slugify(site.name || "sajt")}-${Math.random().toString(36).slice(2, 7)}`;
  }

  const { error } = await admin.from("sites").update({ status: "live", slug, published_at: new Date().toISOString() }).eq("id", site.id);
  if (error) {
    const hint = /slug|column/i.test(error.message) ? " (kör supabase/andringar-spark.sql)" : "";
    return NextResponse.json({ error: error.message + hint }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status: "live", slug });
}

export const POST = withErrorLog("POST /api/sites/publish", POST_handler);
