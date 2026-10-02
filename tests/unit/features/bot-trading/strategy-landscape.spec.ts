import { describe, expect, it } from 'vitest';
import { strategyContours } from '@/features/bot-trading/strategy-landscape';

describe('strategyContours', () => {
  it.each(['dca', 'threshold', 'sma'] as const)(
    'keeps %s contours deterministic and inside the illustration',
    (preset) => {
      const contours = strategyContours(preset);
      expect(contours).toHaveLength(12);
      expect(contours).toEqual(strategyContours(preset));
      for (const contour of contours) {
        expect(contour.area.endsWith(' Z')).toBe(true);
        const points = [...contour.line.matchAll(/([\d.]+),([\d.]+)/g)];
        expect(points).toHaveLength(97);
        for (const [, x, y] of points) {
          expect(Number(x)).toBeGreaterThanOrEqual(0);
          expect(Number(x)).toBeLessThanOrEqual(780);
          expect(Number(y)).toBeGreaterThanOrEqual(0);
          expect(Number(y)).toBeLessThanOrEqual(224);
        }
      }
    }
  );

  it('gives the three rule previews different silhouettes', () => {
    expect(new Set(['dca', 'threshold', 'sma'].map((preset) => strategyContours(preset as 'dca')[11].line)).size).toBe(
      3
    );
  });
});
