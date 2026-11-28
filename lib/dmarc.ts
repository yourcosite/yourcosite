import zlib from "zlib";
import JSZip from "jszip";

// Läser DMARC-aggregatrapporter (XML, ofta packad som zip eller gz) och
// gör om dem till en enkel sammanfattning per rapport.

export type DmarcRow = {
  ip: string;
  count: number;
  disposition: string; // none | quarantine | reject
  dkim: string; // pass | fail
  spf: string;
  headerFrom: string;
  dkimDomain?: string;
  spfDomain?: string;
};

export type DmarcReport = {
  reportId: string;
  orgName: string;
  domain: string;
  dateBegin: Date;
  dateEnd: Date;
  policy: string | null;
  rows: DmarcRow[];
  total: number;
  passed: number; // DMARC passerar när DKIM eller SPF är pass (i linje)
  failed: number;
};

export async function unpackReport(buf: Buffer, filename: string, contentType: string): Promise<string | null> {
  try {
    if (buf[0] === 0x50 && buf[1] === 0x4b) {
      const zip = await JSZip.loadAsync(buf);
      const f = Object.values(zip.files).find((x) => !x.dir && /\.xml$/i.test(x.name));
      return f ? await f.async("string") : null;
    }
    if (buf[0] === 0x1f && buf[1] === 0x8b) return zlib.gunzipSync(buf).toString("utf8");
    if (/xml/i.test(contentType) || /\.xml$/i.test(filename) || buf.slice(0, 5).toString() === "<?xml") return buf.toString("utf8");
  } catch {}
  return null;
}

const tag = (s: string, name: string): string | undefined => {
  const m = s.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].trim() : undefined;
};
const block = (s: string, name: string): string => {
  const m = s.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : "";
};

export function parseDmarcXml(xml: string): DmarcReport | null {
  if (!/<feedback/i.test(xml)) return null;
  const meta = block(xml, "report_metadata");
  const pol = block(xml, "policy_published");
  const range = block(meta, "date_range");
  const begin = Number(tag(range, "begin"));
  const end = Number(tag(range, "end"));
  const orgName = tag(meta, "org_name");
  const reportId = tag(meta, "report_id");
  const domain = tag(pol, "domain");
  if (!orgName || !reportId || !domain || !begin || !end) return null;

  const rows: DmarcRow[] = [];
  const recs = xml.match(/<record>[\s\S]*?<\/record>/gi) ?? [];
  for (const r of recs) {
    const row = block(r, "row");
    const pe = block(row, "policy_evaluated");
    const auth = block(r, "auth_results");
    rows.push({
      ip: tag(row, "source_ip") ?? "?",
      count: Number(tag(row, "count")) || 0,
      disposition: tag(pe, "disposition") ?? "none",
      dkim: (tag(pe, "dkim") ?? "fail").toLowerCase(),
      spf: (tag(pe, "spf") ?? "fail").toLowerCase(),
      headerFrom: tag(block(r, "identifiers"), "header_from") ?? domain,
      dkimDomain: tag(block(auth, "dkim"), "domain"),
      spfDomain: tag(block(auth, "spf"), "domain"),
    });
  }
  let total = 0;
  let passed = 0;
  for (const r of rows) {
    total += r.count;
    if (r.dkim === "pass" || r.spf === "pass") passed += r.count;
  }
  return {
    reportId,
    orgName,
    domain,
    dateBegin: new Date(begin * 1000),
    dateEnd: new Date(end * 1000),
    policy: tag(pol, "p") ?? null,
    rows,
    total,
    passed,
    failed: total - passed,
  };
}
