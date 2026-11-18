"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Slå på, se status för och stäng av tvåstegsverifiering (app med engångskod).
// Reservkoder skapas när den slås på och kan skapas om. "required" döljer
// avstängning (gäller personal).
export type TwoFactorTexts = Record<
  | "title" | "intro" | "enable" | "scan" | "orEnter" | "enterCode" | "confirm" | "wrong" | "on" | "off"
  | "backupTitle" | "backupHint" | "saved" | "copy" | "copied" | "newCodes" | "disable" | "disableConfirm" | "working" | "required" | "error",
  string
>;

export default function TwoFactorSetup({ texts, required, onEnabled }: { texts: TwoFactorTexts; required?: boolean; onEnabled?: () => void }) {
  const [state, setState] = useState<"loading" | "off" | "enroll" | "codes" | "on">("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const { data } = await createClient().auth.mfa.listFactors();
    const active = data?.totp?.[0];
    setFactorId(active?.id ?? null);
    setState(active ? "on" : "off");
  };
  useEffect(() => { refresh(); }, []);

  const start = async () => {
    setBusy(true); setError(null);
    const supabase = createClient();
    // Rensa påbörjade men aldrig bekräftade försök.
    const { data: all } = await supabase.auth.mfa.listFactors();
    for (const f of (all?.all ?? []).filter((x) => x.status === "unverified")) await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${Date.now()}` });
    setBusy(false);
    if (err || !data) { setError(texts.error); return; }
    setFactorId(data.id); setQr(data.totp.qr_code); setSecret(data.totp.secret); setCode(""); setState("enroll");
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true); setError(null);
    const { error: err } = await createClient().auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, "") });
    if (err) { setBusy(false); setError(texts.wrong); return; }
    await newCodes();
    setBusy(false);
    setState("codes");
  };

  const newCodes = async () => {
    const res = await fetch("/api/auth/mfa/backup-codes", { method: "POST" });
    const j = await res.json().catch(() => ({}));
    if (res.ok) setCodes(j.codes);
    else setError(j.error || texts.error);
  };

  const regenerate = async () => {
    setBusy(true); setError(null);
    await newCodes();
    setBusy(false);
    setState("codes");
  };

  const disable = async () => {
    if (!factorId || !window.confirm(texts.disableConfirm)) return;
    setBusy(true); setError(null);
    const { error: err } = await createClient().auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (err) { setError(texts.error); return; }
    await refresh();
  };

  const btn = "bg-accent text-accent-ink font-semibold text-[14px] px-5 py-2.5 rounded-[10px] disabled:opacity-60";
  const ghost = "bg-surface border border-line text-ink font-semibold text-[14px] px-5 py-2.5 rounded-[10px] disabled:opacity-60";

  return (
    <div className="bg-surface border border-line rounded-2xl p-6">
      <h2 className="text-[17px] font-semibold mb-1">{texts.title}</h2>
      {state === "loading" && <p className="text-[14px] text-ink-dim">{texts.working}</p>}

      {state === "off" && (
        <>
          <p className="text-[14px] text-ink-dim mb-4 leading-relaxed">{required ? texts.required : texts.intro}</p>
          <button type="button" className={btn} disabled={busy} onClick={start}>{texts.enable}</button>
        </>
      )}

      {state === "enroll" && (
        <form onSubmit={confirm} className="flex flex-col gap-4">
          <p className="text-[14px] text-ink-dim leading-relaxed">{texts.scan}</p>
          {qr && /* eslint-disable-next-line @next/next/no-img-element */ <img src={qr} alt="QR" width={180} height={180} className="border border-line rounded-lg p-2 bg-white" />}
          <div className="text-[12.5px] text-ink-dim">{texts.orEnter} <span className="font-mono select-all break-all">{secret}</span></div>
          <div>
            <label htmlFor="tf-code" className="block text-[13px] font-semibold mb-1.5">{texts.enterCode}</label>
            <input id="tf-code" required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" className="w-full max-w-[220px] box-border px-3.5 py-3 border border-line rounded-[10px] text-[17px] tracking-widest" />
          </div>
          {error && <div className="text-[13.5px] text-warm font-medium">{error}</div>}
          <button type="submit" className={btn} disabled={busy}>{texts.confirm}</button>
        </form>
      )}

      {state === "codes" && (
        <div className="flex flex-col gap-4">
          <div className="text-[14px] font-semibold">{texts.backupTitle}</div>
          <p className="text-[14px] text-ink-dim leading-relaxed">{texts.backupHint}</p>
          <div className="grid grid-cols-2 gap-2 max-w-[320px] font-mono text-[15px]">
            {codes.map((c) => <div key={c} className="border border-line rounded-lg px-3 py-2 bg-bg select-all">{c}</div>)}
          </div>
          {error && <div className="text-[13.5px] text-warm font-medium">{error}</div>}
          <div className="flex gap-2 flex-wrap">
            <button type="button" className={ghost} onClick={async () => { try { await navigator.clipboard.writeText(codes.join("\n")); setCopied(true); } catch {} }}>{copied ? texts.copied : texts.copy}</button>
            <button type="button" className={btn} disabled={!codes.length} onClick={() => { setState("on"); onEnabled?.(); }}>{texts.saved}</button>
          </div>
        </div>
      )}

      {state === "on" && (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-[#2F6B44] font-semibold">✓ {texts.on}</p>
          {error && <div className="text-[13.5px] text-warm font-medium">{error}</div>}
          <div className="flex gap-2 flex-wrap">
            <button type="button" className={ghost} disabled={busy} onClick={regenerate}>{texts.newCodes}</button>
            {!required && <button type="button" className={ghost} disabled={busy} onClick={disable}>{texts.disable}</button>}
          </div>
        </div>
      )}
    </div>
  );
}
