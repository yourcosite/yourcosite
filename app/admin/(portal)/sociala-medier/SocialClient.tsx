"use client";

import { useState } from "react";

type Post = {
  id: string;
  caption: string;
  first_comment: string | null;
  image_url: string;
  scheduled_at: string | null;
  status: "draft" | "approved" | "rejected" | "published" | "error";
  error: string | null;
  created_at: string;
  published_at: string | null;
};

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("sv-SE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "ingen tid vald";

const SQL_HINT = "Tabellen saknas. Kör supabase/sociala-medier.sql i Supabase SQL Editor.";

export default function SocialClient({ initial, missingTable }: { initial: Post[]; missingTable: boolean }) {
  const [posts, setPosts] = useState<Post[]>(initial);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(missingTable ? SQL_HINT : "");
  const [edits, setEdits] = useState<Record<string, { caption: string; first_comment: string; at: string }>>({});

  const editOf = (p: Post) => edits[p.id] ?? { caption: p.caption, first_comment: p.first_comment ?? "", at: toLocalInput(p.scheduled_at) };
  const setEdit = (p: Post, patch: Partial<{ caption: string; first_comment: string; at: string }>) =>
    setEdits((e) => ({ ...e, [p.id]: { ...editOf(p), ...patch } }));
  const dirty = (p: Post) => {
    const e = edits[p.id];
    return !!e && (e.caption !== p.caption || e.first_comment !== (p.first_comment ?? "") || e.at !== toLocalInput(p.scheduled_at));
  };

  const act = async (p: Post, action: string) => {
    setBusy(p.id + action);
    setNotice("");
    const e = editOf(p);
    const res = await fetch(`/api/admin/social/${p.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        caption: e.caption,
        first_comment: e.first_comment,
        scheduled_at: e.at ? new Date(e.at).toISOString() : null,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setNotice(d.error || "Något gick fel.");
    } else if (d.deleted) {
      setPosts((ps) => ps.filter((x) => x.id !== p.id));
    } else {
      setPosts((ps) =>
        ps.map((x) =>
          x.id === p.id
            ? { ...x, status: d.status ?? x.status, caption: d.caption ?? x.caption, first_comment: d.first_comment !== undefined ? d.first_comment : x.first_comment, scheduled_at: d.scheduled_at !== undefined ? d.scheduled_at : x.scheduled_at, error: null }
            : x
        )
      );
      setEdits((s) => {
        const { [p.id]: _drop, ...rest } = s;
        return rest;
      });
      if (action === "approve") setNotice("Godkänt. Inlägget publiceras automatiskt vid vald tid, förutsatt att publiceringssystemet är igång.");
      if (action === "save") setNotice("Sparat.");
    }
    setBusy("");
  };

  const importNew = async () => {
    setBusy("import");
    setNotice("");
    const res = await fetch("/api/admin/social/import", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setNotice(d.error?.includes("social_posts") ? SQL_HINT : d.error || "Något gick fel.");
    else if (d.added) window.location.reload();
    else setNotice("Inga nya förslag just nu.");
    setBusy("");
  };

  const groups: { title: string; hint?: string; items: Post[] }[] = [
    { title: "Att godkänna", items: posts.filter((p) => p.status === "draft") },
    { title: "Godkända, väntar på publicering", hint: "Publiceras automatiskt vid vald tid.", items: posts.filter((p) => p.status === "approved") },
    { title: "Fel vid publicering", items: posts.filter((p) => p.status === "error") },
    { title: "Publicerade", items: posts.filter((p) => p.status === "published") },
    { title: "Avslagna", items: posts.filter((p) => p.status === "rejected") },
  ];

  const card = (p: Post) => {
    const e = editOf(p);
    const open = p.status === "draft" || p.status === "rejected" || p.status === "error";
    return (
      <div key={p.id} className="bg-surface border border-line rounded-xl p-4 flex flex-col md:flex-row gap-5">
        <div className="md:w-[220px] flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image_url} alt="" className="w-full rounded-lg border border-line" style={{ aspectRatio: "4 / 5", objectFit: "cover" }} />
          <div className="text-[12px] text-ink-dim mt-2">Facebook och Instagram, YourCoSite</div>
        </div>
        <div className="min-w-0 flex-1">
          {open ? (
            <>
              <label className="text-[12.5px] text-ink-dim uppercase tracking-wide">Text</label>
              <textarea
                value={e.caption}
                onChange={(ev) => setEdit(p, { caption: ev.target.value })}
                rows={9}
                className="w-full mt-1 border border-line rounded-lg p-3 text-[14px] leading-relaxed bg-white"
              />
              <label className="text-[12.5px] text-ink-dim uppercase tracking-wide mt-3 block">Första kommentar (valfri)</label>
              <input
                value={e.first_comment}
                onChange={(ev) => setEdit(p, { first_comment: ev.target.value })}
                className="w-full mt-1 border border-line rounded-lg p-2.5 text-[14px] bg-white"
              />
              <label className="text-[12.5px] text-ink-dim uppercase tracking-wide mt-3 block">Publiceras</label>
              <input
                type="datetime-local"
                value={e.at}
                onChange={(ev) => setEdit(p, { at: ev.target.value })}
                className="mt-1 border border-line rounded-lg p-2.5 text-[14px] bg-white"
              />
              {p.status === "error" && p.error && <p className="text-[13px] text-warm mt-3">Förra försöket misslyckades: {p.error}</p>}
              <div className="flex flex-wrap gap-2 mt-4">
                <button type="button" disabled={!!busy} onClick={() => act(p, "approve")} className="bg-accent text-accent-ink font-semibold text-[13.5px] px-4 py-2.5 rounded-lg disabled:opacity-60">
                  {busy === p.id + "approve" ? "Godkänner …" : "Godkänn och schemalägg"}
                </button>
                <button type="button" disabled={!!busy || !dirty(p)} onClick={() => act(p, "save")} className="border border-line text-[13.5px] font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50">
                  Spara ändringar
                </button>
                {p.status === "rejected" || p.status === "error" ? (
                  <button type="button" disabled={!!busy} onClick={() => act(p, "restore")} className="border border-line text-[13.5px] font-semibold px-4 py-2.5 rounded-lg">Tillbaka till utkast</button>
                ) : (
                  <button type="button" disabled={!!busy} onClick={() => act(p, "reject")} className="border border-line text-[13.5px] text-ink-dim px-4 py-2.5 rounded-lg">Avslå</button>
                )}
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => { if (confirm("Ta bort inlägget?")) act(p, "delete"); }}
                  className="text-[13.5px] text-warm px-3 py-2.5"
                >
                  Ta bort
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[14px] leading-relaxed whitespace-pre-line">{p.caption}</p>
              {p.first_comment && <p className="text-[13px] text-ink-dim mt-2">Första kommentar: {p.first_comment}</p>}
              <p className="text-[13px] text-ink-dim mt-3">
                {p.status === "published" ? `Publicerat ${when(p.published_at)}` : `Publiceras ${when(p.scheduled_at)}`}
              </p>
              {p.status === "approved" && (
                <button type="button" disabled={!!busy} onClick={() => act(p, "unapprove")} className="mt-3 border border-line text-[13.5px] font-semibold px-4 py-2.5 rounded-lg">
                  Ta tillbaka godkännandet
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 md:px-11 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <div>
          <h1 className="text-[28px] font-medium">Sociala medier</h1>
          <p className="text-[13.5px] text-ink-dim mt-1 max-w-[62ch]">
            Förslag på inlägg för YourCoSites egna Facebook och Instagram. Inget publiceras förrän du godkänner och väljer en tid. Publiceringen sker bara på dessa två konton.
          </p>
        </div>
        <button type="button" onClick={importNew} disabled={busy === "import"} className="border border-line text-[13.5px] font-semibold px-4 py-2.5 rounded-lg disabled:opacity-60">
          {busy === "import" ? "Hämtar …" : "Hämta nya förslag"}
        </button>
      </div>
      {notice && <div className="mt-3 mb-2 text-[13.5px] bg-accent-soft border border-line rounded-lg px-4 py-3">{notice}</div>}

      {groups.map((g) =>
        g.items.length ? (
          <section key={g.title} className="mt-8">
            <h2 className="text-[16px] font-semibold">{g.title} <span className="text-ink-dim font-normal">({g.items.length})</span></h2>
            {g.hint && <p className="text-[12.5px] text-ink-dim mt-0.5">{g.hint}</p>}
            <div className="grid gap-4 mt-3">{g.items.map(card)}</div>
          </section>
        ) : null
      )}
      {!missingTable && posts.length === 0 && (
        <p className="text-[14px] text-ink-dim mt-8">Inga inlägg ännu. Klicka på Hämta nya förslag.</p>
      )}
    </div>
  );
}
