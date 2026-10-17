import type { Range } from '../data/countries';

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode JPEG'))), 'image/jpeg', quality),
  );
}

/**
 * Browsers write JPEGs at 72 DPI (or no density), so photo labs would print them at the wrong
 * size. This sets the JFIF density to the real print DPI, adding a JFIF header if none exists.
 */
async function withDpi(blob: Blob, dpi: number): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const hasJfif =
    bytes[2] === 0xff && bytes[3] === 0xe0 && String.fromCharCode(...bytes.slice(6, 11)) === 'JFIF\0';
  if (hasJfif) {
    bytes[13] = 1; // units: dots per inch
    bytes[14] = dpi >> 8;
    bytes[15] = dpi & 0xff;
    bytes[16] = dpi >> 8;
    bytes[17] = dpi & 0xff;
    return new Blob([bytes], { type: 'image/jpeg' });
  }
  const app0 = new Uint8Array([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01,
    dpi >> 8, dpi & 0xff, dpi >> 8, dpi & 0xff, 0x00, 0x00,
  ]);
  return new Blob([bytes.slice(0, 2), app0, bytes.slice(2)], { type: 'image/jpeg' });
}

/** Encodes a JPEG, lowering or raising quality to land inside a file-size range in KB. */
export async function encodeJpeg(canvas: HTMLCanvasElement, opts: { dpi?: number | null; sizeKB?: Range | null; maxKB?: number }): Promise<Blob> {
  const minKB = opts.sizeKB?.[0] ?? null;
  const maxKB = Math.min(opts.sizeKB?.[1] ?? Infinity, opts.maxKB ?? Infinity);
  const qualities = [0.92, 0.88, 0.84, 0.8, 0.75, 0.7, 0.65, 0.6, 0.5, 0.4, 0.3];

  let blob = await toBlob(canvas, qualities[0]);
  for (const q of qualities.slice(1)) {
    if (blob.size / 1024 <= maxKB) break;
    blob = await toBlob(canvas, q);
  }
  if (minKB != null && blob.size / 1024 < minKB) {
    for (const q of [0.96, 0.99, 1]) {
      blob = await toBlob(canvas, q);
      if (blob.size / 1024 >= minKB) break;
    }
  }
  return opts.dpi ? withDpi(blob, opts.dpi) : blob;
}

export interface Paper {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
}

export const PAPERS: Paper[] = [
  { id: '4x6', label: '4 × 6 in (10 × 15 cm)', widthMm: 101.6, heightMm: 152.4 },
  { id: '5x7', label: '5 × 7 in', widthMm: 127, heightMm: 177.8 },
  { id: 'a4', label: 'A4', widthMm: 210, heightMm: 297 },
  { id: 'letter', label: 'US Letter', widthMm: 215.9, heightMm: 279.4 },
];

// Spaced layout first; edge to edge (shared cut lines) only when it fits more copies,
// e.g. six 2 × 2 in photos on 4 × 6 in paper.
const SPACINGS = [
  { gap: 2, margin: 3 },
  { gap: 0, margin: 0 },
];

function fit(paperW: number, paperH: number, w: number, h: number, gap: number, margin: number) {
  const cols = Math.max(0, Math.floor((paperW - 2 * margin + gap + 0.01) / (w + gap)));
  const rows = Math.max(0, Math.floor((paperH - 2 * margin + gap + 0.01) / (h + gap)));
  return { cols, rows, count: cols * rows, gap };
}

/** Picks the orientation and spacing that fit the most copies. */
export function sheetLayout(photoMm: { widthMm: number; heightMm: number }, paper: Paper) {
  let best = { cols: 0, rows: 0, count: 0, gap: 0, pw: paper.widthMm, ph: paper.heightMm };
  for (const { gap, margin } of SPACINGS) {
    for (const [pw, ph] of [
      [paper.widthMm, paper.heightMm],
      [paper.heightMm, paper.widthMm],
    ]) {
      const f = fit(pw, ph, photoMm.widthMm, photoMm.heightMm, gap, margin);
      if (f.count > best.count) best = { ...f, pw, ph };
    }
  }
  return best;
}

/** Tiles as many copies as fit on the paper, with thin cut lines, at the photo's DPI. */
export function renderSheet(photo: HTMLCanvasElement, photoMm: { widthMm: number; heightMm: number }, paper: Paper, dpi: number) {
  const { cols, rows, count, gap, pw, ph } = sheetLayout(photoMm, paper);

  const pxPerMm = dpi / 25.4;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(pw * pxPerMm);
  canvas.height = Math.round(ph * pxPerMm);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gridW = cols * photoMm.widthMm + (cols - 1) * gap;
  const gridH = rows * photoMm.heightMm + (rows - 1) * gap;
  const x0 = (pw - gridW) / 2;
  const y0 = (ph - gridH) / 2;
  const w = photoMm.widthMm * pxPerMm;
  const h = photoMm.heightMm * pxPerMm;
  ctx.strokeStyle = '#b0b0b0';
  ctx.lineWidth = Math.max(1, pxPerMm * 0.1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (x0 + c * (photoMm.widthMm + gap)) * pxPerMm;
      const y = (y0 + r * (photoMm.heightMm + gap)) * pxPerMm;
      ctx.drawImage(photo, x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    }
  }
  return { canvas, count };
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
