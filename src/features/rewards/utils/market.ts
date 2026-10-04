import { FPNumber } from '@sora-substrate/sdk';

import type { SnapshotItem } from '@/types/chart';

/**
 * Chart geometry for the rewards price card.
 *
 * Prices here are plain numbers because they only decide where a line is drawn. Amounts the user sees as values
 * still go through `FPNumber` (see `analytics.ts`).
 */

/** One daily close of the price series. */
export interface PricePoint {
  /** Unix time in milliseconds. */
  time: number;
  /** Close price in USD. */
  price: number;
}

/** Space reserved around the plot area, in SVG user units. */
export interface ChartPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** A price point placed on the plot, in SVG user units. */
export interface ChartPoint extends PricePoint {
  x: number;
  y: number;
}

/** A horizontal gridline: the price it stands for and where it is drawn. */
export interface ChartTick {
  value: number;
  y: number;
}

/** Everything the price chart needs to draw itself, in SVG user units. */
export interface ChartGeometry {
  width: number;
  height: number;
  padding: ChartPadding;
  points: ChartPoint[];
  /** SVG path of the price line. */
  line: string;
  /** SVG path of the area under the line, closed at the baseline. */
  area: string;
  /** Horizontal gridlines with their values, bottom to top. */
  ticks: ChartTick[];
  /** Number of decimals the tick labels need to tell neighbouring ticks apart. */
  decimals: number;
  /** The y coordinate of the bottom of the plot, where the area closes. */
  baseline: number;
}

/** Which way a price moved; `flat` also covers moves that round to zero. */
export type ChangeDirection = 'up' | 'down' | 'flat';

/** Turns indexer snapshots (newest first) into close prices ordered by time. Invalid items are dropped. */
export function toPricePoints(items: readonly SnapshotItem[]): PricePoint[] {
  return items
    .map((item) => ({ time: item?.timestamp, price: item?.price?.[1] }))
    .filter(
      (point): point is PricePoint =>
        Number.isFinite(point.time) && Number.isFinite(point.price) && (point.price as number) > 0
    )
    .sort((a, b) => a.time - b.time);
}

const roundTo = (value: number, decimals: number): number => Number(value.toFixed(Math.min(Math.max(decimals, 0), 20)));

/**
 * Picks clean tick values (1, 2, 5 × 10ⁿ steps) that cover `min`…`max`.
 * A flat series gets a small range around its value so the line sits mid-chart.
 */
export function getNiceScale(
  min: number,
  max: number,
  targetTicks = 3
): { min: number; max: number; step: number; decimals: number } {
  let low = min;
  let high = max;

  if (!(high > low)) {
    const spread = Math.abs(low) * 0.05 || 1;
    low -= spread;
    high += spread;
  }

  const rawStep = (high - low) / Math.max(targetTicks - 1, 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = factor * magnitude;
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));

  return {
    min: roundTo(Math.floor(low / step) * step, decimals + 2),
    max: roundTo(Math.ceil(high / step) * step, decimals + 2),
    step,
    decimals,
  };
}

/** Lays the points out in an SVG viewport. At least one point is required; an empty list gives empty paths. */
export function buildChartGeometry(
  points: readonly PricePoint[],
  width: number,
  height: number,
  padding: ChartPadding
): ChartGeometry {
  const innerWidth = Math.max(width - padding.left - padding.right, 1);
  const innerHeight = Math.max(height - padding.top - padding.bottom, 1);
  const baseline = padding.top + innerHeight;

  if (!points.length) {
    return { width, height, padding, points: [], line: '', area: '', ticks: [], decimals: 0, baseline };
  }

  const prices = points.map(({ price }) => price);
  const scale = getNiceScale(Math.min(...prices), Math.max(...prices));
  const start = points[0].time;
  const span = points[points.length - 1].time - start;
  const yOf = (price: number): number =>
    padding.top + (1 - (price - scale.min) / (scale.max - scale.min)) * innerHeight;
  const xOf = (time: number, index: number): number => {
    if (span > 0) return padding.left + ((time - start) / span) * innerWidth;

    return padding.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
  };

  const chartPoints = points.map<ChartPoint>((point, index) => ({
    ...point,
    x: Number(xOf(point.time, index).toFixed(2)),
    y: Number(yOf(point.price).toFixed(2)),
  }));

  const line = chartPoints.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  const last = chartPoints[chartPoints.length - 1];
  const first = chartPoints[0];
  const area = `${line} L${last.x} ${baseline} L${first.x} ${baseline} Z`;

  const ticks: ChartTick[] = [];

  for (let value = scale.min; value <= scale.max + scale.step / 2; value += scale.step) {
    const rounded = roundTo(value, scale.decimals + 2);

    ticks.push({ value: rounded, y: Number(yOf(rounded).toFixed(2)) });
  }

  return { width, height, padding, points: chartPoints, line, area, ticks, decimals: scale.decimals, baseline };
}

/** Finds the point whose x is closest to `x`. Returns -1 for an empty chart. */
export function nearestPointIndex(points: readonly Pick<ChartPoint, 'x'>[], x: number): number {
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  points.forEach((point, index) => {
    const distance = Math.abs(point.x - x);

    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });

  return best;
}

/** Classifies a percentage change. Values that round to zero count as flat. */
export function getChangeDirection(change: Nullable<number>): ChangeDirection {
  if (change === null || change === undefined || !Number.isFinite(change)) return 'flat';
  if (Math.abs(change) < 0.005) return 'flat';

  return change > 0 ? 'up' : 'down';
}

/** Formats a percentage change with an explicit sign and the decimal mark of the app language, e.g. `+2.1%`. */
export function formatSignedPercent(change: Nullable<number>): string {
  if (change === null || change === undefined || !Number.isFinite(change)) return '–';

  const magnitude = Math.abs(change) < 0.005 ? 0 : Math.abs(change);
  const sign = magnitude === 0 ? '' : change > 0 ? '+' : '−';
  const digits = magnitude >= 100 ? 0 : magnitude >= 10 ? 1 : 2;
  const text = String(Number(magnitude.toFixed(digits))).replace('.', FPNumber.DELIMITERS_CONFIG.decimal);

  return `${sign}${text}%`;
}

/**
 * Formats a price with enough digits to tell neighbouring values apart: two decimals from 1 upward, otherwise four
 * significant digits (so 0.003124 is not shown as 0.00). Rounding uses fixed-point math.
 *
 * `minDecimals` widens it for axis labels whose neighbours differ only in a later digit. A currency code made of
 * letters (XOR, CHF) is set apart from the number; a sign such as $ is not.
 */
export function formatPrice(value: FPNumber, symbol = '', minDecimals = 0): string {
  const prefix = /\p{L}$/u.test(symbol) ? `${symbol}\u00a0` : symbol;

  if (!value.isGtZero()) return `${prefix}0`;

  const magnitude = value.toNumber(12);
  const decimals = Math.min(8, Math.max(magnitude >= 1 ? 2 : Math.floor(-Math.log10(magnitude)) + 4, minDecimals));

  return `${prefix}${value.toLocaleString(decimals)}`;
}

/**
 * Returns the app language when `Intl` can format dates in it, so chart dates follow the language the user picked in
 * the app. Otherwise it returns undefined and the browser's own locale is used.
 */
export function resolveDateLocale(language: Nullable<string>): string | undefined {
  const tag = language?.trim();

  if (!tag) return undefined;

  try {
    return Intl.DateTimeFormat.supportedLocalesOf([tag]).length ? tag : undefined;
  } catch {
    return undefined;
  }
}
