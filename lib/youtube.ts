// Plockar ut video-id:t ur en YouTube-länk kunden (eller Millie) gett.
// Renderingen bäddar BARA in ett id som klarat den här kontrollen (11 tecken,
// bara a-z, A-Z, 0-9, "_" och "-") — aldrig en rå url rakt in i en iframe,
// så en felaktig eller illasinnad länk aldrig kan bli en egen iframe-adress.
// Stöder watch?v=, youtu.be/, /embed/, /shorts/ och /live/.
export function parseYouTubeId(url: string | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, "").toLowerCase();
  let id: string | null = null;
  if (host === "youtu.be") {
    id = u.pathname.slice(1).split("/")[0] || null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?]+)/);
      id = m ? m[1] : null;
    }
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}
