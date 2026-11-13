// Gemensam hantering av bilder som laddas upp från webbläsaren.
// Tillåter stora originalfoton (upp till 15 MB) och förminskar dem innan
// de sparas, så lagringen och sajtens laddtider hålls nere. Ingen
// server är inblandad, och bildbehandlingen tar normalt under en sekund.

export const MAX_UPLOAD_IMAGE_BYTES = 15 * 1024 * 1024;
export const DEFAULT_MAX_DIM = 2400;

// Under den här storleken och inom måttgränsen lämnas filen orörd.
const KEEP_BELOW_BYTES = 1.2 * 1024 * 1024;

async function hasAlpha(canvas: HTMLCanvasElement): Promise<boolean> {
  // Provtar en liten version av bilden, snabbare än att läsa alla pixlar.
  const s = document.createElement("canvas");
  s.width = Math.min(64, canvas.width);
  s.height = Math.min(64, canvas.height);
  const c = s.getContext("2d");
  if (!c) return false;
  c.drawImage(canvas, 0, 0, s.width, s.height);
  const d = c.getImageData(0, 0, s.width, s.height).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
  return false;
}

export async function prepareImage(file: File, opts: { maxDim?: number } = {}): Promise<File> {
  const maxDim = opts.maxDim ?? DEFAULT_MAX_DIM;
  // GIF (kan vara animerad) och SVG rörs inte.
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size <= KEEP_BELOW_BYTES) {
      bmp.close?.();
      return file;
    }
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bmp.close?.();
      return file;
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();

    const keepPng = file.type === "image/png" && (await hasAlpha(canvas));
    const type = keepPng ? "image/png" : "image/jpeg";
    if (!keepPng) {
      // JPEG saknar transparens, så fyll med vitt under eventuella genomskinliga delar.
      const flat = document.createElement("canvas");
      flat.width = w;
      flat.height = h;
      const fctx = flat.getContext("2d");
      if (!fctx) return file;
      fctx.fillStyle = "#fff";
      fctx.fillRect(0, 0, w, h);
      fctx.drawImage(canvas, 0, 0);
      var src = flat;
    } else {
      var src = canvas;
    }
    const blob: Blob | null = await new Promise((res) => src.toBlob(res, type, 0.86));
    if (!blob) return file;
    // Är resultatet inte mindre och bilden inte förminskad behåller vi originalet.
    if (scale === 1 && blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "bild";
    return new File([blob], `${base}.${keepPng ? "png" : "jpg"}`, { type });
  } catch {
    return file;
  }
}
