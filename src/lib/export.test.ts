import { describe, expect, it } from 'vitest';
import { PAPERS, sheetLayout } from './export';

const paper = (id: string) => PAPERS.find((p) => p.id === id)!;

describe('sheetLayout', () => {
  it('fits six 2 × 2 in photos on 4 × 6 in paper, edge to edge', () => {
    expect(sheetLayout({ widthMm: 50.8, heightMm: 50.8 }, paper('4x6'))).toMatchObject({ count: 6, gap: 0 });
  });

  it('fits eight 35 × 45 mm photos on 4 × 6 in paper', () => {
    expect(sheetLayout({ widthMm: 35, heightMm: 45 }, paper('4x6')).count).toBe(8);
  });

  it('keeps a gap between photos when that fits as many', () => {
    expect(sheetLayout({ widthMm: 35, heightMm: 45 }, paper('4x6'))).toMatchObject({ count: 8, gap: 2 });
  });

  it('goes edge to edge when that fits more copies', () => {
    expect(sheetLayout({ widthMm: 35, heightMm: 45 }, paper('a4'))).toMatchObject({ count: 36, gap: 0 });
  });

  it('turns the paper when landscape fits more', () => {
    const layout = sheetLayout({ widthMm: 70, heightMm: 50 }, paper('4x6'));
    expect(layout.count).toBe(4);
    expect(layout.pw).toBeGreaterThan(layout.ph);
  });
});
