import AdminMeddelandenClient from "./AdminMeddelandenClient";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMeddelandenPage() {
  const supabase = await createClient();

  const base = "id, source, context, message, status, created_at, site_id, customer:profiles!support_messages_user_id_fkey(id, full_name, email, language), site:sites(name)";
  // Språk, översättning och svar kommer från supabase/sprak.sql. Saknas de
  // visas meddelandena ändå, bara utan det extra.
  let messages: any[] | null = null;
  const first = await supabase
    .from("support_messages")
    .select(`${base}, language, message_sv, replies:support_replies(id, body_sv, body_sent, language, emailed, created_at)`)
    .order("created_at", { ascending: false });
  messages = first.data as any[] | null;
  if (first.error) {
    ({ data: messages } = await supabase
      .from("support_messages")
      .select(base)
      .order("created_at", { ascending: false }));
  }

  return <AdminMeddelandenClient initialMessages={(messages ?? []) as any} />;
}
