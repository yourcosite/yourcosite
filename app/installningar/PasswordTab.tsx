"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Riktigt lösenordsbyte — tidigare fanns ingen sida bakom
// "Lösenord"-länken i sidomenyn alls (ett dött <a>-tag). Kräver inget
// nuvarande lösenord: kunden är redan inloggad med en giltig session i
// webbläsaren, och Supabase auth.updateUser() byter lösenordet för just
// den sessionen — samma mönster som Supabase själva rekommenderar för ett
// "byt lösenord"-läge (skiljer sig från ett "glömt lösenord"-flöde, som
// går via e-post istället).
export default function PasswordTab() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setSaved(false);

    if (password.length < 8) {
      setError("Lösenordet måste vara minst 8 tecken.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Lösenorden matchar inte.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setSaved(true);
  };

  return (
    <div className="flex-1 max-w-[560px]">
      <h1 className="text-[28px] font-medium mb-6.5">Lösenord</h1>

      <div className="bg-surface border border-line rounded-2xl p-6 mb-6">
        <div className="mb-4">
          <label className="block text-[13px] font-semibold mb-1.5">Nytt lösenord</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minst 8 tecken"
            className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
          />
        </div>
        <div>
          <label className="block text-[13px] font-semibold mb-1.5">Bekräfta nytt lösenord</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
          />
        </div>
      </div>

      {error && <div className="text-[13.5px] text-warm font-medium mb-3">{error}</div>}
      {saved && (
        <div className="text-[13.5px] text-ink font-medium mb-3 bg-accent-soft inline-block px-3 py-1.5 rounded-lg">
          Lösenordet är bytt!
        </div>
      )}

      <div>
        <button
          onClick={handleSave}
          disabled={saving || !password || !confirmPassword}
          className="bg-accent text-accent-ink font-semibold text-[14.5px] px-6.5 py-3 rounded-[10px] disabled:opacity-60"
        >
          {saving ? "Byter …" : "Byt lösenord"}
        </button>
      </div>
    </div>
  );
}
