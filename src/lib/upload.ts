// Upload limits. A 12 MP phone JPEG is usually 2–5 MB, a 48–50 MP phone photo or a
// 24–33 MP camera JPEG 8–15 MB, so 20 MB covers normal camera output with headroom.
export const MAX_FILE_MB = 20;
export const MAX_MEGAPIXELS = 100;
export const MIN_SHORT_SIDE_PX = 600;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface LoadedPhoto {
  file: File;
  bitmap: ImageBitmap;
  url: string;
  warnings: string[];
}

export class UploadError extends Error {}

/** Validates one file and decodes it with EXIF orientation applied. The file stays in memory. */
export async function loadPhoto(files: FileList | File[] | null | undefined): Promise<LoadedPhoto> {
  const list = files ? Array.from(files) : [];
  if (list.length === 0) throw new UploadError('No file selected.');
  if (list.length > 1) throw new UploadError('Please upload one photo at a time.');

  const file = list[0];
  const isHeic = /\.(heic|heif)$/i.test(file.name) || /heic|heif/i.test(file.type);
  if (isHeic) {
    throw new UploadError('HEIC photos can’t be read by most browsers. Export it as JPEG (on iPhone: Settings › Camera › Formats › Most Compatible) and try again.');
  }
  if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
    throw new UploadError('Please upload a JPEG, PNG or WebP photo.');
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    throw new UploadError(`This photo is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_FILE_MB} MB.`);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new UploadError('This file couldn’t be opened as an image.');
  }

  if ((bitmap.width * bitmap.height) / 1e6 > MAX_MEGAPIXELS) {
    bitmap.close();
    throw new UploadError(`This photo is larger than ${MAX_MEGAPIXELS} megapixels. Please use a smaller copy.`);
  }

  const warnings: string[] = [];
  if (Math.min(bitmap.width, bitmap.height) < MIN_SHORT_SIDE_PX) {
    warnings.push(`Low resolution (${bitmap.width} × ${bitmap.height} px). The result may look soft.`);
  }

  return { file, bitmap, url: URL.createObjectURL(file), warnings };
}
