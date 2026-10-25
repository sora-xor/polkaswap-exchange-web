import { FPNumber } from '@/lib/substrate/math';
import type { StrategyFlowSettings } from './strategy-explanation';

export interface LessonPoint {
  x: number;
  y: number;
}
export type LessonEventKind = 'cadence' | 'threshold' | 'cross-up' | 'cross-down';
export interface LessonEvent extends LessonPoint {
  fraction: number;
  action: 'buy' | 'sell';
  kind: LessonEventKind;
}
export interface StrategyLesson {
  preset: StrategyFlowSettings['preset'];
  price: LessonPoint[];
  fast: LessonPoint[];
  slow: LessonPoint[];
  thresholdY: number | null;
  events: LessonEvent[];
  durationMs: number;
}
export interface LessonFrame extends LessonPoint {
  progress: number;
  phase: 'observe' | 'rule' | 'checks' | 'trade' | 'complete';
  event: LessonEvent | null;
  completedEvents: number;
}

const TRAVEL_MS = 6000;
const EVENT_MS = 2400;
const LEFT = 30;
const RIGHT = 750;
const TOP = 18;
const BOTTOM = 142;
const fp = (value: string | number) => new FPNumber(String(value), 36);

/** Interpolate an authored example in exact decimals; these are lesson values, never market observations. */
function exampleValues(count: number, anchors: readonly [number, FPNumber][]): FPNumber[] {
  return Array.from({ length: count }, (_, index) => {
    const position = index / (count - 1);
    const right = anchors.findIndex(([fraction]) => fraction >= position);
    if (right <= 0) return anchors[0][1];
    const [start, low] = anchors[right - 1];
    const [end, high] = anchors[right];
    const portion = fp(String(position - start)).div(fp(String(end - start)));
    const eased = portion.mul(portion).mul(fp(3).sub(portion.mul(fp(2))));
    return low.add(high.sub(low).mul(eased)).dp(4, 4);
  });
}

/** Rolling means use the actual configured windows; only the final screen coordinates become JS numbers. */
function means(values: readonly FPNumber[], window: number): (FPNumber | null)[] {
  let total = fp(0);
  return values.map((value, index) => {
    total = total.add(value);
    if (index >= window) total = total.sub(values[index - window]);
    return index + 1 >= window ? total.div(fp(window)) : null;
  });
}

/**
 * Create a clearly illustrative rule lesson. DCA marks regular times, threshold
 * events follow the example's first closes below its fixed trigger, and SMA
 * events are derived from crossings of the configured moving-average windows.
 * This helper never computes performance, confidence or a tradable quote.
 */
