import AdminCustomersClient from "./AdminCustomersClient";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCustomersPage() {
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, phone, company_name, org_number, address_street, address_postal_code, address_city, billing_email, role, created_at, sites(id, name, domain, status, plan)"
    )
    .order("created_at", { ascending: false });

  return (
    <AdminCustomersClient
      initialCustomers={(customers ?? []).filter((c) => c.role !== "admin") as any}
    />
  );
}
