import AdminSidebar from "@/components/AdminSidebar";
import AdminSearchBar from "@/components/AdminSearchBar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let fullName = "";
  let role: "support" | "admin" | "superadmin" | undefined;
  let newMessageCount = 0;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();
    fullName = profile?.full_name ?? "";
    role = profile?.role as "support" | "admin" | "superadmin" | undefined;

    const { count } = await supabase
      .from("support_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "ny");
    newMessageCount = count ?? 0;
  }

  return (
    <div className="min-h-screen bg-bg font-sans flex">
      <AdminSidebar
        adminName={fullName}
        adminEmail={user?.email ?? ""}
        role={role}
        newMessageCount={newMessageCount}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-11 pt-5 flex-shrink-0">
          <AdminSearchBar />
        </div>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
