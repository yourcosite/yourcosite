import { createClient } from "@/lib/supabase/server";
import SocialClient from "./SocialClient";
import { metaConfigured } from "@/lib/metaPublish";

export const dynamic = "force-dynamic";

export default async function SocialPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_posts")
    .select("id, caption, first_comment, image_url, scheduled_at, status, error, created_at, published_at")
    .order("scheduled_at", { ascending: true, nullsFirst: true })
    .limit(200);
  return <SocialClient initial={(data ?? []) as any} missingTable={!!error} metaReady={metaConfigured()} />;
}
