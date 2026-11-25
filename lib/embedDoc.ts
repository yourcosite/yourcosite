// Bygger sidan som körs i den isolerade ramen för en inbäddning (sektionen
// "embed"): kundens egen kod, t.ex. ett bokningssystem. Koden körs i en
// sandlåda UTAN same-origin, så den kommer aldrig åt vår inloggning eller
// kundens konto i redigeraren — bara sin egen ruta.
export const MAX_EMBED_CODE = 20000;

export function normalizeEmbedCode(raw: string): string {
  const code = raw.trim();
  // Bara en adress inklistrad: gör en ram av den.
  if (/^https:\/\/[^\s<>"']+$/i.test(code)) {
    return `<iframe src="${code}" style="width:100%;height:700px;border:0" loading="lazy"></iframe>`;
  }
  return code;
}

export function buildEmbedDoc(raw: string, id: string): string {
  const code = normalizeEmbedCode(raw);
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif;background:transparent}</style></head><body>${code}<script>(function(){var id=${JSON.stringify(safeId)};var last=0;function send(){var b=document.body;var h=Math.ceil(Math.max(b.getBoundingClientRect().height,b.offsetHeight));if(h!==last){last=h;parent.postMessage({ycsEmbed:id,h:h},"*");}}window.addEventListener("load",send);window.addEventListener("resize",send);try{new MutationObserver(send).observe(document.body,{childList:true,subtree:true,attributes:true});}catch(e){}var n=0;var iv=setInterval(function(){send();if(++n>40)clearInterval(iv);},500);send();})();</script></body></html>`;
}

// Bokningssystem som kräver att deras kod körs direkt på sidan (inte i den
// isolerade ramen). Deras widget bygger en egen ram som bara får laddas
// från en riktig webbadress, och blockeras annars (visar en "förbjuden"-symbol).
// Listan styrs av oss: bara exakta värdnamn, aldrig något kunden skriver.
export const TRUSTED_EMBED_HOSTS = ["secured.sirvoy.com"];

// Känner igen en inklistrad kod som bara är EN skripttagg från en betrodd
// värd, t.ex. <script async data-form-id="..." src="https://secured.sirvoy.com/widget/sirvoy.js"></script>.
export function parseTrustedScript(raw: string): { src: string; attrs: Record<string, string> } | null {
  const m = raw.trim().match(/^<script\b([^>]*)>\s*<\/script>$/i);
  if (!m) return null;
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z][\w:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let a: RegExpExecArray | null;
  while ((a = re.exec(m[1]))) {
    const name = a[1].toLowerCase();
    if (!/^(src|async|defer|data-[a-z0-9-]+)$/.test(name)) return null; // inget annat än enkla attribut
    attrs[name] = a[2] ?? a[3] ?? a[4] ?? "";
  }
  try {
    const u = new URL(attrs.src || "");
    if (u.protocol !== "https:" || !TRUSTED_EMBED_HOSTS.includes(u.hostname)) return null;
  } catch {
    return null;
  }
  return { src: attrs.src, attrs };
}
