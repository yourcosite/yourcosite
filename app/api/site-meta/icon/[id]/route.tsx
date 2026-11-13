import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidSiteContent } from "@/lib/contentModel";
import { initialsOf, readableOn } from "@/lib/siteMeta";

// Genererad favicon för en kunds sajt: initialer på sajtens accentfärg.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data } = await admin.from("sites").select("name, content, status").eq("id", params.id).maybeSingle();
  const content = data && isValidSiteContent(data.content) ? data.content : null;
  const name = data?.name || "?";
  const bg = content?.theme.accentColor && /^#[0-9a-f]{6}$/i.test(content.theme.accentColor) ? content.theme.accentColor : "#17171A";
  const text = initialsOf(name);
  const fontSize = text.length >= 3 ? 26 : text.length === 2 ? 34 : 42;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: bg, color: readableOn(bg), fontSize, fontWeight: 800, borderRadius: 14 }}>
        {text}
      </div>
    ),
    { width: 64, height: 64, headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } }
  );
}
