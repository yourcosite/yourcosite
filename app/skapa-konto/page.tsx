"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [orgNumber, setOrgNumber] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Lösenordet måste vara minst 8 tecken.");
      return;
    }
    if (password !== password2) {
      setError("Lösenorden matchar inte.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Utan den här pekar bekräftelsemejlets länk på Supabase-projektets
        // "Site URL"-inställning istället — som ofta fortfarande står kvar
        // på standardvärdet http://localhost:3000 om ingen ändrat den i
        // Supabase-dashboarden. Sätter den explicit här så den alltid
        // pekar på rätt domän oavsett den inställningen.
        emailRedirectTo: `${window.location.origin}/logga-in`,
        data: {
          full_name: name,
          phone,
          company_name: companyName,
          org_number: orgNumber,
          address_street: addressStreet,
          address_postal_code: addressPostalCode,
          address_city: addressCity,
          billing_email: billingEmail,
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(
        signUpError.message === "User already registered"
          ? "Det finns redan ett konto med den e-postadressen."
          : signUpError.message
      );
      return;
    }

    router.push("/onboarding/1");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen font-sans">
      <div className="hidden md:flex w-[46%] bg-ink text-[#F4F3F0] p-14 flex-col justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <div className="max-w-[440px]">
          <div className="text-[15px] text-[#9E9C97] mb-4 tracking-wide">
            HEMSIDAN BYGGS I ETT SAMTAL
          </div>
          <h1 className="text-[46px] leading-[1.12] font-medium text-white">
            Din hemsida.
            <br />
            <span className="italic text-accent">Byggd genom ett samtal.</span>
          </h1>
          <p className="text-[17px] leading-relaxed text-[#C9C7C2] mt-5">
            Beskriv verksamheten, visa oss vad ni gillar, och låt YourCoSite
            göra resten. Sen fortsätter ni bara att be om ändringar.
          </p>
        </div>
        <div />
      </div>

      <div className="flex-1 flex items-center justify-center bg-surface px-6 py-16 overflow-y-auto">
        <div className="w-full max-w-[440px]">
          <h2 className="text-[28px] font-medium mb-2">Skapa ditt konto</h2>
          <p className="text-[15px] text-ink-dim mb-7">
            Tar under en minut. Nästa steg är att berätta om er
            verksamhet.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="block text-[13.5px] font-semibold mb-1.5">
                Namn
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Förnamn Efternamn"
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-[13.5px] font-semibold mb-1.5">
                E-post
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="du@företag.se"
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>
            <div>
              <label htmlFor="pw" className="block text-[13.5px] font-semibold mb-1.5">
                Lösenord
              </label>
              <input
                id="pw"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minst 8 tecken"
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>
            <div>
              <label htmlFor="pw2" className="block text-[13.5px] font-semibold mb-1.5">
                Bekräfta lösenord
              </label>
              <input
                id="pw2"
                type="password"
                required
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="••••••••"
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>

            <div className="border-t border-line pt-4 mt-1">
              <div className="text-[13px] font-semibold text-ink-dim mb-3.5">
                Företag och fakturering (valfritt, går bra att fylla i senare)
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-[13.5px] font-semibold mb-1.5">
                Telefon
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07X – XXX XX XX"
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>
            <div>
              <label htmlFor="companyName" className="block text-[13.5px] font-semibold mb-1.5">
                Företagsnamn
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>
            <div>
              <label htmlFor="orgNumber" className="block text-[13.5px] font-semibold mb-1.5">
                Organisationsnummer
              </label>
              <input
                id="orgNumber"
                type="text"
                value={orgNumber}
                onChange={(e) => setOrgNumber(e.target.value)}
                placeholder="XXXXXX-XXXX"
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>
            <div>
              <label htmlFor="addressStreet" className="block text-[13.5px] font-semibold mb-1.5">
                Adress
              </label>
              <input
                id="addressStreet"
                type="text"
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
                placeholder="Gatuadress"
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>
            <div className="flex gap-3">
              <div className="w-[120px] flex-shrink-0">
                <label htmlFor="postal" className="block text-[13.5px] font-semibold mb-1.5">
                  Postnummer
                </label>
                <input
                  id="postal"
                  type="text"
                  value={addressPostalCode}
                  onChange={(e) => setAddressPostalCode(e.target.value)}
                  placeholder="XXX XX"
                  className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="city" className="block text-[13.5px] font-semibold mb-1.5">
                  Ort
                </label>
                <input
                  id="city"
                  type="text"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
                />
              </div>
            </div>
            <div>
              <label htmlFor="billingEmail" className="block text-[13.5px] font-semibold mb-1.5">
                Fakturerings-e-post
              </label>
              <input
                id="billingEmail"
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder="Lämna tomt för att använda kontots e-post"
                className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px]"
              />
            </div>

            {error && (
              <div className="text-[13.5px] text-warm font-medium -mt-1">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="block text-center bg-accent text-accent-ink font-semibold text-[15.5px] py-3.5 rounded-[10px] mt-1 disabled:opacity-60"
            >
              {loading ? "Skapar konto …" : "Skapa konto →"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-line" />
            <span className="text-[12.5px] text-ink-dim">ELLER</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <p className="text-center text-[14.5px] text-ink-dim">
            Har du redan ett konto?{" "}
            <Link href="/logga-in" className="font-semibold text-ink">
              Logga in
            </Link>
          </p>
          <p className="text-center text-[11.5px] text-ink-dim mt-4 leading-relaxed">
            Genom att skapa ett konto godkänner du våra{" "}
            <Link href="/anvandarvillkor" className="font-semibold underline">
              användarvillkor
            </Link>{" "}
            och vår{" "}
            <Link href="/integritetspolicy" className="font-semibold underline">
              integritetspolicy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
