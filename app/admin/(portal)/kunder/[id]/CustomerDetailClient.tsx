"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PLAN_LABELS, formatKr, planPrice } from "@/lib/pricing";

type Site = {
  id: string;
  name: string;
  domain: string | null;
  status: string;
  plan: string;
  created_at: string;
};

type Customer = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  company_name: string | null;
  org_number: string | null;
  address_street: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  billing_email: string | null;
  created_at: string;
  sites: Site[];
};

type Note = { id: string; content: string; author_name: string | null; created_at: string };
type Activity = { id: string; action: string; actor_name: string | null; created_at: string };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" });
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("sv-SE", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CustomerDetailClient({
  customer,
  initialNotes,
  activity,
  canEdit,
  isSuperadmin,
}: {
  customer: Customer;
  initialNotes: Note[];
  activity: Activity[];
  canEdit: boolean;
  isSuperadmin: boolean;
}) {
  const router = useRouter();
  const site = customer.sites?.[0];

  const [notes, setNotes] = useState(initialNotes);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [siteStatus, setSiteStatus] = useState(site?.status);
  const [planValue, setPlanValue] = useState(site?.plan ?? "bas");
  const [savingPlan, setSavingPlan] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    const res = await fetch(`/api/admin/customers/${customer.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteText }),
    });
    setSavingNote(false);
    if (res.ok) {
      const data = await res.json();
      setNotes((n) => [data.note, ...n]);
      setNoteText("");
    }
  };

  const handleResetPassword = async () => {
    setBusy("reset");
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/customers/${customer.id}/reset-password`, { method: "POST" });
    setBusy(null);
    if (res.ok) setMessage("Återställningsmail skickat.");
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Kunde inte skicka mail.");
    }
  };

  const handleTogglePause = async () => {
    setBusy("pause");
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/customers/${customer.id}/toggle-pause`, { method: "POST" });
    const data = await res.json();
    setBusy(null);
    if (res.ok) {
      setSiteStatus(data.status);
      setMessage(data.status === "pausad" ? "Kontot är pausat." : "Kontot är återaktiverat.");
    } else {
      setError(data.error ?? "Kunde inte ändra status.");
    }
  };

  const handleImpersonate = async () => {
    if (!confirm("Det här loggar ut dig från ditt eget adminkonto i den här fliken och loggar in dig som kunden. Fortsätta?")) {
      return;
    }
    setBusy("impersonate");
    setError(null);
    const res = await fetch(`/api/admin/customers/${customer.id}/impersonate`, { method: "POST" });
    const data = await res.json();
    setBusy(null);
    if (res.ok && data.actionLink) {
      window.location.href = data.actionLink;
    } else {
      setError(data.error ?? "Kunde inte logga in som kunden.");
    }
  };

  const handleDelete = async () => {
    setBusy("delete");
    const res = await fetch(`/api/admin/customers/${customer.id}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) {
      router.push("/admin/kunder");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Kunde inte ta bort kunden.");
      setConfirmDelete(false);
    }
  };

  const handleSavePlan = async () => {
    setSavingPlan(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/customers/${customer.id}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planValue }),
    });
    const data = await res.json();
    setSavingPlan(false);
    if (res.ok) {
      setMessage("Planen är uppdaterad.");
    } else {
      setError(data.error ?? "Kunde inte ändra plan.");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    const res = await fetch(`/api/admin/customers/${customer.id}/export`);
    if (!res.ok) {
      setExporting(false);
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Kunde inte exportera data.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kunddata-${customer.id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const statusLabel = siteStatus === "live" ? "LIVE" : siteStatus === "pausad" ? "PAUSAD" : site ? "UTKAST" : "INGEN SAJT";
  const statusBadge =
    statusLabel === "LIVE"
      ? "bg-[#DCFCE7] text-[#166534]"
      : statusLabel === "PAUSAD"
      ? "bg-[#FEE2E2] text-[#991B1B]"
      : statusLabel === "UTKAST"
      ? "bg-[#FDE68A] text-[#7C4A03]"
      : "bg-line text-ink-dim";

  return (
    <div className="px-11 py-7.5 max-w-[1100px]">
      <Link href="/admin/kunder" className="text-[13px] font-semibold text-ink-dim mb-4 inline-block">
        ← Tillbaka till kunder
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-6.5">
        <div>
          <h1 className="text-[26px] font-medium font-serif">
            {customer.company_name || customer.full_name || customer.email}
          </h1>
          <p className="text-[14.5px] text-ink-dim mt-1.5">
            {customer.full_name || "—"} · {customer.email}
            {site && (
              <>
                {" · "}
                {PLAN_LABELS[site.plan] ?? site.plan} — {formatKr(planPrice(site.plan))}/mån
              </>
            )}
          </p>
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statusBadge}`}>{statusLabel}</span>
      </div>

      {canEdit && (
        <div className="flex flex-wrap gap-2.5 mb-6.5">
          <button
            onClick={handleResetPassword}
            disabled={busy === "reset"}
            className="bg-surface border border-line text-ink font-semibold text-[13px] px-4 py-2.5 rounded-lg disabled:opacity-60"
          >
            {busy === "reset" ? "Skickar …" : "Återställ lösenord"}
          </button>
          {site && (siteStatus === "live" || siteStatus === "pausad") && (
            <button
              onClick={handleTogglePause}
              disabled={busy === "pause"}
              className="bg-surface border border-line text-warm font-semibold text-[13px] px-4 py-2.5 rounded-lg disabled:opacity-60"
            >
              {busy === "pause"
                ? "Uppdaterar …"
                : siteStatus === "pausad"
                ? "Återaktivera konto"
                : "Pausa konto"}
            </button>
          )}
          {isSuperadmin && (
            <button
              onClick={handleImpersonate}
              disabled={busy === "impersonate"}
              className="bg-ink text-white font-semibold text-[13px] px-4 py-2.5 rounded-lg disabled:opacity-60"
            >
              {busy === "impersonate" ? "Loggar in …" : "Logga in som kund"}
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-surface border border-line text-ink font-semibold text-[13px] px-4 py-2.5 rounded-lg disabled:opacity-60"
          >
            {exporting ? "Exporterar …" : "Exportera data (GDPR)"}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-warm font-semibold text-[13px] px-4 py-2.5"
          >
            Ta bort kund
          </button>
        </div>
      )}

      {message && <div className="text-[13.5px] text-[#166534] font-medium mb-4">{message}</div>}
      {error && <div className="text-[13.5px] text-warm font-medium mb-4">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
        <div className="flex flex-col gap-5">
          <div className="bg-surface border border-line rounded-2xl p-5.5">
            <div className="font-semibold text-[15.5px] mb-3.5">Kontaktuppgifter</div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13.5px]">
              <Field label="Telefon" value={customer.phone} />
              <Field label="Org.nr" value={customer.org_number} />
              <Field label="Adress" value={customer.address_street} />
              <Field
                label="Postnr / ort"
                value={[customer.address_postal_code, customer.address_city].filter(Boolean).join(" ")}
              />
              <Field label="Fakturerings-e-post" value={customer.billing_email} />
              <Field label="Kund sedan" value={formatDate(customer.created_at)} />
            </dl>
          </div>

          <div className="bg-surface border border-line rounded-2xl p-5.5">
            <div className="font-semibold text-[15.5px] mb-3.5">Aktuell sajt</div>
            {site ? (
              <>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13.5px] mb-4">
                  <Field label="Namn" value={site.name} />
                  <Field label="Domän" value={site.domain} />
                  <Field label="Skapad" value={formatDate(site.created_at)} />
                </dl>
                {canEdit ? (
                  <div className="border-t border-line pt-3.5">
                    <label className="block text-[11.5px] text-ink-dim uppercase tracking-wide mb-1.5">
                      Plan
                    </label>
                    <div className="flex items-center gap-2.5">
                      <select
                        value={planValue}
                        onChange={(e) => setPlanValue(e.target.value)}
                        className="border border-line rounded-[9px] px-3 py-2 text-[13.5px] bg-surface"
                      >
                        <option value="bas">Bas — {formatKr(planPrice("bas"))}/mån</option>
                        <option value="standard">Standard — {formatKr(planPrice("standard"))}/mån</option>
                        <option value="premium">Premium — {formatKr(planPrice("premium"))}/mån</option>
                      </select>
                      <button
                        onClick={handleSavePlan}
                        disabled={savingPlan || planValue === site.plan}
                        className="bg-accent text-accent-ink font-semibold text-[13px] px-4 py-2 rounded-lg disabled:opacity-60"
                      >
                        {savingPlan ? "Sparar …" : "Spara plan"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <Field label="Plan" value={PLAN_LABELS[site.plan] ?? site.plan} />
                )}
              </>
            ) : (
              <p className="text-[13.5px] text-ink-dim">Har inte påbörjat onboardingen än.</p>
            )}
          </div>

          {canEdit && (
            <div className="bg-surface border border-line rounded-2xl p-5.5">
              <div className="font-semibold text-[15.5px] mb-3.5">Senaste aktivitet</div>
              {activity.length === 0 ? (
                <p className="text-[13.5px] text-ink-dim">Ingen loggad aktivitet än.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {activity.map((a) => (
                    <div key={a.id} className="text-[13px]">
                      <span className="font-semibold">{a.actor_name}</span>{" "}
                      <span className="text-ink-dim">{a.action} · {formatDateTime(a.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-surface border border-line rounded-2xl p-5.5 h-fit">
          <div className="font-semibold text-[15.5px] mb-3.5">Interna anteckningar</div>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Skriv en anteckning om kunden …"
            rows={3}
            className="w-full box-border border border-line rounded-[10px] p-3 text-[13px] resize-none mb-2.5"
          />
          <button
            onClick={handleAddNote}
            disabled={savingNote || !noteText.trim()}
            className="bg-accent text-accent-ink font-semibold text-[13px] px-4 py-2 rounded-lg disabled:opacity-60 mb-5"
          >
            {savingNote ? "Sparar …" : "Spara anteckning"}
          </button>

          <div className="flex flex-col gap-3.5">
            {notes.map((n) => (
              <div key={n.id} className="border-t border-line pt-3">
                <p className="text-[13px] leading-relaxed">{n.content}</p>
                <div className="text-[11.5px] text-ink-dim mt-1.5">
                  {n.author_name} · {formatDateTime(n.created_at)}
                </div>
              </div>
            ))}
            {notes.length === 0 && (
              <p className="text-[13px] text-ink-dim">Inga anteckningar än.</p>
            )}
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 px-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-[420px]">
            <h2 className="text-[18px] font-semibold mb-3">Ta bort kund</h2>
            <p className="text-[14px] text-ink-dim leading-relaxed">
              Vill du ta bort <strong className="text-ink">{customer.full_name || customer.email}</strong>?
              Detta tar bort kontot permanent och går inte att ångra.
            </p>
            <div className="flex justify-end gap-2.5 mt-5">
              <button onClick={() => setConfirmDelete(false)} className="text-[13.5px] font-semibold text-ink-dim px-4 py-2.5">
                Avbryt
              </button>
              <button
                onClick={handleDelete}
                disabled={busy === "delete"}
                className="bg-warm text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-lg disabled:opacity-60"
              >
                {busy === "delete" ? "Tar bort …" : "Ta bort permanent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-[11.5px] text-ink-dim uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
