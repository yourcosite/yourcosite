import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { unpackReport, parseDmarcXml } from "@/lib/dmarc";
import { logError } from "@/lib/errorLog";

// Tar emot DMARC-rapportmejl via Resend Inbound (webhook "email.received").
// Mejlet skickas till rua-adressen i DNS (t.ex. dmarc@<din inkommande domän>).
// Webhooken signeras av Resend (Svix-format) med RESEND_WEBHOOK_SECRET.
// Vi hämtar bilagorna via Resend API, packar upp, tolkar och sparar i
// dmarc_reports. Inget mejl vidarebefordras, så inkorgen blir tyst.

export const maxDuration = 30;

function verify(raw: string, headers: Headers, secret: string): boolean {
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sigHeader = headers.get("svix-signature");
  if (!id || !ts || !sigHeader) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${raw}`).digest();
  return sigHeader.split(" ").some((part) => {
    const [v, sig] = part.split(",");
    if (v !== "v1" || !sig) return false;
    const got = Buffer.from(sig, "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  if (!secret || !apiKey) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const raw = await request.text();
  if (!verify(raw, request.headers, secret)) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  let evt: any;
  try {
    evt = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (evt?.type !== "email.received") return NextResponse.json({ ok: true, ignored: true });
  const emailId: string | undefined = evt.data?.email_id;
  if (!emailId) return NextResponse.json({ ok: true });

  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Resend attachments ${res.status}`);
    const list = (await res.json()) as { data?: any[] };
    const supabase = createAdminClient();
    let saved = 0;
    for (const att of list.data ?? []) {
      if (!att.download_url) continue;
      const file = await fetch(att.download_url);
      if (!file.ok) continue;
      const buf = Buffer.from(await file.arrayBuffer());
      const xml = await unpackReport(buf, att.filename || "", att.content_type || "");
      const rep = xml ? parseDmarcXml(xml) : null;
      if (!rep) continue;
      const { error } = await supabase.from("dmarc_reports").upsert(
        {
          report_id: rep.reportId,
          org_name: rep.orgName,
          domain: rep.domain,
          date_begin: rep.dateBegin.toISOString(),
          date_end: rep.dateEnd.toISOString(),
          policy: rep.policy,
          total: rep.total,
          passed: rep.passed,
          failed: rep.failed,
          rows: rep.rows,
        },
        { onConflict: "org_name,report_id" }
      );
      if (error) throw new Error(error.message);
      saved++;
    }
    return NextResponse.json({ ok: true, saved });
  } catch (e: any) {
    await logError({ source: "server", message: `DMARC-inkorg: ${e?.message || e}`, context: "api/dmarc/inbound" });
    // 500 gör att Resend försöker igen
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
