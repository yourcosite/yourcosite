import AdminSidebar from "@/components/AdminSidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let fullName = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    fullName = profile?.full_name ?? "";
  }

  return (
    <div className="min-h-screen bg-bg font-sans flex">
      <AdminSidebar adminName={fullName} adminEmail={user?.email ?? ""} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
