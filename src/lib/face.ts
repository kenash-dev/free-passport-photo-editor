import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface Point {
  x: number;
  y: number;
}

export interface FaceInfo {
  /** Pixel coordinates in the full-resolution photo. */
  leftEye: Point;
  rightEye: Point;
  chin: Point;
  forehead: Point;
  noseTip: Point;
  cheekLeft: Point;
  cheekRight: Point;
  /** Top of the head (hair included) found in the photo, or null if it couldn't be found. */
  crown: Point | null;
  /** True when the hair reaches the top edge of the photo, so the head is cut off. */
  crownCut: boolean;
  blendshapes: Record<string, number>;
}

const BASE = import.meta.env.BASE_URL;
const ANALYSIS_LONG_EDGE = 1280;

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

async function create(delegate: 'GPU' | 'CPU'): Promise<FaceLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(`${BASE}mediapipe`);
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: `${BASE}models/face_landmarker.task`, delegate },
    runningMode: 'IMAGE',
    numFaces: 2,
    outputFaceBlendshapes: true,
  });
}

/** Loads the model once, from this site's own files. GPU first, CPU if WebGL isn't usable. */
export function getLandmarker(): Promise<FaceLandmarker> {
  landmarkerPromise ??= create('GPU').catch(() => create('CPU'));
  landmarkerPromise.catch(() => {
    landmarkerPromise = null;
  });
  return landmarkerPromise;
}

/** Finds faces on a downscaled copy and returns landmarks in full-resolution pixels. */
export async function detectFaces(bitmap: ImageBitmap): Promise<FaceInfo[]> {
  const landmarker = await getLandmarker();
  const scale = Math.min(1, ANALYSIS_LONG_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const result = landmarker.detect(canvas);
  return result.faceLandmarks.map((lm, i) => {
    const p = (idx: number): Point => ({ x: lm[idx].x * bitmap.width, y: lm[idx].y * bitmap.height });
    const shapes: Record<string, number> = {};
    for (const c of result.faceBlendshapes?.[i]?.categories ?? []) shapes[c.categoryName] = c.score;
    const a = (idx: number): Point => ({ x: lm[idx].x * canvas.width, y: lm[idx].y * canvas.height });
    const top = findCrown(pixels, a(468), a(473), a(10), a(152), a(234), a(454));
    // 468/473 are the iris centres; on the image, the subject's right eye is on the left.
    return {
      leftEye: p(468),
      rightEye: p(473),
      chin: p(152),
      forehead: p(10),
      noseTip: p(1),
      cheekLeft: p(234),
      cheekRight: p(454),
      crown: top.crown && { x: top.crown.x / scale, y: top.crown.y / scale },
      crownCut: top.cut,
      blendshapes: shapes,
    };
  });
}

/**
 * Walks up from the forehead until the pixels match the background beside the head
 * at the same height. Works for plain backgrounds; returns null when it can't decide.
 */
function findCrown(img: ImageData, eyeA: Point, eyeB: Point, forehead: Point, chin: Point, cheekA: Point, cheekB: Point): { crown: Point | null; cut: boolean } {
  const { width, height, data } = img;
  const axis = Math.atan2(eyeB.y - eyeA.y, eyeB.x - eyeA.x) + (eyeB.x < eyeA.x ? Math.PI : 0);
  const along = { x: Math.cos(axis), y: Math.sin(axis) };
  const up = { x: Math.sin(axis), y: -Math.cos(axis) };
  const eyeMid = { x: (eyeA.x + eyeB.x) / 2, y: (eyeA.y + eyeB.y) / 2 };
  const eyeToChin = (chin.x - eyeMid.x) * -up.x + (chin.y - eyeMid.y) * -up.y;
  const faceW = Math.hypot(cheekB.x - cheekA.x, cheekB.y - cheekA.y);
  if (eyeToChin <= 0 || faceW <= 0) return { crown: null, cut: false };

  const px = (x: number, y: number): [number, number, number] | null => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= width || yi >= height) return null;
    const i = (yi * width + xi) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const dist = (c1: number[], c2: number[]) => Math.hypot(c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]);
  const at = (base: Point, t: number, side: number) => ({
    x: base.x + up.x * t + along.x * side,
    y: base.y + up.y * t + along.y * side,
  });

  const columns = [-0.15, 0, 0.15].map((f) => f * faceW);
  const bgOffset = 1.1 * faceW;
  const maxT = eyeToChin * 2;
  let run = 0;
  let firstMatch = 0;
  for (let t = 0; t < maxT; t += 1) {
    const centre = at(forehead, t, 0);
    if (!px(centre.x, centre.y)) {
      // Reached the photo edge while still on the head.
      return run > 0 ? { crown: at(forehead, firstMatch, 0), cut: false } : { crown: null, cut: true };
    }
    const refs = [px(at(forehead, t, -bgOffset).x, at(forehead, t, -bgOffset).y), px(at(forehead, t, bgOffset).x, at(forehead, t, bgOffset).y)].filter(
      (c): c is [number, number, number] => !!c,
    );
    if (refs.length === 0) return { crown: null, cut: false };
    const matches = columns.filter((side) => {
      const p = at(forehead, t, side);
      const c = px(p.x, p.y);
      return c && refs.some((r) => dist(c, r) < 28);
    }).length;
    if (matches >= 2) {
      if (run === 0) firstMatch = t;
      if (++run >= 4) {
        const crown = at(forehead, firstMatch, 0);
        const eyeToCrown = (crown.x - eyeMid.x) * up.x + (crown.y - eyeMid.y) * up.y;
        // Reject results far from normal head proportions (busy backgrounds, white hair on white).
        const ratio = eyeToCrown / eyeToChin;
        return ratio > 0.75 && ratio < 1.5 ? { crown, cut: false } : { crown: null, cut: false };
      }
    } else {
      run = 0;
    }
  }
  return { crown: null, cut: false };
}
