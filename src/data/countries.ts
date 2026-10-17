import data from './countries.json';

export type Range = [number | null, number | null];

export interface CountrySpec {
  id: string;
  name: string;
  document: 'passport' | 'oci' | string;
  photo: { widthMm: number; heightMm: number; widthMmMax: number | null; heightMmMax: number | null } | null;
  head: { chinToCrownMm: Range | null; faceHeightRatio: Range | null };
  eyeLine: { fromBottomMm: Range | null };
  background: { allowed: string[]; color: string };
  maxAgeMonths: number | null;
  digital: {
    aspect: string;
    widthPx: number | null;
    heightPx: number | null;
    minPx: Range | null;
    maxPx: Range | null;
    fileKB: Range | null;
    formats: string[] | null;
  } | null;
  rules: {
    glasses: string | null;
    glassesException: string | null;
    smile: string | null;
    headCovering: string | null;
    other: string[];
  };
  appDefaults: {
    dpi?: number;
    eyeLineFromBottomMm?: Range;
    digitalExportPx?: Range;
    printedMm?: Range;
    maxExportKB?: number;
  };
  sources: string[];
}

export const COUNTRIES = data.countries as CountrySpec[];
export const DATA_VERIFIED = data.verified;

export function getCountry(id: string): CountrySpec | undefined {
  return COUNTRIES.find((c) => c.id === id);
}

/** The printed size the app will produce, and whether it is an official value or an app default. */
export function printSize(c: CountrySpec): { widthMm: number; heightMm: number; official: boolean } | null {
  if (c.photo) return { widthMm: c.photo.widthMm, heightMm: c.photo.heightMm, official: true };
  const d = c.appDefaults.printedMm;
  if (d && d[0] != null && d[1] != null) return { widthMm: d[0], heightMm: d[1], official: false };
  return null;
}

/** The digital export size in pixels, and whether it is an official value or an app default. */
export function digitalSize(c: CountrySpec): { widthPx: number; heightPx: number; official: boolean } | null {
  if (c.digital?.widthPx && c.digital.heightPx) {
    return { widthPx: c.digital.widthPx, heightPx: c.digital.heightPx, official: true };
  }
  const d = c.appDefaults.digitalExportPx;
  if (d && d[0] != null && d[1] != null) return { widthPx: d[0], heightPx: d[1], official: false };
  return null;
}
