"use client";

import { useState } from "react";

type Admin = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function initialsOf(name: string, email: string) {
  const base = name?.trim() || email;
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export default function TeamClient({
  initialAdmins,
  currentUserId,
}: {
  initialAdmins: Admin[];
  currentUserId: string;
}) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [showInvite, setShowInvite] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Admin | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const openInvite = () => {
    setFormName("");
    setFormEmail("");
    setError(null);
    setShowInvite(true);
  };

  const closeModals = () => {
    setShowInvite(false);
    setConfirmRemove(null);
    setNewPassword(null);
  };

  const handleInvite = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: formName, email: formEmail }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Något gick fel.");
      return;
    }

    setAdmins((as) => [
      { id: data.admin.id, email: formEmail, full_name: formName, created_at: new Date().toISOString() },
      ...as,
    ]);
    setNewPassword(data.tempPassword);
    setShowInvite(false);
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/team/${confirmRemove.id}`, { method: "DELETE" });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Något gick fel.");
      return;
    }

    setAdmins((as) => as.filter((a) => a.id !== confirmRemove.id));
    setConfirmRemove(null);
  };

  return (
    <div className="px-11 py-7.5">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6.5">
        <div>
          <h1 className="text-[28px] font-medium font-serif">Team</h1>
          <p className="text-[14.5px] text-ink-dim mt-1.5">
            Vilka har tillgång till adminportalen.
          </p>
        </div>
        <button
          onClick={openInvite}
          className="bg-ink text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-lg"
        >
          + Bjud in admin
        </button>
      </div>

      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[12px] text-ink-dim uppercase tracking-wide bg-bg">
              <th className="py-3 px-5 font-semibold">Namn</th>
              <th className="py-3 px-5 font-semibold">E-post</th>
              <th className="py-3 px-5 font-semibold">Admin sedan</th>
              <th className="py-3 px-5 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="text-[13.5px] border-t border-line">
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-[30px] h-[30px] rounded-full bg-accent-soft text-[#4D7C0F] flex items-center justify-center font-bold text-[11.5px] flex-shrink-0">
                      {initialsOf(a.full_name ?? "", a.email)}
                    </div>
                    <span className="font-semibold">
                      {a.full_name || "—"}
                      {a.id === currentUserId && (
                        <span className="text-ink-dim font-normal"> (du)</span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-5 text-ink-dim">{a.email}</td>
                <td className="py-3.5 px-5 text-ink-dim">{formatDate(a.created_at)}</td>
                <td className="py-3.5 px-5 text-right whitespace-nowrap">
                  {a.id !== currentUserId && (
                    <button
                      onClick={() => setConfirmRemove(a)}
                      className="text-[12.5px] font-semibold text-warm"
                    >
                      Ta bort adminbehörighet
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 px-5 text-center text-ink-dim text-[13.5px]">
                  Inga admins ännu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <Modal onClose={closeModals} title="Bjud in en ny admin">
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="block text-[13px] font-semibold mb-1.5">Namn</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1.5">E-post</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
              />
            </div>
          </div>
          {error && <div className="text-[13px] text-warm font-medium mt-2">{error}</div>}
          <div className="flex justify-end gap-2.5 mt-5">
            <button onClick={closeModals} className="text-[13.5px] font-semibold text-ink-dim px-4 py-2.5">
              Avbryt
            </button>
            <button
              onClick={handleInvite}
              disabled={saving || !formName || !formEmail}
              className="bg-accent text-accent-ink font-semibold text-[13.5px] px-5 py-2.5 rounded-lg disabled:opacity-60"
            >
              {saving ? "Skapar …" : "Skicka inbjudan"}
            </button>
          </div>
        </Modal>
      )}

      {confirmRemove && (
        <Modal onClose={closeModals} title="Ta bort adminbehörighet">
          <p className="text-[14px] text-ink-dim leading-relaxed">
            Vill du ta bort adminbehörigheten för{" "}
            <strong className="text-ink">{confirmRemove.full_name || confirmRemove.email}</strong>?
            Kontot finns kvar men blir en vanlig kund och förlorar åtkomst till adminportalen.
          </p>
          {error && <div className="text-[13px] text-warm font-medium mt-2">{error}</div>}
          <div className="flex justify-end gap-2.5 mt-5">
            <button onClick={closeModals} className="text-[13.5px] font-semibold text-ink-dim px-4 py-2.5">
              Avbryt
            </button>
            <button
              onClick={handleRemove}
              disabled={saving}
              className="bg-warm text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-lg disabled:opacity-60"
            >
              {saving ? "Tar bort …" : "Ta bort adminbehörighet"}
            </button>
          </div>
        </Modal>
      )}

      {newPassword && (
        <Modal onClose={closeModals} title="Admin skapad">
          <p className="text-[14px] text-ink-dim leading-relaxed mb-3">
            Ge personen följande tillfälliga lösenord så de kan logga in första
            gången på /admin/logga-in (be dem byta det direkt):
          </p>
          <div className="bg-bg border border-line rounded-lg px-4 py-3 font-mono text-[15px] text-center">
            {newPassword}
          </div>
          <div className="flex justify-end mt-5">
            <button
              onClick={closeModals}
              className="bg-accent text-accent-ink font-semibold text-[13.5px] px-5 py-2.5 rounded-lg"
            >
              Klart
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 px-4">
      <div className="bg-surface rounded-2xl p-6 w-full max-w-[420px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Stäng" className="text-ink-dim">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
