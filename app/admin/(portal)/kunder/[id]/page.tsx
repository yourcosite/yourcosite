import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CustomerDetailClient from "./CustomerDetailClient";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role: "support" | "admin" | "superadmin" | null = null;
  if (user) {
    const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    role = (me?.role as typeof role) ?? null;
  }

  const { data: customer } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, phone, company_name, org_number, address_street, address_postal_code, address_city, billing_email, chosen_plan, billing_setup_complete, created_at, sites(id, name, domain, status, plan, created_at)"
    )
    .eq("id", params.id)
    .eq("role", "customer")
    .single();

  if (!customer) notFound();

  // Nya kolumner och supporthistoriken kommer från supabase/sprak.sql;
  // sidan fungerar även innan den körts.
  const { data: extra } = await supabase
    .from("profiles")
    .select("country, language, vat_number, legal_form, company_register, company_capital, company_representative")
    .eq("id", params.id)
    .maybeSingle();
  let supportHistory: any[] = [];
  const hist = await supabase
    .from("support_messages")
    .select("id, source, message, message_sv, language, status, created_at, replies:support_replies(id, body_sv, body_sent, language, emailed, created_at)")
    .eq("user_id", params.id)
    .order("created_at", { ascending: false });
  if (hist.data) supportHistory = hist.data;
  else {
    const old = await supabase
      .from("support_messages")
      .select("id, source, message, status, created_at")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false });
    supportHistory = old.data ?? [];
  }

  const { data: notes } = await supabase
    .from("customer_notes")
    .select("id, content, author_name, created_at")
    .eq("customer_id", params.id)
    .order("created_at", { ascending: false });

  let activity: { id: string; action: string; actor_name: string; created_at: string }[] = [];
  if (role === "admin" || role === "superadmin") {
    const { data } = await supabase
      .from("admin_activity_log")
      .select("id, action, actor_name, created_at")
      .eq("target_id", params.id)
      .order("created_at", { ascending: false })
      .limit(15);
    activity = data ?? [];
  }

  const canEdit = role === "admin" || role === "superadmin";
  const isSuperadmin = role === "superadmin";

  return (
    <CustomerDetailClient
      customer={{ ...(customer as any), ...(extra ?? {}) }}
      supportHistory={supportHistory}
      initialNotes={notes ?? []}
      activity={activity}
      canEdit={canEdit}
      isSuperadmin={isSuperadmin}
    />
  );
}
