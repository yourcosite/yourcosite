import AccountHeader from "@/components/AccountHeader";
import SettingsForm from "./SettingsForm";
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
  const email = user?.email ?? "";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, phone, company_name, org_number, address_street, address_postal_code, address_city, billing_email"
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
  }

  return (
    <div className="min-h-screen bg-bg font-sans flex flex-col">
      <AccountHeader active="/installningar" userName={fullName || email} userEmail={email} />

      <div className="flex-1 px-6 md:px-12 py-10 flex gap-10">
        <div className="w-[170px] flex-shrink-0 hidden md:flex flex-col gap-1">
          <a className="px-3 py-2 rounded-lg bg-accent-soft text-ink font-semibold text-[13.5px]">Konto</a>
          <a className="px-3 py-2 rounded-lg text-ink-dim text-[13.5px]">Lösenord</a>
          <a className="px-3 py-2 rounded-lg text-ink-dim text-[13.5px]">Notiser</a>
          <a className="px-3 py-2 rounded-lg text-warm text-[13.5px] mt-3.5">Ta bort konto</a>
        </div>

        <SettingsForm
          fullName={fullName}
          email={email}
          phone={phone}
          companyName={companyName}
          orgNumber={orgNumber}
          addressStreet={addressStreet}
          addressPostalCode={addressPostalCode}
          addressCity={addressCity}
          billingEmail={billingEmail}
        />
      </div>
    </div>
  );
}
