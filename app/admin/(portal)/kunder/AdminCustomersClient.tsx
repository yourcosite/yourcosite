"use client";

import { useState } from "react";

type Site = {
  id: string;
  name: string;
  domain: string | null;
  status: string;
  plan: string;
};

type Customer = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  company_name?: string | null;
  org_number?: string | null;
  address_street?: string | null;
  address_postal_code?: string | null;
  address_city?: string | null;
  billing_email?: string | null;
  role: string;
  created_at: string;
  sites?: Site[];
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  orgNumber: string;
  addressStreet: string;
  addressPostalCode: string;
  addressCity: string;
  billingEmail: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  companyName: "",
  orgNumber: "",
  addressStreet: "",
  addressPostalCode: "",
  addressCity: "",
  billingEmail: "",
};

function customerToForm(c: Customer): FormState {
  return {
    name: c.full_name ?? "",
    email: c.email,
    phone: c.phone ?? "",
    companyName: c.company_name ?? "",
    orgNumber: c.org_number ?? "",
    addressStreet: c.address_street ?? "",
    addressPostalCode: c.address_postal_code ?? "",
    addressCity: c.address_city ?? "",
    billingEmail: c.billing_email ?? "",
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminCustomersClient({
  initialCustomers,
  canEdit,
}: {
  initialCustomers: Customer[];
  canEdit: boolean;
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [resetSentFor, setResetSentFor] = useState<string | null>(null);
  const [resetSendingFor, setResetSendingFor] = useState<string | null>(null);

  const handleSendReset = async (c: Customer) => {
    setResetSendingFor(c.id);
    setResetSentFor(null);
    const res = await fetch(`/api/admin/customers/${c.id}/reset-password`, { method: "POST" });
    setResetSendingFor(null);
    if (res.ok) {
      setResetSentFor(c.id);
      setTimeout(() => setResetSentFor((id) => (id === c.id ? null : id)), 4000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Kunde inte skicka återställningsmail.");
    }
  };

  const updateField = (field: keyof FormState) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (c.full_name ?? "").toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.company_name ?? "").toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setError(null);
    setShowAdd(true);
  };

  const openEdit = (c: Customer) => {
    setForm(customerToForm(c));
    setError(null);
    setEditing(c);
  };

  const closeModals = () => {
    setShowAdd(false);
    setEditing(null);
    setConfirmDelete(null);
    setNewPassword(null);
  };

  const formPayload = () => ({
    fullName: form.name,
    email: form.email,
    phone: form.phone,
    companyName: form.companyName,
    orgNumber: form.orgNumber,
    addressStreet: form.addressStreet,
    addressPostalCode: form.addressPostalCode,
    addressCity: form.addressCity,
    billingEmail: form.billingEmail,
  });

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formPayload()),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Något gick fel.");
      return;
    }

    setCustomers((cs) => [
      {
        id: data.customer.id,
        email: form.email,
        full_name: form.name,
        phone: form.phone,
        company_name: form.companyName,
        org_number: form.orgNumber,
        address_street: form.addressStreet,
        address_postal_code: form.addressPostalCode,
        address_city: form.addressCity,
        billing_email: form.billingEmail,
        role: "customer",
        created_at: new Date().toISOString(),
      },
      ...cs,
    ]);
    setNewPassword(data.tempPassword);
    setShowAdd(false);
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/customers/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formPayload()),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Något gick fel.");
      return;
    }

    setCustomers((cs) =>
      cs.map((c) =>
        c.id === editing.id
          ? {
              ...c,
              full_name: form.name,
              email: form.email,
              phone: form.phone,
              company_name: form.companyName,
              org_number: form.orgNumber,
              address_street: form.addressStreet,
              address_postal_code: form.addressPostalCode,
              address_city: form.addressCity,
              billing_email: form.billingEmail,
            }
          : c
      )
    );
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/customers/${confirmDelete.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Något gick fel.");
      return;
    }

    setCustomers((cs) => cs.filter((c) => c.id !== confirmDelete.id));
    setConfirmDelete(null);
  };

  return (
    <div className="flex-1 px-6 md:px-12 py-10">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-7">
        <div>
          <h1 className="text-[30px] font-medium">Kunder</h1>
          <p className="text-[14.5px] text-ink-dim mt-1.5">
            {customers.length} {customers.length === 1 ? "kund" : "kunder"} totalt.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openAdd}
            className="bg-accent text-accent-ink font-semibold text-[14px] px-5 py-2.5 rounded-lg"
          >
            + Lägg till kund
          </button>
        )}
      </div>

      {error && !showAdd && !editing && !confirmDelete && (
        <div className="text-[13.5px] text-warm font-medium mb-4">{error}</div>
      )}

      <div className="flex items-center gap-2 bg-surface border border-line rounded-[10px] px-3.5 py-2 w-[280px] mb-5">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#6B6A66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Sök namn, företag eller e-post"
          className="border-none outline-none text-[13.5px] flex-1 bg-transparent"
        />
      </div>

      <div className="bg-surface border border-line rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[12px] text-ink-dim uppercase tracking-wide bg-bg">
              <th className="py-3 px-5 font-semibold">Namn</th>
              <th className="py-3 px-5 font-semibold">Företag</th>
              <th className="py-3 px-5 font-semibold">E-post</th>
              <th className="py-3 px-5 font-semibold">Sajt</th>
              <th className="py-3 px-5 font-semibold">Status</th>
              <th className="py-3 px-5 font-semibold">Skapad</th>
              <th className="py-3 px-5 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const site = c.sites?.[0];
              const statusLabel = site?.status === "live" ? "LIVE" : site ? "UTKAST" : "INGEN SAJT";
              const badge =
                statusLabel === "LIVE"
                  ? "bg-[#DCFCE7] text-[#166534]"
                  : statusLabel === "UTKAST"
                  ? "bg-[#FDE68A] text-[#7C4A03]"
                  : "bg-line text-ink-dim";
              return (
                <tr key={c.id} className="text-[13.5px] border-t border-line">
                  <td className="py-3.5 px-5 font-semibold whitespace-nowrap">{c.full_name || "—"}</td>
                  <td className="py-3.5 px-5 text-ink-dim whitespace-nowrap">{c.company_name || "—"}</td>
                  <td className="py-3.5 px-5 text-ink-dim whitespace-nowrap">{c.email}</td>
                  <td className="py-3.5 px-5 text-ink-dim whitespace-nowrap">{site?.domain || site?.name || "—"}</td>
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badge}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-ink-dim whitespace-nowrap">{formatDate(c.created_at)}</td>
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    {canEdit ? (
                      <>
                        {resetSentFor === c.id ? (
                          <span className="text-[12.5px] font-semibold text-[#166534] mr-4">
                            Mail skickat ✓
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendReset(c)}
                            disabled={resetSendingFor === c.id}
                            className="text-[12.5px] font-semibold text-ink-dim mr-4 disabled:opacity-60"
                          >
                            {resetSendingFor === c.id ? "Skickar …" : "Återställ lösenord"}
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(c)}
                          className="text-[12.5px] font-semibold text-ink mr-4"
                        >
                          Redigera
                        </button>
                        <button
                          onClick={() => setConfirmDelete(c)}
                          className="text-[12.5px] font-semibold text-warm"
                        >
                          Ta bort
                        </button>
                      </>
                    ) : (
                      <span className="text-[12.5px] text-ink-dim">Visningsläge</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 px-5 text-center text-ink-dim text-[13.5px]">
                  Inga kunder hittades.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lägg till-modal */}
      {showAdd && (
        <Modal onClose={closeModals} title="Lägg till kund">
          <CustomerForm form={form} onChange={updateField} emailDisabled={false} />
          {error && <div className="text-[13px] text-warm font-medium mt-2">{error}</div>}
          <div className="flex justify-end gap-2.5 mt-5">
            <button onClick={closeModals} className="text-[13.5px] font-semibold text-ink-dim px-4 py-2.5">
              Avbryt
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.name || !form.email}
              className="bg-accent text-accent-ink font-semibold text-[13.5px] px-5 py-2.5 rounded-lg disabled:opacity-60"
            >
              {saving ? "Skapar …" : "Skapa kund"}
            </button>
          </div>
        </Modal>
      )}

      {/* Redigera-modal */}
      {editing && (
        <Modal onClose={closeModals} title="Redigera kund">
          <CustomerForm form={form} onChange={updateField} emailDisabled={false} />
          {error && <div className="text-[13px] text-warm font-medium mt-2">{error}</div>}
          <div className="flex justify-end gap-2.5 mt-5">
            <button onClick={closeModals} className="text-[13.5px] font-semibold text-ink-dim px-4 py-2.5">
              Avbryt
            </button>
            <button
              onClick={handleUpdate}
              disabled={saving || !form.name || !form.email}
              className="bg-accent text-accent-ink font-semibold text-[13.5px] px-5 py-2.5 rounded-lg disabled:opacity-60"
            >
              {saving ? "Sparar …" : "Spara ändringar"}
            </button>
          </div>
        </Modal>
      )}

      {/* Ta bort-bekräftelse */}
      {confirmDelete && (
        <Modal onClose={closeModals} title="Ta bort kund">
          <p className="text-[14px] text-ink-dim leading-relaxed">
            Vill du ta bort <strong className="text-ink">{confirmDelete.full_name || confirmDelete.email}</strong>?
            Detta tar bort kontot permanent och går inte att ångra.
          </p>
          {error && <div className="text-[13px] text-warm font-medium mt-2">{error}</div>}
          <div className="flex justify-end gap-2.5 mt-5">
            <button onClick={closeModals} className="text-[13.5px] font-semibold text-ink-dim px-4 py-2.5">
              Avbryt
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="bg-warm text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-lg disabled:opacity-60"
            >
              {saving ? "Tar bort …" : "Ta bort permanent"}
            </button>
          </div>
        </Modal>
      )}

      {/* Lösenord efter skapande */}
      {newPassword && (
        <Modal onClose={closeModals} title="Kund skapad">
          <p className="text-[14px] text-ink-dim leading-relaxed mb-3">
            Ge kunden följande tillfälliga lösenord så de kan logga in första
            gången (be dem byta det direkt):
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 px-4 py-8 overflow-y-auto">
      <div className="bg-surface rounded-2xl p-6 w-full max-w-[480px] max-h-[90vh] overflow-y-auto">
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

function CustomerForm({
  form,
  onChange,
  emailDisabled,
}: {
  form: FormState;
  onChange: (field: keyof FormState) => (value: string) => void;
  emailDisabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <label className="block text-[13px] font-semibold mb-1.5">Namn</label>
        <input
          value={form.name}
          onChange={(e) => onChange("name")(e.target.value)}
          className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
        />
      </div>
      <div>
        <label className="block text-[13px] font-semibold mb-1.5">E-post</label>
        <input
          type="email"
          value={form.email}
          disabled={emailDisabled}
          onChange={(e) => onChange("email")(e.target.value)}
          className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px] disabled:bg-bg disabled:text-ink-dim"
        />
      </div>
      <div>
        <label className="block text-[13px] font-semibold mb-1.5">Telefon</label>
        <input
          value={form.phone}
          onChange={(e) => onChange("phone")(e.target.value)}
          placeholder="07X – XXX XX XX"
          className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
        />
      </div>

      <div className="border-t border-line pt-3.5 mt-0.5">
        <div className="text-[12.5px] font-semibold text-ink-dim mb-3">Företag och fakturering</div>
      </div>

      <div>
        <label className="block text-[13px] font-semibold mb-1.5">Företagsnamn</label>
        <input
          value={form.companyName}
          onChange={(e) => onChange("companyName")(e.target.value)}
          className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
        />
      </div>
      <div>
        <label className="block text-[13px] font-semibold mb-1.5">Organisationsnummer</label>
        <input
          value={form.orgNumber}
          onChange={(e) => onChange("orgNumber")(e.target.value)}
          placeholder="XXXXXX-XXXX"
          className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
        />
      </div>
      <div>
        <label className="block text-[13px] font-semibold mb-1.5">Adress</label>
        <input
          value={form.addressStreet}
          onChange={(e) => onChange("addressStreet")(e.target.value)}
          placeholder="Gatuadress"
          className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
        />
      </div>
      <div className="flex gap-3">
        <div className="w-[110px] flex-shrink-0">
          <label className="block text-[13px] font-semibold mb-1.5">Postnr</label>
          <input
            value={form.addressPostalCode}
            onChange={(e) => onChange("addressPostalCode")(e.target.value)}
            placeholder="XXX XX"
            className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[13px] font-semibold mb-1.5">Ort</label>
          <input
            value={form.addressCity}
            onChange={(e) => onChange("addressCity")(e.target.value)}
            className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
          />
        </div>
      </div>
      <div>
        <label className="block text-[13px] font-semibold mb-1.5">Fakturerings-e-post</label>
        <input
          type="email"
          value={form.billingEmail}
          onChange={(e) => onChange("billingEmail")(e.target.value)}
          placeholder="Lämna tomt för att använda kontots e-post"
          className="w-full box-border px-3 py-2.5 border border-line rounded-[9px] text-[14px]"
        />
      </div>
    </div>
  );
}
