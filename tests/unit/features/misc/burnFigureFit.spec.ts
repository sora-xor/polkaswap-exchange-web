import { describe, expect, it } from 'vitest';

import { figureEm } from '@/features/misc/lib/burnFigureFit';
import { TONSWAP_MAX_TS } from '@/features/misc/lib/tonswapBurn';

/** Sora tabular figures, measured in Chromium and WebKit on 25 Nov 2026 (heaviest of weights 500–700). */
const DIGIT = 0.676;
const MARK = 0.273;

describe('figureEm', () => {
  it('adds the measured widths of figures, marks and the approximate sign, with a 3% margin', () => {
    // ≈ + space + 11 figures + 3 marks
    const exact = 0.549 + 0.222 + 11 * DIGIT + 3 * MARK;
    expect(figureEm('≈ 2,061,228.0554')).toBe(Math.ceil(exact * 1.03 * 1000) / 1000);
    expect(figureEm('≈ 2,061,228.0554')).toBeGreaterThan(exact);
  });

  it('gives the same width in every number format the app uses', () => {
    expect(figureEm('2.061.228,0554')).toBe(figureEm('2,061,228.0554'));
    // Narrow no-break spaces (French grouping) are narrower than Latin marks.
    expect(figureEm('2\u202f061\u202f228,0554')).toBeLessThan(figureEm('2,061,228.0554'));
    // Arabic marks are wider than Latin ones; Arabic-Indic digits count as Sora figures.
    expect(figureEm('٢٬٠٦١٬٢٢٨٫٠٥٥٤')).toBeGreaterThan(figureEm('2,061,228.0554'));
  });

  it('counts a grouped amount narrower than an ungrouped one of the same length, as Sora draws it', () => {
    // 0.62em a character was the first guess; real figures are 0.676em, so a run of digits is wider than that.
    expect(figureEm('1234567890')).toBeGreaterThan(10 * 0.62);
    expect(figureEm('1,234,567')).toBeLessThan(9 * DIGIT);
  });

  it('never underestimates the widest TS figures the page can show, and adds at most the 3% margin', () => {
    expect(TONSWAP_MAX_TS).toBe('48217317.5');
    // Just under the campaign maximum, with every decimal non-zero (the formatter trims trailing zeros).
    const cases = [
      { where: 'review dialog, 6 decimals', text: '48,217,317.499999', em: 14 * DIGIT + 3 * MARK },
      { where: 'card, 4 decimals', text: '≈ 48,217,317.4999', em: 0.549 + 0.222 + 12 * DIGIT + 3 * MARK },
      { where: 'banner, 4 decimals', text: '+48,217,317.4999', em: 13 * DIGIT + 3 * MARK },
    ];
    for (const { where, text, em } of cases) {
      expect(figureEm(text), where).toBeGreaterThanOrEqual(em * 1.03);
      expect(figureEm(text), where).toBeLessThanOrEqual(em * 1.03 + 0.001);
    }
  });

  it('treats unknown characters as wider than a figure and never returns less than 1', () => {
    expect(figureEm('W')).toBe(1);
    expect(figureEm('WWWW')).toBeGreaterThan(4 * DIGIT * 1.03);
    expect(figureEm('')).toBe(1);
    expect(figureEm('0')).toBe(1);
    expect(figureEm('—')).toBe(1);
  });
});
