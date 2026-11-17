import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { findPublicSite, renderPublicSite } from "@/lib/publicSite";
import CancelGeneric from "./CancelGeneric";

// Kundens avbokningssida (länken i bokningsmejlet). Hör bokningen till en
// publicerad sajt visas sidan i sajtens egen design (meny, färger, typsnitt,
// sidfot). Annars visas den enkla standardsidan. Fungerar på både
// yourcosite.com och kundens egen domän.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CancelBookingPage({ params }: { params: { token: string } }) {
  const token = params.token;
  if (/^[0-9a-f]{40,80}$/i.test(token)) {
    try {
      const db = createAdminClient();
      const { data: b } = await db.from("bookings").select("site_id").eq("cancel_token", token).maybeSingle();
      const { data: s } = b ? await db.from("sites").select("slug, custom_domain").eq("id", (b as any).site_id).maybeSingle() : { data: null };
      const found = s ? await findPublicSite((s as any).custom_domain ? { host: (s as any).custom_domain } : { slug: (s as any).slug }) : null;
      if (found && found.state === "live") return renderPublicSite(found.site, "/avboka", "/", token);
    } catch {
      /* faller tillbaka på standardsidan */
    }
  }
  return <CancelGeneric params={params} />;
}
