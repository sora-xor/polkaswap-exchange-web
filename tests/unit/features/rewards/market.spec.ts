import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it } from 'vitest';

import {
  buildChartGeometry,
  formatPrice,
  formatSignedPercent,
  getChangeDirection,
  getNiceScale,
  nearestPointIndex,
  resolveDateLocale,
  toPricePoints,
} from '@/features/rewards/utils/market';

const padding = { top: 10, right: 10, bottom: 20, left: 30 };
const DAY = 24 * 60 * 60 * 1000;

describe('toPricePoints', () => {
  it('orders newest-first snapshots by time and keeps the close price', () => {
    const points = toPricePoints([
      { timestamp: 3 * DAY, price: [1, 3, 1, 3], volume: 1 },
      { timestamp: 1 * DAY, price: [1, 1.5, 1, 2], volume: 1 },
      { timestamp: 2 * DAY, price: [1, 2, 1, 2], volume: 1 },
    ]);

    expect(points).toEqual([
      { time: 1 * DAY, price: 1.5 },
      { time: 2 * DAY, price: 2 },
      { time: 3 * DAY, price: 3 },
    ]);
  });

  it('drops snapshots without a usable time or positive price', () => {
    const points = toPricePoints([
      { timestamp: Number.NaN, price: [1, 1, 1, 1], volume: 0 },
      { timestamp: DAY, price: [1, 0, 1, 1], volume: 0 },
      { timestamp: 2 * DAY, price: [1, Number.POSITIVE_INFINITY, 1, 1], volume: 0 },
      { timestamp: 3 * DAY, price: [1, 4, 1, 4], volume: 0 },
      undefined as never,
    ]);

    expect(points).toEqual([{ time: 3 * DAY, price: 4 }]);
  });
});

describe('getNiceScale', () => {
  it('rounds the range outward to clean steps', () => {
    expect(getNiceScale(0.00312, 0.00488)).toMatchObject({ min: 0.003, max: 0.005, step: 0.001, decimals: 3 });
    expect(getNiceScale(120, 940)).toMatchObject({ min: 0, max: 1000, step: 500, decimals: 0 });
  });

  it('opens up a flat series so the line sits in the middle', () => {
    const scale = getNiceScale(2, 2);

    expect(scale.min).toBeLessThan(2);
    expect(scale.max).toBeGreaterThan(2);
  });
});

describe('buildChartGeometry', () => {
  it('maps time to x and price to y inside the padded plot', () => {
    const geometry = buildChartGeometry(
      [
        { time: 0, price: 1 },
        { time: DAY, price: 2 },
        { time: 2 * DAY, price: 3 },
      ],
      130,
      110,
      padding
    );

    // 130px wide minus 30px left and 10px right padding leaves a 90px plot.
    expect(geometry.points.map(({ x }) => x)).toEqual([30, 75, 120]);
    expect(geometry.points[0].y).toBeGreaterThan(geometry.points[2].y);
    expect(geometry.points[0].y).toBeLessThanOrEqual(geometry.baseline);
    expect(geometry.line.startsWith('M30 ')).toBe(true);
    expect(geometry.area.endsWith('Z')).toBe(true);
    expect(geometry.area).toContain(`L120 ${geometry.baseline}`);
    expect(geometry.ticks.length).toBeGreaterThanOrEqual(2);
    expect(geometry.ticks[0].y).toBeGreaterThan(geometry.ticks[geometry.ticks.length - 1].y);
  });

  it('centres a single point and never divides by zero', () => {
    const geometry = buildChartGeometry([{ time: DAY, price: 5 }], 130, 110, padding);

    expect(geometry.points).toHaveLength(1);
    expect(Number.isFinite(geometry.points[0].x)).toBe(true);
    expect(Number.isFinite(geometry.points[0].y)).toBe(true);
  });

  it('spreads points evenly when they share a timestamp', () => {
    const geometry = buildChartGeometry(
      [
        { time: DAY, price: 1 },
        { time: DAY, price: 2 },
      ],
      130,
      110,
      padding
    );

    expect(geometry.points.map(({ x }) => x)).toEqual([30, 120]);
  });

  it('returns empty paths without points', () => {
    expect(buildChartGeometry([], 130, 110, padding)).toMatchObject({ points: [], line: '', area: '', ticks: [] });
  });
});

