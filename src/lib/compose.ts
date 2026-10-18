import { type CountrySpec, type Range, digitalSize, printSize } from '../data/countries';
import type { FaceInfo, Point } from './face';

/**
 * Fallback when the top of the head can't be found in the photo: on adults the eyes sit
 * close to the middle of the head height, so eye-to-crown is about eye-to-chin.
 */
export const CROWN_FACTOR = 1.0;
const DEFAULT_DPI = 600;
const TOP_MARGIN_SHARE = 0.45;

export interface Frame {
  widthPx: number;
  heightPx: number;
  widthMm: number;
  heightMm: number;
  pxPerMm: number;
  dpi: number | null;
}

export interface Adjust {
  /** Multiplier on the head size the app picks. */
  size: number;
  /** Shift in mm; positive moves the face right / down. */
  dxMm: number;
  dyMm: number;
}

export const NO_ADJUST: Adjust = { size: 1, dxMm: 0, dyMm: 0 };

export interface Layout {
  frame: Frame;
  scale: number;
  angle: number;
  eyeMid: Point;
  eyeOut: Point;
  chinY: number;
  crownY: number;
  headMm: number;
  targetHeadMm: [number, number];
  eyeFromBottomMm: number;
  eyeRangeMm: Range | null;
  missingEdges: string[];
  /** True when the crown came from head proportions rather than from the photo. */
  crownEstimated: boolean;
}

const mid = (r: Range): number | null => (r[0] != null && r[1] != null ? (r[0] + r[1]) / 2 : r[0] ?? r[1]);

export function printFrame(c: CountrySpec): Frame | null {
  const p = printSize(c);
  if (!p) return null;
  const dpi = c.appDefaults.dpi ?? DEFAULT_DPI;
  const pxPerMm = dpi / 25.4;
  return {
    widthPx: Math.round(p.widthMm * pxPerMm),
    heightPx: Math.round(p.heightMm * pxPerMm),
    widthMm: p.widthMm,
    heightMm: p.heightMm,
    pxPerMm,
    dpi,
  };
}

/** The digital export uses the printed photo's proportions for head size and position. */
export function digitalFrame(c: CountrySpec): Frame | null {
  const d = digitalSize(c);
  const p = printSize(c);
  if (!d || !p) return null;
  const pxPerMm = d.heightPx / p.heightMm;
  return { widthPx: d.widthPx, heightPx: d.heightPx, widthMm: d.widthPx / pxPerMm, heightMm: p.heightMm, pxPerMm, dpi: null };
}

/** Head height range in mm (chin to crown) the country asks for. */
export function headRangeMm(c: CountrySpec, heightMm: number): [number, number] {
  const r = c.head.chinToCrownMm;
  if (r && r[0] != null && r[1] != null) return [r[0], r[1]];
  const f = c.head.faceHeightRatio;
  if (f && f[0] != null && f[1] != null) return [f[0] * heightMm, f[1] * heightMm];
  // No official figure: ICAO-style 70–80% of the photo height.
  return [0.7 * heightMm, 0.8 * heightMm];
}

