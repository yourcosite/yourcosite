"use client";

import { useT } from "@/components/I18nProvider";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Språk + e-postnotiser — tidigare två block som satt mitt i
// SettingsForm.tsx men bara ändrade lokal React-state och aldrig sparades
// någonstans (varken till profiles eller nånstans annars). Nu riktiga
// kolumner på profiles (language, notify_changes_published, notify_billing,
// notify_tips), laddade från databasen i page.tsx och sparade här precis
// som kontouppgifterna i AccountTab.tsx.
export default function NotificationsTab({
  notifyChangesPublished,
  notifyBilling,
  notifyTips,
}: {
  notifyChangesPublished: boolean;
  notifyBilling: boolean;
  notifyTips: boolean;
}) {
  const t = useT();
  const [toggles, setToggles] = useState([
    { id: "changes", label: t("Ändringar publicerade"), desc: t("Mejl varje gång en ändring går live"), on: notifyChangesPublished },
    { id: "billing", label: t("Fakturering"), desc: t("Kvitton och betalpåminnelser"), on: notifyBilling },
    { id: "tips", label: t("Tips och nyheter"), desc: t("Då och då, inget skräppost"), on: notifyTips },
  ]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setToggles((ts) => ts.map((t) => (t.id === id ? { ...t, on: !t.on } : t)));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError(t("Du är inte inloggad."));
      setSaving(false);
      return;
    }

    const byId = (id: string) => toggles.find((t) => t.id === id)?.on ?? false;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        notify_changes_published: byId("changes"),
        notify_billing: byId("billing"),
        notify_tips: byId("tips"),
      })
      .eq("id", user.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSaved(true);
  };

  return (
    <div className="flex-1 max-w-[560px]">
      <h1 className="text-[28px] font-medium mb-6.5">{t("Notiser")}</h1>

      <div className="bg-surface border border-line rounded-2xl p-6 mb-6">
        <div className="font-semibold text-[15px] mb-4">{t("E-postnotiser")}</div>
        {toggles.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-line last:border-b-0">
            <div>
              <div className="text-[13.5px] font-semibold">{t.label}</div>
              <div className="text-[12px] text-ink-dim mt-0.5">{t.desc}</div>
            </div>
            <button
              onClick={() => toggle(t.id)}
              aria-label={t.label}
              className="w-[42px] h-6 rounded-full relative flex-shrink-0"
              style={{ background: t.on ? "#C6FF5E" : "#D9D6CE" }}
            >
              <div
                className="w-[18px] h-[18px] rounded-full bg-white absolute top-[3px] transition-all"
                style={{ left: t.on ? "21px" : "3px" }}
              />
            </button>
          </div>
        ))}
      </div>

      {error && <div className="text-[13.5px] text-warm font-medium mb-3">{error}</div>}
      {saved && (
        <div className="text-[13.5px] text-ink font-medium mb-3 bg-accent-soft inline-block px-3 py-1.5 rounded-lg">
          {t("Sparat!")}
        </div>
      )}

      <div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent text-accent-ink font-semibold text-[14.5px] px-6.5 py-3 rounded-[10px] disabled:opacity-60"
        >
          {saving ? t("Sparar …") : t("Spara ändringar")}
        </button>
      </div>
    </div>
  );
}
