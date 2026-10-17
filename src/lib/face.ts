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
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const result = landmarker.detect(canvas);
  return result.faceLandmarks.map((lm, i) => {
    const p = (idx: number): Point => ({ x: lm[idx].x * bitmap.width, y: lm[idx].y * bitmap.height });
    const shapes: Record<string, number> = {};
    for (const c of result.faceBlendshapes?.[i]?.categories ?? []) shapes[c.categoryName] = c.score;
    // 468/473 are the iris centres; on the image, the subject's right eye is on the left.
    return {
      leftEye: p(468),
      rightEye: p(473),
      chin: p(152),
      forehead: p(10),
      noseTip: p(1),
      cheekLeft: p(234),
      cheekRight: p(454),
      blendshapes: shapes,
    };
  });
}
