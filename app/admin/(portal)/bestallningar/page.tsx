import { createClient } from "@/lib/supabase/server";
import BestallningarClient from "./BestallningarClient";

export const dynamic = "force-dynamic";

export default async function BestallningarPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("addon_orders")
    .select("id, kind, label, created_at, handled_at, user_id, customer:profiles!addon_orders_user_id_fkey(full_name, email), site:sites(name)")
    .order("created_at", { ascending: false })
    .limit(200);
  return <BestallningarClient initial={(data ?? []) as any} missingTable={!!error} />;
}