describe('nearestPointIndex', () => {
  it('finds the closest x and handles empty input', () => {
    const points = [{ x: 10 }, { x: 50 }, { x: 90 }];

    expect(nearestPointIndex(points, 12)).toBe(0);
    expect(nearestPointIndex(points, 71)).toBe(2);
    expect(nearestPointIndex(points, 1000)).toBe(2);
    expect(nearestPointIndex([], 5)).toBe(-1);
  });
});

describe('price change formatting', () => {
  it('classifies direction and treats tiny moves as flat', () => {
    expect(getChangeDirection(2.5)).toBe('up');
    expect(getChangeDirection(-0.4)).toBe('down');
    expect(getChangeDirection(0.001)).toBe('flat');
    expect(getChangeDirection(null)).toBe('flat');
    expect(getChangeDirection(Number.NaN)).toBe('flat');
  });

  it('formats signed percentages with a readable number of digits', () => {
    expect(formatSignedPercent(2.1)).toBe('+2.1%');
    expect(formatSignedPercent(-0.456)).toBe('−0.46%');
    expect(formatSignedPercent(12.34)).toBe('+12.3%');
    expect(formatSignedPercent(250.4)).toBe('+250%');
    expect(formatSignedPercent(0.001)).toBe('0%');
    expect(formatSignedPercent(null)).toBe('–');
  });

  it('uses the decimal mark of the app language', () => {
    const original = FPNumber.DELIMITERS_CONFIG.decimal;

    FPNumber.DELIMITERS_CONFIG.decimal = ',';

    try {
      expect(formatSignedPercent(2.1)).toBe('+2,1%');
      expect(formatSignedPercent(-0.456)).toBe('−0,46%');
      expect(formatSignedPercent(250.4)).toBe('+250%');
    } finally {
      FPNumber.DELIMITERS_CONFIG.decimal = original;
    }
  });
});

describe('formatPrice', () => {
  it('shows two decimals from 1 upward', () => {
    expect(formatPrice(new FPNumber('1234.5678'), '$')).toBe('$1,234.56');
    expect(formatPrice(new FPNumber(1), '$')).toBe('$1');
  });

  it('keeps four significant digits for small prices', () => {
    expect(formatPrice(new FPNumber('0.3124567'), '$')).toBe('$0.3124');
    expect(formatPrice(new FPNumber('0.01973456'), '$')).toBe('$0.01973');
    expect(formatPrice(new FPNumber('0.003124789'), '$')).toBe('$0.003124');
  });

  it('never prints more than eight decimals and handles zero', () => {
    expect(formatPrice(new FPNumber('0.00000001234567'))).toBe('0.00000001');
    expect(formatPrice(new FPNumber(0), '$')).toBe('$0');
  });

  it('sets a currency code made of letters apart from the number, but not a sign', () => {
    expect(formatPrice(new FPNumber('0.0123'), 'XOR')).toBe('XOR\u00a00.0123');
    expect(formatPrice(new FPNumber(0), 'CHF')).toBe('CHF\u00a00');
    expect(formatPrice(new FPNumber('2.5'), '€')).toBe('€2.5');
  });

  it('widens the decimals when neighbouring axis labels would collapse', () => {
    expect(formatPrice(new FPNumber('1.001'), '$')).toBe('$1');
    expect(formatPrice(new FPNumber('1.001'), '$', 3)).toBe('$1.001');
    expect(formatPrice(new FPNumber('0.5'), '$', 3)).toBe('$0.5');
  });
});

describe('resolveDateLocale', () => {
  it('keeps app languages that Intl can format', () => {
    expect(resolveDateLocale('en')).toBe('en');
    expect(resolveDateLocale('zh-CN')).toBe('zh-CN');
  });

  it('falls back to the browser locale for empty or unsupported languages', () => {
    expect(resolveDateLocale('')).toBeUndefined();
    expect(resolveDateLocale(undefined)).toBeUndefined();
    expect(resolveDateLocale('not a locale!')).toBeUndefined();
  });
});
