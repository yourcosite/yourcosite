"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { createClient } from "@/lib/supabase/client";
import { MAX_PASTED_CHARS, PASTED_TEXT_NAME } from "@/lib/pastedText";

// Ruta i onboarding där kunden klistrar in text från sin gamla hemsida (eller
// skriver sidornas rubriker med text under) i stället för att samla allt i en
// fil. Texten sparas som ett textdokument och används av genereringen som
// kundens eget material. Sparas när rutan lämnas, och alltid innan man går vidare.
export default function PastedTextBox({ registerFlush }: { registerFlush?: (fn: () => Promise<void>) => void }) {
  const t = useT();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");
  const savedText = useRef("");
  const assetId = useRef<string | null>(null);
  const textRef = useRef("");
  textRef.current = text;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/onboarding/assets");
        const data = await res.json();
        const found = (data.assets || []).find((a: any) => a.file_name === PASTED_TEXT_NAME);
        if (!found) return;
        const r = await fetch(found.file_url);
        const body = r.ok ? await r.text() : "";
        if (!alive) return;
        assetId.current = found.id;
        savedText.current = body;
        setText(body);
      } catch { /* tom ruta */ }
    })();
    return () => { alive = false; };
  }, []);

  const save = async () => {
    const value = textRef.current.trim();
    if (value === savedText.current.trim()) return;
    setStatus("saving");
    try {
      const oldId = assetId.current;
      if (value) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("not signed in");
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`;
        const { error: upErr } = await supabase.storage.from("uploads").upload(path, new Blob([value], { type: "text/plain" }), { contentType: "text/plain" });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);
        const res = await fetch("/api/onboarding/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: PASTED_TEXT_NAME, fileUrl: pub.publicUrl, mimeType: "text/plain" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        assetId.current = data.asset.id;
      } else {
        assetId.current = null;
      }
      if (oldId) await fetch(`/api/onboarding/assets/${oldId}`, { method: "DELETE" });
      savedText.current = value;
      setStatus("saved");
    } catch (e) {
      setStatus("error");
      throw e;
    }
  };

  useEffect(() => { registerFlush?.(save); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mb-5">
      <label htmlFor="pasted-text" className="block text-[15px] font-semibold mb-1.5">
        {t("Har du redan en hemsida eller en text? Klistra in den här")}
      </label>
      <p className="text-[13.5px] text-ink-dim mb-2.5 leading-relaxed">
        {t("Kopiera texten från din gamla hemsida och klistra in den. Skriv gärna sidans rubrik på en egen rad, till exempel “Om oss” eller “Kontakt”, så hamnar texten på rätt sida. Behöver inte vara snyggt, vi sorterar det åt dig.")}
      </p>
      <textarea
        id="pasted-text"
        value={text}
        maxLength={MAX_PASTED_CHARS}
        onChange={(e) => { setText(e.target.value); setStatus(""); }}
        onBlur={() => { save().catch(() => {}); }}
        rows={8}
        placeholder={t("Till exempel:\n\nOm oss\nVi är ett familjeföretag som …\n\nTjänster\nVi erbjuder …")}
        className="w-full box-border px-3.5 py-3 border border-line rounded-[10px] text-[14.5px] leading-relaxed resize-y bg-surface"
      />
      <div className="flex justify-between text-[12.5px] text-ink-dim mt-1.5">
        <span>
          {status === "saving" && t("Sparar …")}
          {status === "saved" && t("Sparad ✓")}
          {status === "error" && <span className="text-warm">{t("Kunde inte spara texten. Försök igen.")}</span>}
        </span>
        <span>{text.length.toLocaleString("sv-SE")} / {MAX_PASTED_CHARS.toLocaleString("sv-SE")}</span>
      </div>
    </div>
  );
}
