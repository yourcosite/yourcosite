"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingShell from "@/components/OnboardingShell";
import { createClient } from "@/lib/supabase/client";

// Steg 2 av registreringen (steg 1 är app/skapa-konto, kontaktuppgifter).
// Kunden väljer paket och ser var kortuppgifter kommer in — men riktig
// kortbetalning är inte byggd än (kräver ett Stripe-konto vi inte kan
// skapa åt kunden), så det syns tydligt som "kommer snart" och går att
// hoppa över helt. Vad som valdes (eller inte) sparas på profiles
// (chosen_plan/billing_setup_complete, se supabase/schema.sql) så staff
// kan se i adminportalen vem som behöver kontaktas för att slutföra det.
const PLANS = [
  {
    id: "bas",
    name: "Bas",
    price: "149 kr",
    body: "För er som vill komma igång enkelt med en sajt.",
    features: ["1 sajt", "25 ändringar/månad", "Egen domän"],
    popular: false,
  },
  {
    id: "standard",
    name: "Standard",
    price: "249 kr",
    body: "För verksamheter som finslipar sajten löpande.",
    features: ["60 ändringar/månad", "Nyhetsmodul med AI-förslag", "Flerspråkigt (2 språk)"],
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "399 kr",
    body: "För er med flera sajter eller högre tempo.",
    features: ["Upp till 3 sajter", "150 ändringar/månad", "Prioriterad support"],
    popular: false,
  },
] as const;

type PlanId = (typeof PLANS)[number]["id"];

export default function SignupPlanPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/skapa-konto");
        return;
      }
      supabase
        .from("profiles")
        .select("chosen_plan")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.chosen_plan) setPlan(data.chosen_plan as PlanId);
        });
    });
  }, [router]);

  const finish = async (chosenPlan: PlanId | null) => {
    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Du är inte inloggad längre.");

      // billing_setup_complete lämnas false här medvetet — se kommentaren
      // högst upp i filen, riktig kortkoppling finns inte att slutföra än.
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ chosen_plan: chosenPlan })
        .eq("id", user.id);
      if (updateError) throw new Error(updateError.message);

      // Bekräftelsen sparas separat och "best effort": kolumnen
      // content_terms_accepted_at måste finnas i databasen (se
      // supabase/schema.sql) — saknas den ska registreringen ändå gå igenom.
      if (accepted) {
        await supabase
          .from("profiles")
          .update({ content_terms_accepted_at: new Date().toISOString() })
          .eq("id", user.id);
      }

      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <OnboardingShell step={2} totalSteps={2} stepLabel="Paket och betalning">
      <div className="w-full max-w-[720px]">
        <h1 className="text-[26px] font-medium mb-2">Välj paket</h1>
        <p className="text-[14.5px] text-ink-dim mb-7">
          Du kan byta paket när som helst senare i Fakturering. Det går
          bra att hoppa över det här steget helt för nu också.
        </p>

        <div className="grid sm:grid-cols-3 gap-3.5 mb-7">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              className={`text-left bg-surface border rounded-2xl p-5 relative ${
                plan === p.id ? "border-ink ring-1 ring-ink" : "border-line"
              }`}
            >
              {p.popular && (
                <span className="absolute -top-2.5 left-5 bg-accent text-accent-ink text-[10.5px] font-bold px-2 py-0.5 rounded-full">
                  POPULÄRAST
                </span>
              )}
              <div className="font-semibold text-[15.5px] mb-1">{p.name}</div>
              <div className="text-[20px] font-medium mb-1.5">
                {p.price}
                <span className="text-[12.5px] text-ink-dim font-normal"> /mån</span>
              </div>
              <p className="text-[12.5px] text-ink-dim mb-3 leading-relaxed">{p.body}</p>
              <ul className="flex flex-col gap-1.5">
                {p.features.map((f) => (
                  <li key={f} className="text-[12.5px] text-ink-dim">
                    · {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6 mb-7 opacity-70">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold text-[15px]">Betalkort</div>
            <span className="text-[11px] font-bold text-ink-dim bg-bg border border-line px-2.5 py-1 rounded-full">
              KOMMER SNART
            </span>
          </div>
          <p className="text-[12.5px] text-ink-dim mb-4 leading-relaxed">
            Vi har inte kopplat på kortbetalning än — inga kortuppgifter går
            att fylla i eller sparas här ännu. Du kan välja paket ovan ändå,
            vi hör av oss när det är dags att lägga in betalningen.
          </p>
          <div className="grid sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[12.5px] font-semibold mb-1.5 text-ink-dim">Kortnummer</label>
              <input disabled placeholder="•••• •••• •••• ••••" className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px] bg-bg text-ink-dim cursor-not-allowed" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[12.5px] font-semibold mb-1.5 text-ink-dim">Utgångsdatum</label>
                <input disabled placeholder="MM/ÅÅ" className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px] bg-bg text-ink-dim cursor-not-allowed" />
              </div>
              <div className="flex-1">
                <label className="block text-[12.5px] font-semibold mb-1.5 text-ink-dim">CVC</label>
                <input disabled placeholder="•••" className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[15px] bg-bg text-ink-dim cursor-not-allowed" />
              </div>
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 bg-surface border border-line rounded-2xl p-4 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 w-4 h-4 shrink-0 accent-[var(--accent,#000)]"
          />
          <span className="text-[13px] leading-relaxed text-ink-dim">
            Jag förstår att texter, kundcitat, nyckeltal och annat innehåll som
            AI skapar åt mig är förslag och exempel som jag själv ansvarar för
            att granska, byta ut eller ta bort innan publicering. Jag godkänner{" "}
            <a href="/anvandarvillkor" target="_blank" className="underline text-ink">
              användarvillkoren
            </a>
            .
          </span>
        </label>

        {error && <div className="text-[13.5px] text-warm font-medium mb-4">{error}</div>}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            disabled={saving || !plan || !accepted}
            onClick={() => finish(plan)}
            className="bg-accent text-accent-ink font-semibold text-[15px] px-6 py-3.5 rounded-[10px] disabled:opacity-60"
          >
            {saving ? "Sparar …" : "Spara och fortsätt →"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => finish(accepted ? plan : null)}
            className="text-[14px] font-semibold text-ink-dim px-3 py-3.5 disabled:opacity-60"
          >
            Hoppa över för nu
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}