export function computeLayout(c: CountrySpec, face: FaceInfo, frame: Frame, adjust: Adjust, src: { width: number; height: number }): Layout {
  const [eL, eR] = face.leftEye.x <= face.rightEye.x ? [face.leftEye, face.rightEye] : [face.rightEye, face.leftEye];
  const angle = Math.atan2(eR.y - eL.y, eR.x - eL.x);
  const eyeMid = { x: (eL.x + eR.x) / 2, y: (eL.y + eR.y) / 2 };
  const down = { x: -Math.sin(angle), y: Math.cos(angle) };
  const eyeToChinSrc = (face.chin.x - eyeMid.x) * down.x + (face.chin.y - eyeMid.y) * down.y;
  const up = { x: -down.x, y: -down.y };
  const measured = face.crown ? ((face.crown.x - eyeMid.x) * up.x + (face.crown.y - eyeMid.y) * up.y) / eyeToChinSrc : null;
  const crownFactor = measured ?? CROWN_FACTOR;
  const headSrc = eyeToChinSrc * (1 + crownFactor);

  const targetHeadMm = headRangeMm(c, frame.heightMm);
  const headMmWanted = ((targetHeadMm[0] + targetHeadMm[1]) / 2) * adjust.size;
  const eyeToCrownMm = (headMmWanted * crownFactor) / (1 + crownFactor);

  const eyeRangeMm = c.eyeLine.fromBottomMm ?? c.appDefaults.eyeLineFromBottomMm ?? null;
  const eyeFromBottomDefault = eyeRangeMm
    ? mid(eyeRangeMm)!
    : frame.heightMm - (frame.heightMm - headMmWanted) * TOP_MARGIN_SHARE - eyeToCrownMm;
  const eyeFromBottomMm = eyeFromBottomDefault - adjust.dyMm;

  const scale = (headMmWanted * frame.pxPerMm) / headSrc;
  const eyeOut = {
    x: frame.widthPx / 2 + adjust.dxMm * frame.pxPerMm,
    y: frame.heightPx - eyeFromBottomMm * frame.pxPerMm,
  };
  const chinY = eyeOut.y + eyeToChinSrc * scale;
  const crownY = eyeOut.y - eyeToChinSrc * crownFactor * scale;

  // Map the output corners back into the photo to see whether any edge falls outside it.
  const toSrc = (x: number, y: number): Point => {
    const ux = (x - eyeOut.x) / scale;
    const uy = (y - eyeOut.y) / scale;
    return {
      x: eyeMid.x + ux * Math.cos(angle) - uy * Math.sin(angle),
      y: eyeMid.y + ux * Math.sin(angle) + uy * Math.cos(angle),
    };
  };
  const tol = 2;
  const corners = [toSrc(0, 0), toSrc(frame.widthPx, 0), toSrc(0, frame.heightPx), toSrc(frame.widthPx, frame.heightPx)];
  const missingEdges: string[] = [];
  if (corners.slice(0, 2).some((p) => p.y < -tol)) missingEdges.push('top');
  if (corners.some((p) => p.x < -tol || p.x > src.width + tol)) missingEdges.push('sides');
  if (corners.slice(2).some((p) => p.y > src.height + tol)) missingEdges.push('bottom');

  return {
    frame,
    scale,
    angle,
    eyeMid,
    eyeOut,
    chinY,
    crownY,
    headMm: (chinY - crownY) / frame.pxPerMm,
    targetHeadMm,
    eyeFromBottomMm,
    eyeRangeMm,
    missingEdges,
    crownEstimated: measured == null,
  };
}

/**
 * Draws the photo rotated, scaled and cropped into the frame. Where the frame reaches past the
 * photo, the photo's own edge pixels are stretched outwards so a plain background continues;
 * if the head touches the top edge, the country's background colour is used there instead.
 */
export function render(
  bitmap: ImageBitmap,
  layout: Layout,
  background: string,
  extendTop = true,
  personMask: HTMLCanvasElement | null = null,
): HTMLCanvasElement {
  const { frame } = layout;
  const canvas = document.createElement('canvas');
  canvas.width = frame.widthPx;
  canvas.height = frame.heightPx;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(layout.eyeOut.x, layout.eyeOut.y);
  ctx.scale(layout.scale, layout.scale);
  ctx.rotate(-layout.angle);
  ctx.translate(-layout.eyeMid.x, -layout.eyeMid.y);
  const W = bitmap.width;
  const H = bitmap.height;
  const B = 4 * Math.max(W, H);
  const e = Math.min(3, W, H);
  ctx.drawImage(bitmap, 0, H - e, W, e, 0, H, W, B);
  ctx.drawImage(bitmap, 0, 0, e, H, -B, 0, B, H);
  ctx.drawImage(bitmap, W - e, 0, e, H, W, 0, B, H);
  ctx.drawImage(bitmap, 0, H - e, e, e, -B, H, B, B);
  ctx.drawImage(bitmap, W - e, H - e, e, e, W, H, B, B);
  if (extendTop) {
    ctx.drawImage(bitmap, 0, 0, W, e, 0, -B, W, B);
    ctx.drawImage(bitmap, 0, 0, e, e, -B, -B, B, B);
    ctx.drawImage(bitmap, W - e, 0, e, e, W, -B, B, B);
  } else {
    ctx.fillStyle = background;
    ctx.fillRect(-B, -B, W + 2 * B, B);
  }
  ctx.drawImage(bitmap, 0, 0);
  if (personMask) replaceBackground(canvas, layout, personMask, W, H, background);
  return canvas;
}

/**
 * Keeps only the person (from a segmentation mask covering the whole photo) and puts the
 * country's background colour behind them. The body is assumed to continue below the photo.
 */
