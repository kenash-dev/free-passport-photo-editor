import { describe, expect, it } from 'vitest';
import { digitalFrame, headRangeMm, printFrame } from '../lib/compose';
import { COUNTRIES } from './countries';
import faq from './faq.json';

describe('countries.json', () => {
  it('has unique ids', () => {
    const ids = COUNTRIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(COUNTRIES.map((c) => [c.id, c] as const))('%s has official sources and a usable output size', (_id, c) => {
    expect(c.sources.length).toBeGreaterThan(0);
    for (const s of c.sources) expect(s).toMatch(/^https:\/\//);
    const frame = printFrame(c) ?? digitalFrame(c);
    expect(frame).not.toBeNull();
    const [lo, hi] = headRangeMm(c, frame!.heightMm);
    expect(lo).toBeGreaterThan(0);
    expect(hi).toBeGreaterThanOrEqual(lo);
    expect(hi).toBeLessThan(frame!.heightMm);
    expect(c.background.color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('faq.json', () => {
  it('has a question and an answer for every entry', () => {
    expect(faq.length).toBeGreaterThan(0);
    for (const f of faq) {
      expect(f.q.trim()).not.toBe('');
      expect(f.a.trim()).not.toBe('');
    }
  });
});
