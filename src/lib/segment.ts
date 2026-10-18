import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

const BASE = import.meta.env.BASE_URL;
const ANALYSIS_LONG_EDGE = 1280;

let segmenterPromise: Promise<ImageSegmenter> | null = null;

async function create(delegate: 'GPU' | 'CPU'): Promise<ImageSegmenter> {
  const fileset = await FilesetResolver.forVisionTasks(`${BASE}mediapipe`);
  return ImageSegmenter.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: `${BASE}models/selfie_segmenter.tflite`, delegate },
    runningMode: 'IMAGE',
    outputConfidenceMasks: true,
    outputCategoryMask: false,
  });
}

/** Loads the person segmentation model once, from this site's own files. */
function getSegmenter(): Promise<ImageSegmenter> {
  segmenterPromise ??= create('GPU').catch(() => create('CPU'));
  segmenterPromise.catch(() => {
    segmenterPromise = null;
  });
  return segmenterPromise;
}

/** Turns model confidence into opacity: sure background is 0, sure person is 1, with a short soft edge. */
export function confidenceToAlpha(c: number): number {
  return Math.round(255 * Math.min(1, Math.max(0, (c - 0.3) / 0.4)));
}

/**
 * Returns a mask canvas (person opaque, background transparent) for the photo, at a reduced size.
 * Draw it scaled up to the photo's size to cut the person out.
 */
export async function segmentPerson(bitmap: ImageBitmap): Promise<HTMLCanvasElement> {
  const segmenter = await getSegmenter();
  const scale = Math.min(1, ANALYSIS_LONG_EDGE / Math.max(bitmap.width, bitmap.height));
  const input = document.createElement('canvas');
  input.width = Math.round(bitmap.width * scale);
  input.height = Math.round(bitmap.height * scale);
  input.getContext('2d')!.drawImage(bitmap, 0, 0, input.width, input.height);

  const result = segmenter.segment(input);
  try {
    const mask = result.confidenceMasks?.[0];
    if (!mask) throw new Error('No segmentation mask');
    const conf = mask.getAsFloat32Array();
    const out = document.createElement('canvas');
    out.width = mask.width;
    out.height = mask.height;
    const ctx = out.getContext('2d')!;
    const img = ctx.createImageData(mask.width, mask.height);
    for (let i = 0; i < conf.length; i++) img.data[i * 4 + 3] = confidenceToAlpha(conf[i]);
    ctx.putImageData(img, 0, 0);
    return out;
  } finally {
    result.close();
  }
}
