import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidSiteContent } from "@/lib/contentModel";
import { readableOn } from "@/lib/siteMeta";

// Genererad delningsbild (1200x630) när kunden inte har någon egen och
// startsidan saknar toppbild: sajtens namn och beskrivning på dess färger.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data } = await admin.from("sites").select("name, content, status").eq("id", params.id).maybeSingle();
  const content = data && isValidSiteContent(data.content) ? data.content : null;
  const hex = (c: string | undefined, d: string) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : d);
  const accent = hex(content?.theme.accentColor, "#C6FF5E");
  const bg = content?.theme.backgroundMode === "dark" ? hex(content?.theme.secondaryColors?.[0], "#17171A") : "#17171A";
  const fg = readableOn(bg);
  const desc = (content?.pages[0]?.seoDescription || "").slice(0, 140);
  const name = data?.name || "";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 90px", background: bg, color: fg }}>
        <div style={{ width: 90, height: 10, background: accent, borderRadius: 5, marginBottom: 40, display: "flex" }} />
        <div style={{ fontSize: name.length > 28 ? 66 : 84, fontWeight: 800, lineHeight: 1.05, display: "flex" }}>{name}</div>
        {desc && <div style={{ fontSize: 32, marginTop: 28, opacity: 0.75, lineHeight: 1.3, display: "flex" }}>{desc}</div>}
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } }
  );
}
