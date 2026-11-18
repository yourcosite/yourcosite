"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Steg två vid inloggning: sexsiffrig kod från autentiseringsappen, eller en
// reservkod om telefonen är borta. Texterna tas in som props så att samma
// komponent fungerar på kundens (översatta) och adminens (svenska) inloggning.
export type MfaTexts = {
  title: string; hint: string; code: string; verify: string; verifying: string;
  wrong: string; useBackup: string; useApp: string; backupLabel: string; backupHint: string; signOut: string;
};

export default function MfaChallenge({ texts, onDone, onSignOut }: { texts: MfaTexts; onDone: () => void; onSignOut: () => void }) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.mfa.listFactors().then(({ data }) => setFactorId(data?.totp?.[0]?.id ?? null));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    if (backup) {
      const res = await fetch("/api/auth/mfa/use-backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (!res.ok) { setBusy(false); setError(((await res.json().catch(() => ({}))).error as string) || texts.wrong); return; }
      await supabase.auth.refreshSession();
      onDone();
      return;
    }
    if (!factorId) { setBusy(false); return; }
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, "") });
    if (err) { setBusy(false); setError(texts.wrong); return; }
    onDone();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <div className="text-[17px] font-semibold mb-1">{texts.title}</div>
        <p className="text-[14px] text-ink-dim">{backup ? texts.backupHint : texts.hint}</p>
      </div>
      <div>
        <label htmlFor="mfa-code" className="block text-[13.5px] font-semibold mb-1.5">{backup ? texts.backupLabel : texts.code}</label>
        <input
          id="mfa-code"
          autoFocus
          required
          inputMode={backup ? "text" : "numeric"}
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={backup ? "XXXXX-XXXXX" : "123456"}
          className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[17px] tracking-widest"
        />
      </div>
      {error && <div className="text-[13.5px] text-warm font-medium -mt-1">{error}</div>}
      <button type="submit" disabled={busy || (!backup && !factorId)} className="block text-center bg-accent text-accent-ink font-semibold text-[15.5px] py-3.5 rounded-[10px] disabled:opacity-60">
        {busy ? texts.verifying : texts.verify}
      </button>
      <div className="flex justify-between gap-3 text-[13.5px] font-medium">
        <button type="button" onClick={() => { setBackup(!backup); setCode(""); setError(null); }}>{backup ? texts.useApp : texts.useBackup}</button>
        <button type="button" onClick={onSignOut} className="text-ink-dim">{texts.signOut}</button>
      </div>
    </form>
  );
}
