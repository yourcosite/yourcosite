"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import MfaChallenge from "@/components/MfaChallenge";
import TwoFactorSetup from "@/components/TwoFactorSetup";
import { createClient } from "@/lib/supabase/client";

// Personal måste ha tvåstegsverifiering. Har kontot ingen än visas
// uppsättningen, har det en visas kodrutan.
export default function AdminTwoFactorPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"loading" | "challenge" | "setup">("loading");

  useEffect(() => {
    createClient().auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      if (data?.currentLevel === "aal1" && data?.nextLevel === "aal2") setMode("challenge");
      else if (data?.currentLevel === "aal2") router.replace("/admin");
      else setMode("setup");
    });
  }, [router]);

  const done = () => { router.push("/admin"); router.refresh(); };
  const signOut = async () => { await createClient().auth.signOut(); router.push("/admin/logga-in"); router.refresh(); };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-6 py-10 font-sans">
      <div className="w-full max-w-[420px]">
        <div className="flex justify-center mb-8"><Logo /></div>
        <div className="bg-surface rounded-2xl p-7">
          {mode === "challenge" && (
            <MfaChallenge
              onDone={done}
              onSignOut={signOut}
              texts={{ title: "Bekräfta din identitet", hint: "Skriv in den sexsiffriga koden från din autentiseringsapp.", code: "Kod", verify: "Logga in", verifying: "Kontrollerar …", wrong: "Fel kod. Försök igen.", useBackup: "Använd en reservkod", useApp: "Använd appen i stället", backupLabel: "Reservkod", backupHint: "Skriv in en av dina reservkoder. Tvåstegsverifieringen stängs då av och du sätter upp den på nytt efteråt.", signOut: "Logga ut" }}
            />
          )}
          {mode === "setup" && (
            <>
              <p className="text-[13.5px] text-ink-dim mb-4">Personal måste ha tvåstegsverifiering. Sätt upp den för att komma vidare.</p>
              <TwoFactorSetup
                required
                onEnabled={done}
                texts={{ title: "Tvåstegsverifiering", intro: "", enable: "Sätt upp tvåstegsverifiering", scan: "Öppna din autentiseringsapp (till exempel Google Authenticator, Microsoft Authenticator eller 1Password) och skanna QR-koden.", orEnter: "Går det inte att skanna? Skriv in den här nyckeln i appen:", enterCode: "Skriv in den sexsiffriga koden som appen visar", confirm: "Bekräfta och slå på", wrong: "Fel kod. Försök igen.", on: "Tvåstegsverifiering är påslagen.", off: "Av", backupTitle: "Spara dina reservkoder", backupHint: "Om du tappar telefonen kan du logga in med en reservkod i stället. Varje kod fungerar en gång. Spara dem på ett säkert ställe, de visas bara nu.", saved: "Jag har sparat dem", copy: "Kopiera koderna", copied: "Kopierade ✓", newCodes: "Skapa nya reservkoder", disable: "Stäng av", disableConfirm: "", working: "Hämtar …", required: "Tvåstegsverifiering krävs för personal.", error: "Något gick fel. Försök igen." }}
              />
              <button type="button" onClick={signOut} className="mt-4 text-[13px] text-ink-dim">Logga ut</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
