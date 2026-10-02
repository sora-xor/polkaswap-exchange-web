import { describe, expect, it } from 'vitest';
import { buildStrategyLesson, lessonPath, strategyLessonFrame } from '@/features/bot-trading/strategy-lesson';
import type { StrategyFlowSettings } from '@/features/bot-trading/strategy-explanation';

const settings: StrategyFlowSettings = {
  preset: 'dca',
  capital: '100',
  tradePercent: 10,
  intervalHours: 1,
  intervalBlocks: 1,
  thresholdPercent: 8,
  fastWindow: 5,
  slowWindow: 20,
};

describe('finite rule lessons', () => {
  it('places DCA buys at equal intervals independent of example price movements', () => {
    const lesson = buildStrategyLesson(settings);
    expect(lesson.events.map((event) => event.fraction)).toEqual([0.2, 0.4, 0.6, 0.8]);
    expect(lesson.events.every((event) => event.kind === 'cadence' && event.action === 'buy')).toBe(true);
    expect(new Set(lesson.events.map((event) => event.y)).size).toBeGreaterThan(1);
    expect(lesson.durationMs).toBe(15600);
  });
  it('derives threshold buy events only when the illustrated close moves from above to at or below the line', () => {
    const lesson = buildStrategyLesson({ ...settings, preset: 'threshold' });
    expect(lesson.events).toHaveLength(2);
    for (const event of lesson.events) {
      const index = Math.round(event.fraction * (lesson.price.length - 1));
      expect(lesson.price[index - 1].y).toBeLessThan(lesson.thresholdY!);
      expect(lesson.price[index].y).toBeGreaterThanOrEqual(lesson.thresholdY!);
      expect(event.action).toBe('buy');
    }
  });
  it('calculates SMA curves from configured windows and makes crossings determine buy or sell', () => {
    const lesson = buildStrategyLesson({ ...settings, preset: 'sma' });
    expect(lesson.fast).toHaveLength(lesson.slow.length);
    expect(lesson.events.map((event) => event.action)).toEqual(['buy', 'sell', 'buy']);
    for (const event of lesson.events) {
      const index = Math.round(event.fraction * (lesson.fast.length - 1));
      expect(
        event.action === 'buy'
          ? lesson.fast[index].y < lesson.slow[index].y
          : lesson.fast[index].y > lesson.slow[index].y
      ).toBe(true);
    }
    expect(buildStrategyLesson({ ...settings, preset: 'sma', fastWindow: 4, slowWindow: 30 }).fast).not.toEqual(
      lesson.fast
    );
    expect(lessonPath(lesson.fast)).toMatch(/^M[\d.]+,[\d.]+ L/);
  });
  it('holds the playhead while explaining rule, checks and trade, then completes exactly once', () => {
    const lesson = buildStrategyLesson(settings);
    const at = lesson.events[0].fraction * 6000;
    const rule = strategyLessonFrame(lesson, at + 100);
    const checks = strategyLessonFrame(lesson, at + 1000);
    const trade = strategyLessonFrame(lesson, at + 2000);
    expect([rule.phase, checks.phase, trade.phase]).toEqual(['rule', 'checks', 'trade']);
    expect(rule.x).toBe(checks.x);
    expect(checks.x).toBe(trade.x);
    expect(rule.completedEvents).toBe(0);
    expect(trade.completedEvents).toBe(1);
    expect(strategyLessonFrame(lesson, at + 799).phase).toBe('rule');
    expect(strategyLessonFrame(lesson, at + 1599).phase).toBe('checks');
    expect(strategyLessonFrame(lesson, at + 2399).phase).toBe('trade');
    expect(strategyLessonFrame(lesson, at + 2400).phase).toBe('observe');
    expect(strategyLessonFrame(lesson, lesson.durationMs)).toMatchObject({
      progress: 1,
      phase: 'complete',
      completedEvents: 4,
      x: 750,
    });
    expect(strategyLessonFrame(lesson, lesson.durationMs + 10000)).toEqual(
      strategyLessonFrame(lesson, lesson.durationMs)
    );
    expect(strategyLessonFrame(lesson, NaN).progress).toBe(0);
  });
  it.each(['dca', 'threshold', 'sma'] as const)(
    'keeps %s geometry bounded and deterministic without touching financial settings',
    (preset) => {
      const input = Object.freeze({ ...settings, preset });
      const lesson = buildStrategyLesson(input);
      expect(buildStrategyLesson(input)).toEqual(lesson);
      expect(
        [...lesson.price, ...lesson.fast, ...lesson.slow].every(
          ({ x, y }) => Number.isFinite(x) && Number.isFinite(y) && x >= 30 && x <= 750 && y >= 17.99 && y <= 142.01
        )
      ).toBe(true);
      expect(input.capital).toBe('100');
    }
  );
});
