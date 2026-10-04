import AccountHeader from "@/components/AccountHeader";
import SettingsTabs from "./SettingsTabs";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let fullName = "";
  let phone = "";
  let companyName = "";
  let orgNumber = "";
  let addressStreet = "";
  let addressPostalCode = "";
  let addressCity = "";
  let billingEmail = "";
  let language: "sv" | "en" = "sv";
  let notifyChangesPublished = true;
  let notifyBilling = true;
  let notifyTips = false;
  let siteCount = 0;
  const email = user?.email ?? "";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, phone, company_name, org_number, address_street, address_postal_code, address_city, billing_email, language, notify_changes_published, notify_billing, notify_tips"
      )
      .eq("id", user.id)
      .single();
    fullName = profile?.full_name ?? "";
    phone = profile?.phone ?? "";
    companyName = profile?.company_name ?? "";
    orgNumber = profile?.org_number ?? "";
    addressStreet = profile?.address_street ?? "";
    addressPostalCode = profile?.address_postal_code ?? "";
    addressCity = profile?.address_city ?? "";
    billingEmail = profile?.billing_email ?? "";
    language = profile?.language === "en" ? "en" : "sv";
    notifyChangesPublished = profile?.notify_changes_published ?? true;
    notifyBilling = profile?.notify_billing ?? true;
    notifyTips = profile?.notify_tips ?? false;

    const { count } = await supabase
      .from("sites")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);
    siteCount = count ?? 0;
  }

  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <AccountHeader active="/installningar" userName={fullName || email} userEmail={email} />

      <div className="flex-1 px-6 md:px-12 py-10 flex gap-10">
        <SettingsTabs
          fullName={fullName}
          email={email}
          phone={phone}
          companyName={companyName}
          orgNumber={orgNumber}
          addressStreet={addressStreet}
          addressPostalCode={addressPostalCode}
          addressCity={addressCity}
          billingEmail={billingEmail}
          language={language}
          notifyChangesPublished={notifyChangesPublished}
          notifyBilling={notifyBilling}
          notifyTips={notifyTips}
          siteCount={siteCount}
        />
      </div>
    </div>
  );
}
