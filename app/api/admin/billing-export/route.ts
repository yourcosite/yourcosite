import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/requireRole";
import { ADDON_PRICES, PLAN_LABELS, planPrice } from "@/lib/pricing";
import { billingCurrencyFor } from "@/lib/i18n/country";
import { withErrorLog } from "@/lib/errorLog";

// Fakturaunderlag som CSV för en månad (?month=ÅÅÅÅ-MM): en rad per
// fakturarad, redo att öppna i Excel eller läsa in i fakturaprogram.
// Kostnadsfria konton och kunder utan live-sajt tas inte med. Semikolon som
// avgränsare och decimalkomma, så svenska Excel öppnar filen rätt.
const VAT = 25;

function csvCell(v: string | number): string {
  const s = String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function num(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

async function GET_handler(request: Request) {
  const check = await requireRole(["admin", "superadmin"]);
  if (check.error) return check.error;

  const month = new URL(request.url).searchParams.get("month") || "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json({ error: "Ange månad som ÅÅÅÅ-MM." }, { status: 400 });
  }
  const admin = createAdminClient();

  const base = await admin
    .from("profiles")
    .select("id, email, full_name, company_name, org_number, address_street, address_postal_code, address_city, billing_email, country, sites(id, name, status, plan)")
    .eq("role", "customer");
  const customers = (base.data ?? []) as any[];

  // Nya kolumner (supabase/andringar-spark.sql) hämtas för sig så exporten
  // fungerar även innan de finns.
  const extraCols = await admin.from("profiles").select("id, billing_exempt, extra_sites, extra_languages").eq("role", "customer");
  const extraOf = new Map<string, any>((extraCols.data ?? []).map((r: any) => [r.id, r]));
  const addons = await admin.from("change_addons").select("owner_id, amount").eq("month", month);
  const addonAmount = new Map<string, number>();
  for (const a of (addons.data ?? []) as any[]) addonAmount.set(a.owner_id, (addonAmount.get(a.owner_id) || 0) + (a.amount || 0));

  const header = ["Månad", "Kund", "Företag", "Org.nr", "Fakturamejl", "Adress", "Postnr", "Ort", "Land", "Valuta", "Artikel", "Antal", "À-pris exkl moms", "Belopp exkl moms", "Moms %", "Moms", "Belopp inkl moms"];
  const lines: string[] = [header.join(";")];
  let skipped = 0;

  for (const c of customers) {
    const ex = extraOf.get(c.id) || {};
    const live = (c.sites || []).find((s: any) => s.status === "live");
    if (ex.billing_exempt || !live) { skipped++; continue; }
    const cur = billingCurrencyFor(c.country);
    const items: { name: string; qty: number; unit: number }[] = [];
    const pkg = planPrice(live.plan, cur);
    if (pkg > 0) items.push({ name: `${PLAN_LABELS[live.plan] ?? live.plan} (1 sajt, 30 ändringar/månad)`, qty: 1, unit: pkg });
    const priceOf = (k: keyof typeof ADDON_PRICES) => (cur === "EUR" ? ADDON_PRICES[k].EUR : ADDON_PRICES[k].SEK);
    if (ex.extra_sites > 0) items.push({ name: "Extra sajt", qty: ex.extra_sites, unit: priceOf("site") });
    const extraChanges = addonAmount.get(c.id) || 0;
    if (extraChanges > 0) items.push({ name: "50 extra ändringar", qty: Math.ceil(extraChanges / 50), unit: priceOf("changes50") });
    if (ex.extra_languages === 1) items.push({ name: "1 extra språk", qty: 1, unit: priceOf("language1") });
    if (ex.extra_languages === 2) items.push({ name: "2 extra språk", qty: 1, unit: priceOf("language2") });

    for (const it of items) {
      const net = it.qty * it.unit;
      const vat = Math.round(net * VAT) / 100;
      lines.push([
        month, c.full_name || c.email, c.company_name || "", c.org_number || "", c.billing_email || c.email,
        c.address_street || "", c.address_postal_code || "", c.address_city || "", c.country || "SE", cur,
        it.name, it.qty, num(it.unit), num(net), VAT, num(vat), num(net + vat),
      ].map(csvCell).join(";"));
    }
  }

  const body = "﻿" + lines.join("\r\n") + "\r\n";
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fakturaunderlag-${month}.csv"`,
      "X-Skipped-Accounts": String(skipped),
    },
  });
}

export const GET = withErrorLog("GET /api/admin/billing-export", GET_handler);
