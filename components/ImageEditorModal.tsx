"use client";

import { useEffect, useRef, useState } from "react";

// Enkel bildredigerare: beskär (med bildförhållande, zoom och dra för att
// flytta), vrid, spegla och justera ljus/kontrast/färg. Allt sker i
// webbläsaren — resultatet lämnas som en JPEG-fil till föräldern, som laddar
// upp den och byter bilden (se app/api/sites/replace-image).

const ASPECTS: { id: string; label: string; ratio: number | null }[] = [
  { id: "orig", label: "Som bilden", ratio: null },
  { id: "1:1", label: "Kvadrat", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:2", label: "3:2", ratio: 3 / 2 },
  { id: "16:9", label: "Bred 16:9", ratio: 16 / 9 },
  { id: "3:4", label: "Stående", ratio: 3 / 4 },
];

// Friläggning sker i webbläsaren med en öppen AI-modell (MODNet, Apache 2.0)
// som hämtas först när kunden trycker på knappen. Biblioteket läses in från
// CDN vid behov så att det inte väger ner resten av sajten.
const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
const CUTOUT_MODEL = "Xenova/modnet";
// "Markera själv": en öppen modell (SlimSAM, Apache 2.0) som utifrån klick på
// "det här ska vara med" och "det här ska bort" hittar rätt motiv.
const POINT_MODEL = "Xenova/slimsam-77-uniform";
const CUTOUT_MAX = 1280; // längsta sidan som skickas in i modellen

type BgChoice = "white" | "gray" | "clear";
const BG_FILL: Record<BgChoice, string | null> = { white: "#FFFFFF", gray: "#EDEDED", clear: null };

const MAX_OUTPUT = 2000; // längsta sidan i pixlar på den sparade bilden
const PREVIEW_MAX_W = 560;
const PREVIEW_MAX_H = 380;

type Pos = { x: number; y: number };

// Ett steg som kan ångras: bilden med bakgrunden borttagen (null = ingen
// friläggning ännu) och, vid markeringar, de målade ytorna.
type UndoEntry = { cut: ImageData | null; keep?: ImageData; sub?: ImageData };

// Gör om en målad yta till ett grovt rutnät (för att hitta vad som ligger
// innanför en målad kontur och välja ut några representativa punkter).
function gridOf(c: HTMLCanvasElement, maxSide: number) {
  const k = Math.min(1, maxSide / Math.max(c.width, c.height));
  const gw = Math.max(1, Math.round(c.width * k));
  const gh = Math.max(1, Math.round(c.height * k));
  const t = document.createElement("canvas");
  t.width = gw;
  t.height = gh;
  const x = t.getContext("2d", { willReadFrequently: true })!;
  x.drawImage(c, 0, 0, gw, gh);
  const d = x.getImageData(0, 0, gw, gh).data;
  const on = new Uint8Array(gw * gh);
  for (let i = 0; i < gw * gh; i++) on[i] = d[i * 4 + 3] > 60 ? 1 : 0;
  return { gw, gh, on };
}

// Celler som är helt omslutna av målade streck (t.ex. insidan av en målad
// kontur runt ett föremål).
function enclosedCells(on: Uint8Array, gw: number, gh: number): number[] {
  const outside = new Uint8Array(gw * gh);
  const stack: number[] = [];
  const push = (i: number) => {
    if (!on[i] && !outside[i]) {
      outside[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < gw; x++) {
    push(x);
    push((gh - 1) * gw + x);
  }
  for (let y = 0; y < gh; y++) {
    push(y * gw);
    push(y * gw + gw - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % gw;
    const y = (i - x) / gw;
    if (x > 0) push(i - 1);
    if (x < gw - 1) push(i + 1);
    if (y > 0) push(i - gw);
    if (y < gh - 1) push(i + gw);
  }
  const out: number[] = [];
  for (let i = 0; i < gw * gh; i++) if (!on[i] && !outside[i]) out.push(i);
  return out;
}

// Väljer n punkter som ligger så utspridda som möjligt.
function spreadOut(cells: number[], gw: number, n: number): number[] {
  if (cells.length <= n) return cells;
  const out = [cells[Math.floor(cells.length / 2)]];
  const dist = new Float32Array(cells.length).fill(Infinity);
  while (out.length < n) {
    const last = out[out.length - 1];
    const lx = last % gw;
    const ly = Math.floor(last / gw);
    let best = 0;
    let bd = -1;
    for (let i = 0; i < cells.length; i++) {
      const dx = (cells[i] % gw) - lx;
      const dy = Math.floor(cells[i] / gw) - ly;
      const d = dx * dx + dy * dy;
      if (d < dist[i]) dist[i] = d;
      if (dist[i] > bd) {
        bd = dist[i];
        best = i;
      }
    }
    out.push(cells[best]);
  }
  return out;
}

function cropRect(baseW: number, baseH: number, ratio: number | null, zoom: number, pos: Pos) {
  const r = ratio ?? baseW / baseH;
  let w: number;
  let h: number;
  if (baseW / baseH > r) {
    h = baseH;
    w = h * r;
  } else {
    w = baseW;
    h = w / r;
  }
  w /= zoom;
  h /= zoom;
  return { x: (baseW - w) * pos.x, y: (baseH - h) * pos.y, w, h };
}

function adjustPixels(ctx: CanvasRenderingContext2D, w: number, h: number, bright: number, contrast: number, sat: number) {
  if (!bright && !contrast && !sat) return;
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  const c = (100 + contrast) / 100;
  const s = (100 + sat) / 100;
  const add = bright * 1.8;
  for (let i = 0; i < d.length; i += 4) {
    let r = (d[i] - 128) * c + 128 + add;
    let g = (d[i + 1] - 128) * c + 128 + add;
    let b = (d[i + 2] - 128) * c + 128 + add;
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * s;
    g = gray + (g - gray) * s;
    b = gray + (b - gray) * s;
    d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
  ctx.putImageData(data, 0, 0);
}

export default function ImageEditorModal({
  open,
  src,
  saving,
  onClose,
  onSave,
  onSkip,
  saveLabel,
  title,
}: {
  open: boolean;
  src: string;
  saving: boolean;
  onClose: () => void;
  onSave: (blob: Blob) => void;
  // Visas som en extra knapp, t.ex. "Använd utan ändringar" vid uppladdning.
  onSkip?: { label: string; run: () => void };
  saveLabel?: string;
  title?: string;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rot, setRot] = useState(0); // antal kvarts varv medurs
  const [flip, setFlip] = useState(false);
  const [aspect, setAspect] = useState("orig");
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState<Pos>({ x: 0.5, y: 0.5 });
  const [bright, setBright] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [sat, setSat] = useState(0);
  const [cutBusy, setCutBusy] = useState(false);
  const [cutDone, setCutDone] = useState(false);
  const [cutError, setCutError] = useState<string | null>(null);
  const [bg, setBg] = useState<BgChoice>("white");
  const origImgRef = useRef<HTMLImageElement | null>(null);
  // Friläggningen: cutRef är bilden med bakgrunden borttagen, origCutRef är
  // originalet i samma storlek (används när kunden penslar tillbaka det som
  // ska behållas). Penseln arbetar direkt på cutRef.
  const cutRef = useRef<HTMLCanvasElement | null>(null);
  const origCutRef = useRef<HTMLCanvasElement | null>(null);
  const undoRef = useRef<UndoEntry[]>([]);
  const strokeRef = useRef<{ x: number; y: number } | null>(null);
  const [maskVersion, setMaskVersion] = useState(0);
  const [tool, setTool] = useState<"move" | "keep" | "erase" | "add" | "sub">("move");
  // Markera själv: man målar grönt över det som ska vara med (eller runt
  // kanterna) och rött över det som ska bort. hintVersion ritar om förhandsvisningen.
  const [hintVersion, setHintVersion] = useState(0);
  const hintingRef = useRef(false);
  const hintLast = useRef<{ x: number; y: number } | null>(null);
  const [pointBusy, setPointBusy] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const samRef = useRef<any>(null);
  const decodeSeq = useRef(0);
  const [brush, setBrush] = useState(24);
  const [canUndo, setCanUndo] = useState(false);

  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [baseVersion, setBaseVersion] = useState(0);
  const dragRef = useRef<{ x: number; y: number; pos: Pos } | null>(null);

  const reset = () => {
    setRot(0);
    setFlip(false);
    setAspect("orig");
    setZoom(1);
    setPos({ x: 0.5, y: 0.5 });
    setBright(0);
    setContrast(0);
    setSat(0);
    setCutDone(false);
    setCutError(null);
    setBg("white");
    cutRef.current = null;
    origCutRef.current = null;
    undoRef.current = [];
    setCanUndo(false);
    setTool("move");
    samRef.current = null;
  };

  // Läs in bilden varje gång dialogen öppnas.
  useEffect(() => {
    if (!open) return;
    reset();
    setImg(null);
    setError(null);
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => {
      origImgRef.current = im;
      setImg(im);
    };
    im.onerror = () => setError("Det gick inte att öppna bilden för redigering. Prova att ladda upp bilden igen.");
    const [base] = src.split("#");
    // En ny parameter gör att webbläsaren inte återanvänder en tidigare
    // cachad kopia utan rätt tillåtelse (CORS) för redigering.
    const local = base.startsWith("blob:") || base.startsWith("data:");
    im.src = local ? base : base + (base.includes("?") ? "&" : "?") + "ycs=edit";
  }, [open, src]);

  // Bygg basbilden (vriden/speglad) när något av det ändras.
  useEffect(() => {
    if (!img) return;
    const cutC = cutDone ? cutRef.current : null;
    const sw = cutC ? cutC.width : img.naturalWidth;
    const sh = cutC ? cutC.height : img.naturalHeight;
    const swap = rot % 2 === 1;
    const w = swap ? sh : sw;
    const h = swap ? sw : sh;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    const fill = BG_FILL[bg];
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rot * Math.PI) / 2);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(cutC ?? img, -sw / 2, -sh / 2);
    baseRef.current = c;
    setBaseVersion((v) => v + 1);
  }, [img, rot, flip, bg, cutDone, maskVersion]);

  const removeBackground = async () => {
    if (!img || cutBusy) return;
    setCutBusy(true);
    setCutError(null);
    try {
      const k = Math.min(1, CUTOUT_MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * k));
      const h = Math.max(1, Math.round(img.naturalHeight * k));
      const src = document.createElement("canvas");
      src.width = w;
      src.height = h;
      const sctx = src.getContext("2d")!;
      sctx.drawImage(img, 0, 0, w, h);
      const dataUrl = src.toDataURL("image/png");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lib: any = await import(/* webpackIgnore: true */ TRANSFORMERS_URL);
      const segmenter = await lib.pipeline("background-removal", CUTOUT_MODEL);
      const result = await segmenter(dataUrl);
      const out = Array.isArray(result) ? result[0] : result;
      if (!out || !out.data) throw new Error("tomt svar");
      const c = document.createElement("canvas");
      c.width = out.width;
      c.height = out.height;
      const cctx = c.getContext("2d")!;
      const rgba = new Uint8ClampedArray(out.width * out.height * 4);
      const ch: number = out.channels;
      for (let i = 0; i < out.width * out.height; i++) {
        rgba[i * 4] = out.data[i * ch];
        rgba[i * 4 + 1] = out.data[i * ch + 1];
        rgba[i * 4 + 2] = out.data[i * ch + 2];
        rgba[i * 4 + 3] = ch === 4 ? out.data[i * ch + 3] : 255;
      }
      cctx.putImageData(new ImageData(rgba, out.width, out.height), 0, 0);
      // Originalet i exakt samma storlek som friläggningen, för "Behåll"-penseln.
      const oc = document.createElement("canvas");
      oc.width = out.width;
      oc.height = out.height;
      oc.getContext("2d")!.drawImage(src, 0, 0, out.width, out.height);
      pushUndo(true);
      origCutRef.current = oc;
      cutRef.current = c;
      setCutDone(true);
      setMaskVersion((v) => v + 1);
    } catch (e) {
      console.error("Friläggning misslyckades", e);
      setCutError("Det gick inte att frilägga bilden just nu. Kontrollera din uppkoppling och prova igen.");
    } finally {
      setCutBusy(false);
    }
  };

  const ratio = ASPECTS.find((a) => a.id === aspect)?.ratio ?? null;

  // Medan man penslar visas hela bilden (ingen beskärning), så att varje
  // punkt på skärmen går att översätta till en punkt i bilden.
  const pointing = tool === "add" || tool === "sub";
  const painting = cutDone && (tool === "keep" || tool === "erase");
  const fullView = painting || pointing;
  const view = fullView ? { ratio: null as number | null, zoom: 1, pos: { x: 0.5, y: 0.5 } } : { ratio, zoom, pos };

  const draw = (target: HTMLCanvasElement, outW: number, v: { ratio: number | null; zoom: number; pos: Pos } = view) => {
    const base = baseRef.current;
    if (!base) return;
    const r = cropRect(base.width, base.height, v.ratio, v.zoom, v.pos);
    const outH = Math.max(1, Math.round((outW * r.h) / r.w));
    target.width = Math.max(1, Math.round(outW));
    target.height = outH;
    const ctx = target.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(base, r.x, r.y, r.w, r.h, 0, 0, target.width, target.height);
    adjustPixels(ctx, target.width, target.height, bright, contrast, sat);
  };

  // Rita förhandsvisningen.
  useEffect(() => {
    const base = baseRef.current;
    const canvas = previewRef.current;
    if (!base || !canvas) return;
    const r = cropRect(base.width, base.height, view.ratio, view.zoom, view.pos);
    const w = Math.min(PREVIEW_MAX_W, (PREVIEW_MAX_H * r.w) / r.h);
    draw(canvas, w);
    if (pointing && samRef.current) {
      // Lägg de målade ytorna ovanpå bilden (grönt = behåll, rött = ta bort).
      const sam = samRef.current;
      const cutC = cutDone ? cutRef.current : null;
      const dw = cutC ? cutC.width : img!.naturalWidth;
      const dh = cutC ? cutC.height : img!.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      const swap = rot % 2 === 1;
      const bw = swap ? dh : dw;
      const sc = canvas.width / bw;
      const tint = (src: HTMLCanvasElement, color: string) => {
        const t = document.createElement("canvas");
        t.width = src.width;
        t.height = src.height;
        const x = t.getContext("2d")!;
        x.fillStyle = color;
        x.fillRect(0, 0, t.width, t.height);
        x.globalCompositeOperation = "destination-in";
        x.drawImage(src, 0, 0);
        return t;
      };
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      ctx.translate((swap ? dh : dw) / 2, (swap ? dw : dh) / 2);
      ctx.rotate((rot * Math.PI) / 2);
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(tint(sam.hintKeep, "#16a34a"), -dw / 2, -dh / 2, dw, dh);
      ctx.drawImage(tint(sam.hintSub, "#dc2626"), -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseVersion, ratio, zoom, pos, bright, contrast, sat, fullView, hintVersion]);

  // När man går in i "Markera" förbereds modellen direkt (tar en stund första gången).
  useEffect(() => {
    if (!open || !pointing || samRef.current || !img) return;
    ensureSam().catch((err) => {
      console.error("Kunde inte starta markeringsverktyget", err);
      setPointBusy(null);
      setCutError("Det gick inte att starta markeringsverktyget. Kontrollera din uppkoppling och prova igen.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pointing, img]);

  if (!open) return null;

  // Översätter en pekarposition i förhandsvisningen till en punkt i den
  // frilagda bilden (tar hänsyn till vridning och spegling).
  const toSource = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const base = baseRef.current;
    const cutC = cutDone ? cutRef.current : null;
    const canvas = previewRef.current;
    if (!base || !canvas || !img) return null;
    const dw = cutC ? cutC.width : img.naturalWidth;
    const dh = cutC ? cutC.height : img.naturalHeight;
    const rect = canvas.getBoundingClientRect();
    const bx = ((e.clientX - rect.left) / rect.width) * base.width;
    const by = ((e.clientY - rect.top) / rect.height) * base.height;
    const th = (-rot * Math.PI) / 2;
    const px = bx - base.width / 2;
    const py = by - base.height / 2;
    let x = px * Math.cos(th) - py * Math.sin(th);
    const y = px * Math.sin(th) + py * Math.cos(th);
    if (flip) x = -x;
    return { x: x + dw / 2, y: y + dh / 2, k: base.width / rect.width, dw, dh };
  };
  const paintAt = (x: number, y: number, radius: number) => {
    const cutC = cutRef.current;
    const orig = origCutRef.current;
    if (!cutC || !orig) return;
    const ctx = cutC.getContext("2d")!;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (tool === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fill();
    } else {
      ctx.clip();
      // Ta först bort det som finns i cirkeln så att halvgenomskinliga
      // kanter inte blandas med originalet, och lägg sedan tillbaka det.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(orig, 0, 0);
    }
    ctx.restore();
  };
  const strokeTo = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = toSource(e);
    if (!pt) return;
    const radius = Math.max(1, (brush / 2) * pt.k);
    const last = strokeRef.current ?? { x: pt.x, y: pt.y };
    const dist = Math.hypot(pt.x - last.x, pt.y - last.y);
    const steps = Math.max(1, Math.ceil(dist / Math.max(1, radius / 3)));
    for (let i = 1; i <= steps; i++) {
      paintAt(last.x + ((pt.x - last.x) * i) / steps, last.y + ((pt.y - last.y) * i) / steps, radius);
    }
    strokeRef.current = { x: pt.x, y: pt.y };
    setMaskVersion((v) => v + 1);
  };
  // Förbereder SlimSAM för den här bilden (hämtar modellen första gången och
  // läser in bilden en gång — sedan går varje klick fort).
  const ensureSam = async () => {
    if (samRef.current) return samRef.current;
    if (!img) throw new Error("ingen bild");
    setPointBusy("Hämtar verktyget … kan ta en stund första gången.");
    const k = Math.min(1, CUTOUT_MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k));
    const h = Math.max(1, Math.round(img.naturalHeight * k));
    const src = document.createElement("canvas");
    src.width = w;
    src.height = h;
    src.getContext("2d")!.drawImage(img, 0, 0, w, h);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lib: any = await import(/* webpackIgnore: true */ TRANSFORMERS_URL);
    const model = await lib.SamModel.from_pretrained(POINT_MODEL);
    const processor = await lib.AutoProcessor.from_pretrained(POINT_MODEL);
    const raw = await lib.RawImage.fromURL(src.toDataURL("image/png"));
    const imageInputs = await processor(raw);
    setPointBusy("Läser in bilden …");
    const embeddings = await model.get_image_embeddings(imageInputs);
    const hk = Math.min(1, 512 / Math.max(w, h));
    const hw = Math.max(1, Math.round(w * hk));
    const hh = Math.max(1, Math.round(h * hk));
    const hintKeep = document.createElement("canvas");
    const hintSub = document.createElement("canvas");
    hintKeep.width = hintSub.width = hw;
    hintKeep.height = hintSub.height = hh;
    samRef.current = { lib, model, processor, imageInputs, embeddings, src, w, h, hw, hh, hintKeep, hintSub };
    setPointBusy(null);
    setHintVersion((v) => v + 1);
    return samRef.current;
  };

  // Räknar ut motivet utifrån alla klickpunkter och lägger det som friläggning.
  const decode = async (pts: { x: number; y: number; label: 0 | 1 }[]) => {
    const seq = ++decodeSeq.current;
    if (pts.length === 0) return;
    try {
      const sam = await ensureSam();
      setPointBusy("Markerar …");
      const { Tensor } = sam.lib;
      const reshaped = sam.imageInputs.reshaped_input_sizes[0]; // [h, w]
      const flat: number[] = [];
      for (const pt of pts) flat.push((pt.x / sam.w) * reshaped[1], (pt.y / sam.h) * reshaped[0]);
      const inputPoints = new Tensor("float32", flat, [1, 1, pts.length, 2]);
      const inputLabels = new Tensor("int64", pts.map((pt) => BigInt(pt.label)), [1, 1, pts.length]);
      const outputs = await sam.model({ ...sam.embeddings, input_points: inputPoints, input_labels: inputLabels });
      const masks = await sam.processor.post_process_masks(
        outputs.pred_masks,
        sam.imageInputs.original_sizes,
        sam.imageInputs.reshaped_input_sizes
      );
      if (seq !== decodeSeq.current) return;
      const m = masks[0];
      const dims: number[] = m.dims; // [1, 3, H, W]
      const mh = dims[dims.length - 2];
      const mw = dims[dims.length - 1];
      const scores = Array.from(outputs.iou_scores.data as ArrayLike<number>);
      let best = 0;
      for (let i = 1; i < scores.length; i++) if (scores[i] > scores[best]) best = i;
      const off = best * mh * mw;
      const c = document.createElement("canvas");
      c.width = sam.w;
      c.height = sam.h;
      const cctx = c.getContext("2d")!;
      cctx.drawImage(sam.src, 0, 0);
      const id = cctx.getImageData(0, 0, sam.w, sam.h);
      for (let i = 0; i < sam.w * sam.h; i++) id.data[i * 4 + 3] = m.data[off + i] ? 255 : 0;
      cctx.putImageData(id, 0, 0);
      const oc = document.createElement("canvas");
      oc.width = sam.w;
      oc.height = sam.h;
      oc.getContext("2d")!.drawImage(sam.src, 0, 0);
      origCutRef.current = oc;
      cutRef.current = c;
      setCutDone(true);
      setMaskVersion((v) => v + 1);
      setCutError(null);
    } catch (err) {
      console.error("Markering misslyckades", err);
      setCutError("Det gick inte att markera just nu. Kontrollera din uppkoppling och prova igen.");
    } finally {
      if (seq === decodeSeq.current) setPointBusy(null);
    }
  };

  // ---- Ångra ----
  const pushUndo = (withHints: boolean) => {
    const cutC = cutDone ? cutRef.current : null;
    const entry: UndoEntry = {
      cut: cutC ? cutC.getContext("2d")!.getImageData(0, 0, cutC.width, cutC.height) : null,
    };
    const sam = samRef.current;
    if (withHints && sam) {
      entry.keep = sam.hintKeep.getContext("2d")!.getImageData(0, 0, sam.hw, sam.hh);
      entry.sub = sam.hintSub.getContext("2d")!.getImageData(0, 0, sam.hw, sam.hh);
    }
    undoRef.current.push(entry);
    if (undoRef.current.length > 10) undoRef.current.shift();
    setCanUndo(true);
  };
  const undoLast = () => {
    const entry = undoRef.current.pop();
    if (!entry) return;
    decodeSeq.current++; // avbryt en pågående uträkning
    setPointBusy(null);
    if (entry.cut) {
      let c = cutRef.current;
      if (!c || c.width !== entry.cut.width || c.height !== entry.cut.height) {
        c = document.createElement("canvas");
        c.width = entry.cut.width;
        c.height = entry.cut.height;
        cutRef.current = c;
      }
      c.getContext("2d")!.putImageData(entry.cut, 0, 0);
      setCutDone(true);
    } else {
      setCutDone(false);
    }
    const sam = samRef.current;
    if (sam && entry.keep && entry.sub) {
      sam.hintKeep.getContext("2d")!.putImageData(entry.keep, 0, 0);
      sam.hintSub.getContext("2d")!.putImageData(entry.sub, 0, 0);
    }
    setCanUndo(undoRef.current.length > 0);
    setMaskVersion((v) => v + 1);
    setHintVersion((v) => v + 1);
  };

  // ---- Markera själv: måla grönt/rött, systemet hittar motivet ----
  const hintStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const sam = samRef.current;
    const pt = toSource(e);
    if (!sam || !pt) return;
    const hx = (pt.x / pt.dw) * sam.hw;
    const hy = (pt.y / pt.dh) * sam.hh;
    const r = Math.max(1, (brush / 2) * pt.k * (sam.hw / pt.dw));
    const last = hintLast.current ?? { x: hx, y: hy };
    const draw = (c: HTMLCanvasElement, erase: boolean) => {
      const x = c.getContext("2d")!;
      x.save();
      x.globalCompositeOperation = erase ? "destination-out" : "source-over";
      x.lineCap = "round";
      x.lineJoin = "round";
      x.lineWidth = 2 * r;
      x.strokeStyle = "#000";
      x.beginPath();
      x.moveTo(last.x, last.y);
      x.lineTo(hx + 0.01, hy);
      x.stroke();
      x.restore();
    };
    draw(tool === "add" ? sam.hintKeep : sam.hintSub, false);
    draw(tool === "add" ? sam.hintSub : sam.hintKeep, true);
    hintLast.current = { x: hx, y: hy };
    setHintVersion((v) => v + 1);
  };
  // Läser av målningen: punkter inuti det gröna (och innanför en målad
  // kontur), och punkter i det röda — och låter modellen hitta motivet.
  const runHints = () => {
    const sam = samRef.current;
    if (!sam) return;
    const keep = gridOf(sam.hintKeep, 128);
    const sub = gridOf(sam.hintSub, 128);
    const keepCells: number[] = [];
    keep.on.forEach((v, i) => v && keepCells.push(i));
    const subCells: number[] = [];
    sub.on.forEach((v, i) => v && subCells.push(i));
    if (keepCells.length === 0) {
      setCutError(subCells.length > 0 ? "Måla med grönt över det som ska vara med – då kan jag hitta motivet." : null);
      return;
    }
    const inside = enclosedCells(keep.on, keep.gw, keep.gh);
    const pos =
      inside.length >= 6
        ? [...spreadOut(inside, keep.gw, 6), ...spreadOut(keepCells, keep.gw, 2)]
        : spreadOut(keepCells, keep.gw, 8);
    const neg = spreadOut(subCells, sub.gw, 8);
    const toPt = (cell: number, g: { gw: number; gh: number }, label: 0 | 1) => ({
      x: (((cell % g.gw) + 0.5) / g.gw) * sam.w,
      y: ((Math.floor(cell / g.gw) + 0.5) / g.gh) * sam.h,
      label,
    });
    decode([...pos.map((c) => toPt(c, keep, 1)), ...neg.map((c) => toPt(c, sub, 0))]);
  };
  const clearHints = () => {
    const sam = samRef.current;
    if (!sam) return;
    pushUndo(true);
    sam.hintKeep.getContext("2d")!.clearRect(0, 0, sam.hw, sam.hh);
    sam.hintSub.getContext("2d")!.clearRect(0, 0, sam.hw, sam.hh);
    setHintVersion((v) => v + 1);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    if (pointing) {
      if (!samRef.current) return; // verktyget laddas fortfarande
      pushUndo(true);
      hintingRef.current = true;
      hintLast.current = null;
      hintStroke(e);
      return;
    }
    if (painting) {
      pushUndo(false);
      strokeRef.current = null;
      strokeTo(e);
      return;
    }
    dragRef.current = { x: e.clientX, y: e.clientY, pos };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointing) {
      if (hintingRef.current) hintStroke(e);
      return;
    }
    if (painting) {
      if (e.buttons || e.pointerType === "touch") {
        if (strokeRef.current) strokeTo(e);
      }
      return;
    }
    const drag = dragRef.current;
    const base = baseRef.current;
    const canvas = previewRef.current;
    if (!drag || !base || !canvas) return;
    const r = cropRect(base.width, base.height, ratio, zoom, drag.pos);
    const scale = r.w / canvas.getBoundingClientRect().width; // källpixlar per skärmpixel
    const rangeX = base.width - r.w;
    const rangeY = base.height - r.h;
    const nx = rangeX > 0 ? drag.pos.x - ((e.clientX - drag.x) * scale) / rangeX : drag.pos.x;
    const ny = rangeY > 0 ? drag.pos.y - ((e.clientY - drag.y) * scale) / rangeY : drag.pos.y;
    setPos({ x: Math.min(1, Math.max(0, nx)), y: Math.min(1, Math.max(0, ny)) });
  };
  const onPointerUp = () => {
    dragRef.current = null;
    strokeRef.current = null;
    if (hintingRef.current) {
      hintingRef.current = false;
      hintLast.current = null;
      runHints();
    }
  };

  const save = () => {
    const base = baseRef.current;
    if (!base) return;
    const r = cropRect(base.width, base.height, ratio, zoom, pos);
    const outW = Math.min(r.w, r.w >= r.h ? MAX_OUTPUT : (MAX_OUTPUT * r.w) / r.h);
    const out = document.createElement("canvas");
    draw(out, outW, { ratio, zoom, pos });
    const asPng = cutDone && bg === "clear";
    out.toBlob(
      (blob) => {
        if (blob) onSave(blob);
        else setError("Det gick inte att spara bilden. Försök igen.");
      },
      asPng ? "image/png" : "image/jpeg",
      0.9
    );
  };

  const slider = (label: string, value: number, set: (n: number) => void, min = -50, max = 50) => (
    <label className="flex items-center gap-3 text-[12.5px]">
      <span className="w-20 flex-shrink-0 text-ink-dim">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="flex-1 accent-[#0C1004]"
      />
    </label>
  );

  const btn = "text-[12.5px] font-semibold border border-line rounded-lg px-3 py-1.5 bg-surface text-ink hover:border-ink disabled:opacity-60";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={saving ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Redigera bild"
    >
      <div
        className="bg-surface rounded-2xl w-full max-w-[640px] max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
          <h2 className="text-[17px] font-medium">{title ?? "Redigera bild"}</h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Stäng" className="text-[22px] leading-none text-ink-dim px-1">
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {error ? (
            <p className="text-[13px] text-red-600">{error}</p>
          ) : !img ? (
            <p className="text-[13px] text-ink-dim">Öppnar bilden …</p>
          ) : (
            <>
              <div className="flex justify-center bg-bg rounded-xl p-2">
                <canvas
                  ref={previewRef}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  className={`max-w-full rounded-lg touch-none ${fullView ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
                  style={
                    cutDone && bg === "clear"
                      ? {
                          touchAction: "none",
                          backgroundColor: "#fff",
                          backgroundImage:
                            "linear-gradient(45deg,#ddd 25%,transparent 25%,transparent 75%,#ddd 75%),linear-gradient(45deg,#ddd 25%,transparent 25%,transparent 75%,#ddd 75%)",
                          backgroundSize: "16px 16px",
                          backgroundPosition: "0 0,8px 8px",
                        }
                      : { touchAction: "none" }
                  }
                />
              </div>
              <p className="text-[12px] text-ink-dim -mt-2">Zooma med reglaget och dra i bilden för att välja vilken del som ska synas.</p>

              <div className="flex flex-wrap gap-1.5">
                {ASPECTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setAspect(a.id);
                      setPos({ x: 0.5, y: 0.5 });
                    }}
                    className={`text-[12px] font-semibold rounded-full px-3 py-1 border ${
                      aspect === a.id ? "bg-accent text-accent-ink border-accent" : "bg-surface border-line text-ink"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2.5">
                {slider("Zoom", Math.round((zoom - 1) * 50), (n) => setZoom(1 + n / 50), 0, 100)}
                {slider("Ljusstyrka", bright, setBright)}
                {slider("Kontrast", contrast, setContrast)}
                {slider("Färgstyrka", sat, setSat)}
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className={btn} onClick={removeBackground} disabled={cutBusy || !img}>
                    {cutBusy ? "Friläggar … (kan ta en stund första gången)" : cutDone ? "✨ Frilägg automatiskt igen" : "✨ Frilägg automatiskt"}
                  </button>
                  <button
                    type="button"
                    className={btn}
                    onClick={() => setTool("add")}
                    disabled={!img || (pointBusy !== null && !pointing)}
                  >
                    🎯 Markera motivet själv
                  </button>
                  {cutDone && (
                    <span className="flex items-center gap-1.5 text-[12px] text-ink-dim">
                      Bakgrund:
                      {(["white", "gray", "clear"] as BgChoice[]).map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBg(b)}
                          className={`text-[12px] font-semibold rounded-full px-2.5 py-0.5 border ${
                            bg === b ? "bg-accent text-accent-ink border-accent" : "bg-surface border-line text-ink"
                          }`}
                        >
                          {b === "white" ? "Vit" : b === "gray" ? "Ljusgrå" : "Genomskinlig"}
                        </button>
                      ))}
                    </span>
                  )}
                </div>
                {cutDone || pointing ? (
                  <div className="flex flex-col gap-2 border-t border-line pt-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                      <span className="text-ink-dim">Finjustera:</span>
                      {([
                        ["add", "🟢 Markera: behåll"],
                        ["sub", "🔴 Markera: ta bort"],
                        ["keep", "🖌️ Finpensel: behåll"],
                        ["erase", "🧽 Finpensel: ta bort"],
                        ["move", "✋ Flytta bilden"],
                      ] as const)
                        .filter(([t]) => cutDone || t === "add" || t === "sub" || t === "move")
                        .map(([t, label]) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTool(t)}
                          className={`text-[12px] font-semibold rounded-full px-2.5 py-1 border ${
                            tool === t ? "bg-accent text-accent-ink border-accent" : "bg-surface border-line text-ink"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                      <button type="button" className={btn} onClick={undoLast} disabled={!canUndo}>
                        ↩ Ångra senaste
                      </button>
                    </div>
                    {pointing && (
                      <>
                        {slider("Penselstorlek", brush, setBrush, 6, 80)}
                        <p className="text-[11.5px] text-ink-dim">
                          {pointBusy ? `${pointBusy} ` : ""}
                          Måla med 🟢 över motivet, eller rita en ring runt dess kanter – jag hittar det som ligger
                          innanför. Följer något oönskat med, måla över det med 🔴. Du kan måla flera gånger.{" "}
                          <button type="button" className="underline" onClick={clearHints}>
                            Rensa markeringar
                          </button>
                        </p>
                      </>
                    )}
                    {(tool === "keep" || tool === "erase") && (
                      <>
                        {slider("Penselstorlek", brush, setBrush, 6, 80)}
                        <p className="text-[11.5px] text-ink-dim">
                          {tool === "keep"
                            ? "Måla över det som ska vara med – bakgrunden där tas tillbaka."
                            : "Måla över det som ska bort."}{" "}
                          Hela bilden visas medan du penslar. Byt till Flytta bilden för att beskära.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-[11.5px] text-ink-dim">
                    Tar bort bakgrunden. Fungerar bäst på personer – på föremål kan du efteråt måla över det som ska
                    behållas eller tas bort.
                  </p>
                )}
                {cutError && <p className="text-[12px] text-red-600">{cutError}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" className={btn} onClick={() => setRot((r) => (r + 3) % 4)}>
                  ⟲ Vrid vänster
                </button>
                <button type="button" className={btn} onClick={() => setRot((r) => (r + 1) % 4)}>
                  ⟳ Vrid höger
                </button>
                <button type="button" className={btn} onClick={() => setFlip((f) => !f)}>
                  ⇋ Spegla
                </button>
                <button type="button" className={btn} onClick={reset}>
                  Återställ
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-line">
          <button type="button" className={btn} onClick={onClose} disabled={saving}>
            Avbryt
          </button>
          {onSkip && (
            <button type="button" className={btn} onClick={onSkip.run} disabled={saving}>
              {onSkip.label}
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || !img}
            className="text-[13px] font-bold rounded-lg px-4 py-1.5 bg-accent text-accent-ink disabled:opacity-60"
          >
            {saving ? "Sparar …" : saveLabel ?? "Spara bilden"}
          </button>
        </div>
      </div>
    </div>
  );
}
