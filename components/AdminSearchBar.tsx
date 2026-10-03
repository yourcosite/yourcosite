"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Result = { id: string; full_name: string | null; email: string; company_name: string | null };

export default function AdminSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
      setLoading(false);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div ref={boxRef} className="relative w-[320px]">
      <div className="flex items-center gap-2 bg-surface border border-line rounded-[10px] px-3.5 py-2">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#6B6A66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Sök kund, företag eller e-post …"
          className="border-none outline-none text-[13.5px] flex-1 bg-transparent"
        />
      </div>

      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-surface border border-line rounded-[12px] shadow-lg z-40 overflow-hidden">
          {loading && <div className="px-4 py-3 text-[13px] text-ink-dim">Söker …</div>}
          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <div className="px-4 py-3 text-[13px] text-ink-dim">Inga träffar.</div>
          )}
          {!loading &&
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  router.push(`/admin/kunder/${r.id}`);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-bg border-b border-line last:border-b-0"
              >
                <div className="text-[13.5px] font-semibold">{r.full_name || r.email}</div>
                <div className="text-[12px] text-ink-dim">
                  {r.company_name ? `${r.company_name} · ` : ""}
                  {r.email}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
