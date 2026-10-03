// Hämtar en kort textsammanfattning av kundens referenssajter (onboarding
// steg 2), så AI:n faktiskt kan känna av ton/struktur istället för att bara
// se en URL som text. Vi skickar ALDRIG den rå texten vidare som
// citerbart material — bara en kraftigt trunkerad, HTML-rensad bit, och
// prompten är tydlig om att bara stämning/struktur får inspirera, aldrig
// ord-för-ord-kopiering.
//
// OBS: detta når externa sajter via fetch() och är därför beroende av att
// miljön den körs i (Vercel) har utgående nätverksåtkomst dit. Går en
// hämtning inte (blockerad, nedsajt, timeout) hoppar vi helt enkelt över
// den länken istället för att fela hela genereringen.

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchOne(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "YourCoSiteBot/1.0 (+https://yourcosite.com)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const text = stripHtml(html);
    return text.slice(0, 1500);
  } catch {
    return null;
  }
}

export async function summarizeInspirationLinks(links: string[]): Promise<string> {
  const valid = links.filter((l) => {
    try {
      new URL(l);
      return true;
    } catch {
      return false;
    }
  });
  if (valid.length === 0) return "";

  const results = await Promise.all(valid.map((url) => fetchOne(url)));
  const parts = results
    .map((text, i) => (text ? `Referenssajt ${i + 1} (${valid[i]}), rått textutdrag: "${text}"` : null))
    .filter(Boolean);

  if (parts.length === 0) return "";

  return `\nKunden har visat dessa sajter som inspiration för KÄNSLA, TON och STRUKTUR — kopiera ALDRIG text eller specifika formuleringar från dem, använd dem bara för att förstå vilken stämning kunden gillar:\n${parts.join("\n\n")}\n`;
}
