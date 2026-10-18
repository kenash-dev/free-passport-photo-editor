import { describe, expect, it } from 'vitest';
import { confidenceToAlpha } from './segment';

describe('confidenceToAlpha', () => {
  it('makes sure background transparent and sure person opaque', () => {
    expect(confidenceToAlpha(0)).toBe(0);
    expect(confidenceToAlpha(0.3)).toBe(0);
    expect(confidenceToAlpha(0.7)).toBe(255);
    expect(confidenceToAlpha(1)).toBe(255);
  });

  it('gives uncertain edges partial opacity', () => {
    expect(confidenceToAlpha(0.5)).toBeGreaterThan(100);
    expect(confidenceToAlpha(0.5)).toBeLessThan(155);
  });
});
