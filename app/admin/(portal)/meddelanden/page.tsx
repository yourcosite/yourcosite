import AdminMeddelandenClient from "./AdminMeddelandenClient";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMeddelandenPage() {
  const supabase = await createClient();

  const { data: messages } = await supabase
    .from("support_messages")
    .select(
      "id, source, context, message, status, created_at, site_id, customer:profiles!support_messages_user_id_fkey(id, full_name, email), site:sites(name)"
    )
    .order("created_at", { ascending: false });

  return <AdminMeddelandenClient initialMessages={(messages ?? []) as any} />;
}
