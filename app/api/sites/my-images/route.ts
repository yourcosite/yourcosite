import { getT } from "@/lib/i18n/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withErrorLog } from "@/lib/errorLog";

// Kundens egna, tidigare uppladdade bilder (från onboarding och chatten), så
// de kan väljas igen i chatten utan att laddas upp på nytt. Listningen görs
// med serverns nyckel men bara i kundens EGEN mapp (uploads/<användar-id>/).
export const dynamic = "force-dynamic";

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

async function GET_handler() {
  const t = getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("Inte inloggad.") }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("uploads")
    .list(user.id, { limit: 500, sortBy: { column: "created_at", order: "desc" } });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const images = (data ?? [])
    .filter((f) => f.name && IMAGE_EXT.test(f.name))
    .map((f) => ({
      name: f.name,
      url: admin.storage.from("uploads").getPublicUrl(`${user.id}/${f.name}`).data.publicUrl,
    }));
  return NextResponse.json({ images });
}

export const GET = withErrorLog("GET /api/sites/my-images", GET_handler);
