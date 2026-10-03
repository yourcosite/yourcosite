import AdminHeader from "@/components/AdminHeader";
import AdminCustomersClient from "./AdminCustomersClient";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: customers } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, role, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <AdminHeader adminEmail={user?.email ?? ""} />
      <AdminCustomersClient initialCustomers={(customers ?? []).filter((c) => c.role !== "admin")} />
    </div>
  );
}