function replaceBackground(canvas: HTMLCanvasElement, layout: Layout, mask: HTMLCanvasElement, W: number, H: number, background: string) {
  const m = document.createElement('canvas');
  m.width = canvas.width;
  m.height = canvas.height;
  const mctx = m.getContext('2d')!;
  mctx.imageSmoothingEnabled = true;
  mctx.imageSmoothingQuality = 'high';
  mctx.translate(layout.eyeOut.x, layout.eyeOut.y);
  mctx.scale(layout.scale, layout.scale);
  mctx.rotate(-layout.angle);
  mctx.translate(-layout.eyeMid.x, -layout.eyeMid.y);
  const B = 4 * Math.max(W, H);
  mctx.drawImage(mask, 0, mask.height - 1, mask.width, 1, 0, H, W, B);
  mctx.drawImage(mask, 0, 0, W, H);

  const ctx = canvas.getContext('2d')!;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(m, 0, 0);
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

/** fail: can't be used; warn: may be rejected; pass: meets a rule; info: what the app adjusted, nothing wrong. */
export type CheckLevel = 'pass' | 'warn' | 'fail' | 'info';
export interface Check {
  level: CheckLevel;
  text: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function checkResult(faces: FaceInfo[], layout: Layout | null, backgroundReplaced = false): Check[] {
  if (faces.length === 0) return [{ level: 'fail', text: 'No face found. Use a clear, front-facing photo of one person.' }];
  if (faces.length > 1) return [{ level: 'fail', text: 'More than one face found. Use a photo with only you in it.' }];
  const checks: Check[] = [{ level: 'pass', text: 'One face found' }];
  const face = faces[0];

  const deg = Math.abs((layout?.angle ?? 0) * 180) / Math.PI;
  checks.push({ level: 'pass', text: 'Head is level' });
  if (deg > 1) checks.push({ level: 'info', text: `Straightened by ${round1(deg)}°` });

  const dl = Math.hypot(face.noseTip.x - face.cheekLeft.x, face.noseTip.y - face.cheekLeft.y);
  const dr = Math.hypot(face.noseTip.x - face.cheekRight.x, face.noseTip.y - face.cheekRight.y);
  const turn = Math.abs(dl - dr) / (dl + dr);
  checks.push(turn > 0.15 ? { level: 'warn', text: 'Head looks turned. Face the camera straight on.' } : { level: 'pass', text: 'Facing the camera' });

  const b = face.blendshapes;
  if ((b.eyeBlinkLeft ?? 0) > 0.5 || (b.eyeBlinkRight ?? 0) > 0.5) checks.push({ level: 'warn', text: 'Eyes may be closed.' });
  if ((b.jawOpen ?? 0) > 0.25) checks.push({ level: 'warn', text: 'Mouth looks open. Keep it closed.' });
  else if ((b.mouthSmileLeft ?? 0) + (b.mouthSmileRight ?? 0) > 1.0) checks.push({ level: 'warn', text: 'Big smile detected. Most countries want a neutral expression.' });

  if (layout) {
    const [lo, hi] = layout.targetHeadMm;
    const h = layout.headMm;
    checks.push(
      h >= lo - 0.05 && h <= hi + 0.05
        ? { level: 'pass', text: `Head height ${round1(h)} mm (allowed ${round1(lo)}–${round1(hi)} mm)` }
        : { level: 'warn', text: `Head height ${round1(h)} mm is outside ${round1(lo)}–${round1(hi)} mm` },
    );
    if (layout.eyeRangeMm && layout.eyeRangeMm[0] != null && layout.eyeRangeMm[1] != null) {
      const e = layout.eyeFromBottomMm;
      const ok = e >= layout.eyeRangeMm[0] && e <= layout.eyeRangeMm[1];
      checks.push({ level: ok ? 'pass' : 'warn', text: `Eye line ${round1(e)} mm from bottom (allowed ${layout.eyeRangeMm[0]}–${layout.eyeRangeMm[1]} mm)` });
    }
    // Mild enlargement is normal and barely visible; only strong enlargement risks a soft photo.
    if (layout.scale > 1.6) {
      checks.push({ level: 'warn', text: 'The face is small in this photo, so it was enlarged a lot and may look soft. A closer or sharper photo will look better.' });
    } else if (layout.scale > 1.05) {
      checks.push({ level: 'info', text: 'Enlarged slightly to reach the required head size' });
    }
    if (face.crownCut) {
      checks.push({ level: 'warn', text: 'The top of the head is cut off in this photo, so head height is estimated. Use a photo with space above your hair.' });
    } else if (layout.crownEstimated) {
      checks.push({ level: 'info', text: 'Top of head estimated. Check the dashed line sits on top of your hair.' });
    }
    if (backgroundReplaced) checks.push({ level: 'info', text: 'Background replaced with the required colour' });
    // With a new background, only a missing bottom (cut-off shoulders) is visible in the result.
    const missing = backgroundReplaced ? layout.missingEdges.filter((e) => e === 'bottom') : layout.missingEdges;
    if (missing.length) {
      checks.push({ level: 'info', text: `Filled in the ${missing.join(' and ')} edge, where your photo ended. Drag the photo if it doesn't look natural.` });
    }
  }
  const order: Record<CheckLevel, number> = { fail: 0, warn: 1, pass: 2, info: 3 };
  return checks.sort((a, b2) => order[a.level] - order[b2.level]);
}