export function buildStrategyLesson(settings: StrategyFlowSettings): StrategyLesson {
  const slowWindow = Number.isInteger(settings.slowWindow) ? Math.max(3, Math.min(200, settings.slowWindow)) : 20;
  const fastWindow = Number.isInteger(settings.fastWindow)
    ? Math.max(2, Math.min(slowWindow - 1, settings.fastWindow))
    : Math.min(slowWindow - 1, 5);
  const count = settings.preset === 'sma' ? Math.max(64, slowWindow * 4) : 41;
  const dip = Number.isFinite(settings.thresholdPercent) ? Math.max(0, Math.min(50, settings.thresholdPercent)) : 8;
  const threshold = fp(100).mul(fp(1).sub(fp(dip).mul(fp('0.01'))));
  const prices =
    settings.preset === 'threshold'
      ? exampleValues(count, [
          [0, fp(100)],
          [0.3, threshold.add(fp(5))],
          [0.42, threshold.sub(fp(7))],
          [0.62, threshold.add(fp(10))],
          [0.78, threshold.sub(fp(5))],
          [1, threshold.add(fp(8))],
        ])
      : exampleValues(count, [
          [0, fp(128)],
          [0.17, fp(90)],
          [0.42, fp(144)],
          [0.71, fp(84)],
          [1, fp(130)],
        ]);
  const fast = settings.preset === 'sma' ? means(prices, fastWindow) : [];
  const slow = settings.preset === 'sma' ? means(prices, slowWindow) : [];
  const start = settings.preset === 'sma' ? slowWindow - 1 : 0;
  const visiblePrices = prices.slice(start);
  const bound = settings.preset === 'threshold' ? threshold : visiblePrices[0];
  const low = visiblePrices.reduce((value, current) => value.min(current), bound);
  const high = visiblePrices.reduce((value, current) => value.max(current), bound);
  const range = high.sub(low).max(fp(1));
  const point = (value: FPNumber, index: number): LessonPoint => ({
    x: LEFT + ((index - start) / (count - start - 1)) * (RIGHT - LEFT),
    y: BOTTOM - value.sub(low).div(range).toNumber(10) * (BOTTOM - TOP),
  });
  const lesson: StrategyLesson = {
    preset: settings.preset,
    price: visiblePrices.map((value, index) => point(value, index + start)),
    fast: fast.slice(start).map((value, index) => point(value!, index + start)),
    slow: slow.slice(start).map((value, index) => point(value!, index + start)),
    thresholdY: settings.preset === 'threshold' ? point(threshold, 0).y : null,
    events: [],
    durationMs: TRAVEL_MS,
  };
  let previousSide = 0;
  for (let index = start; index < count; index++) {
    let kind: LessonEventKind | null = null;
    let action: 'buy' | 'sell' = 'buy';
    if (settings.preset === 'dca' && index > 0 && index % 8 === 0 && index < count - 1) kind = 'cadence';
    if (settings.preset === 'threshold' && index > 0 && prices[index].lte(threshold) && prices[index - 1].gt(threshold))
      kind = 'threshold';
    if (settings.preset === 'sma') {
      const difference = fast[index]!.sub(slow[index]!);
      const side = difference.gt(fp(0)) ? 1 : difference.lt(fp(0)) ? -1 : 0;
      if (previousSide && side && previousSide !== side) {
        kind = side > 0 ? 'cross-up' : 'cross-down';
        action = side > 0 ? 'buy' : 'sell';
      }
      if (side) previousSide = side;
    }
    if (kind)
      lesson.events.push({
        ...point(settings.preset === 'sma' ? fast[index]! : prices[index], index),
        fraction: (index - start) / (count - start - 1),
        action,
        kind,
      });
  }
  lesson.durationMs += lesson.events.length * EVENT_MS;
  return lesson;
}

/** Stable SVG geometry shared by the static reduced-motion view and the moving playhead. */
export function lessonPath(points: readonly LessonPoint[]): string {
  return points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
}

/** Map one illustration pass through rule → checks → trade; the component controls repeating playback. */
export function strategyLessonFrame(lesson: StrategyLesson, elapsedMs: number): LessonFrame {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, Math.min(lesson.durationMs, elapsedMs)) : 0;
  let held = 0;
  let completedEvents = 0;
  for (const event of lesson.events) {
    const at = event.fraction * TRAVEL_MS + held;
    if (elapsed >= at && elapsed < at + EVENT_MS) {
      const portion = (elapsed - at) / EVENT_MS;
      return {
        ...event,
        progress: event.fraction,
        event,
        phase: portion < 1 / 3 ? 'rule' : portion < 2 / 3 ? 'checks' : 'trade',
        completedEvents: completedEvents + (portion >= 2 / 3 ? 1 : 0),
      };
    }
    if (elapsed >= at + EVENT_MS) {
      held += EVENT_MS;
      completedEvents++;
    }
  }
  const progress = Math.max(0, Math.min(1, (elapsed - held) / TRAVEL_MS));
  const points = lesson.preset === 'sma' ? lesson.fast : lesson.price;
  const position = progress * (points.length - 1);
  const lower = Math.floor(position);
  const upper = Math.min(points.length - 1, lower + 1);
  const portion = position - lower;
  return {
    x: points[lower].x + (points[upper].x - points[lower].x) * portion,
    y: points[lower].y + (points[upper].y - points[lower].y) * portion,
    progress,
    event: null,
    phase: elapsed >= lesson.durationMs ? 'complete' : 'observe',
    completedEvents,
  };
}
