import { describe, expect, it } from 'vitest';
import { getCountry } from '../data/countries';
import { NO_ADJUST, checkResult, computeLayout, digitalFrame, headRangeMm, printFrame } from './compose';
import type { FaceInfo } from './face';

const PHOTO = { width: 3000, height: 4000 };

/** A face centred at (cx, eyeY), tilted by `deg`, with an eye-to-chin distance of `size` px. */
function makeFace({ cx = 1500, eyeY = 1600, size = 600, deg = 0, crown = true } = {}): FaceInfo {
  const a = (deg * Math.PI) / 180;
  const at = (u: number, v: number) => ({ x: cx + u * Math.cos(a) - v * Math.sin(a), y: eyeY + u * Math.sin(a) + v * Math.cos(a) });
  return {
    leftEye: at(-size / 3, 0),
    rightEye: at(size / 3, 0),
    chin: at(0, size),
    forehead: at(0, -size * 0.6),
    noseTip: at(0, size * 0.4),
    cheekLeft: at(-size * 0.6, size * 0.3),
    cheekRight: at(size * 0.6, size * 0.3),
    crown: crown ? at(0, -size) : null,
    crownCut: false,
    blendshapes: {},
  };
}

const country = (id: string) => {
  const c = getCountry(id);
  if (!c) throw new Error(`missing ${id}`);
  return c;
};

describe('frames', () => {
  it('sizes the print photo from millimetres and DPI', () => {
    expect(printFrame(country('us'))).toMatchObject({ widthPx: 1200, heightPx: 1200, dpi: 600 });
    expect(printFrame(country('gb'))).toMatchObject({ widthPx: 827, heightPx: 1063 });
  });

  it('uses the official digital size where there is one', () => {
    expect(digitalFrame(country('in'))).toMatchObject({ widthPx: 630, heightPx: 810 });
    expect(digitalFrame(country('us'))).toBeNull();
  });
});

describe('headRangeMm', () => {
  it('uses chin-to-crown millimetres when given', () => {
    expect(headRangeMm(country('gb'), 45)).toEqual([29, 34]);
  });

  it('converts a face-height ratio to millimetres', () => {
    const [lo, hi] = headRangeMm(country('in'), 45);
    expect(lo).toBeCloseTo(36);
    expect(hi).toBeCloseTo(38.25);
  });

  it('falls back to 70–80% of the photo height', () => {
    const [lo, hi] = headRangeMm(country('nz'), 45);
    expect(lo).toBeCloseTo(31.5);
    expect(hi).toBeCloseTo(36);
  });
});

describe('computeLayout', () => {
  it('puts the head in the middle of the allowed range', () => {
    const c = country('gb');
    const layout = computeLayout(c, makeFace(), printFrame(c)!, NO_ADJUST, PHOTO);
    expect(layout.headMm).toBeCloseTo(31.5, 1);
    expect(layout.missingEdges).toEqual([]);
  });

  it('places the eyes on the required eye line', () => {
    const c = country('us');
    const frame = printFrame(c)!;
    const layout = computeLayout(c, makeFace(), frame, NO_ADJUST, PHOTO);
    expect(layout.eyeFromBottomMm).toBeCloseTo(31.5);
    expect(frame.heightPx - layout.eyeOut.y).toBeCloseTo(31.5 * frame.pxPerMm);
  });

  it('levels a tilted face', () => {
    const c = country('gb');
    const layout = computeLayout(c, makeFace({ deg: 6 }), printFrame(c)!, NO_ADJUST, PHOTO);
    expect((layout.angle * 180) / Math.PI).toBeCloseTo(6);
    expect(layout.headMm).toBeCloseTo(31.5, 1);
  });

  it('applies head size and position adjustments', () => {
    const c = country('gb');
    const frame = printFrame(c)!;
    const base = computeLayout(c, makeFace(), frame, NO_ADJUST, PHOTO);
    const moved = computeLayout(c, makeFace(), frame, { size: 1.05, dxMm: 2, dyMm: -1 }, PHOTO);
    expect(moved.headMm).toBeCloseTo(31.5 * 1.05, 1);
    expect(moved.eyeOut.x - base.eyeOut.x).toBeCloseTo(2 * frame.pxPerMm);
    expect(moved.eyeFromBottomMm).toBeGreaterThan(base.eyeFromBottomMm);
  });

  it('uses the measured top of head instead of the estimate', () => {
    const c = country('gb');
    const frame = printFrame(c)!;
    const face = makeFace();
    face.crown = { x: face.crown!.x, y: face.crown!.y - 120 };
    const layout = computeLayout(c, face, frame, NO_ADJUST, PHOTO);
    expect(layout.crownEstimated).toBe(false);
    expect(layout.headMm).toBeCloseTo(31.5, 1);
    expect(computeLayout(c, makeFace({ crown: false }), frame, NO_ADJUST, PHOTO).crownEstimated).toBe(true);
  });

  it('reports edges that fall outside the photo', () => {
    const c = country('gb');
    const layout = computeLayout(c, makeFace({ eyeY: 650 }), printFrame(c)!, NO_ADJUST, PHOTO);
    expect(layout.missingEdges).toContain('top');
  });
});

describe('checkResult', () => {
  it('fails when there is no face or more than one', () => {
    expect(checkResult([], null)[0].level).toBe('fail');
    expect(checkResult([makeFace(), makeFace()], null)[0].level).toBe('fail');
  });

  it('passes a centred, level face at the right size', () => {
    const c = country('gb');
    const face = makeFace();
    const checks = checkResult([face], computeLayout(c, face, printFrame(c)!, NO_ADJUST, PHOTO));
    expect(checks.every((ch) => ch.level === 'pass')).toBe(true);
  });

  it('reports adjustments as information, not warnings', () => {
    const c = country('gb');
    const face = makeFace({ deg: 4, eyeY: 650 });
    const checks = checkResult([face], computeLayout(c, face, printFrame(c)!, NO_ADJUST, PHOTO), true);
    expect(checks.some((ch) => ch.level === 'warn' || ch.level === 'fail')).toBe(false);
    expect(checks.filter((ch) => ch.level === 'info').map((ch) => ch.text).join(' ')).toMatch(/Straightened.*Background replaced/);
  });

  it('warns about closed eyes and lists warnings first', () => {
    const c = country('gb');
    const face = { ...makeFace(), blendshapes: { eyeBlinkLeft: 0.9, eyeBlinkRight: 0.9 } };
    const checks = checkResult([face], computeLayout(c, face, printFrame(c)!, NO_ADJUST, PHOTO));
    expect(checks[0].level).toBe('warn');
    expect(checks[0].text).toMatch(/eyes/i);
  });
});
