import { describe, expect, it } from 'vitest';
import {
  DISTRIBUTION_BASE,
  DISTRIBUTION_HEIGHT,
  DISTRIBUTION_LEFT,
  DISTRIBUTION_RIGHT,
  distributionGateReachedCount,
  distributionPosition,
  distributionRoute,
  distributionSettledCount,
  distributionTiming,
  layoutTradeDistribution,
  type DistributionTrade,
} from '@/features/bot-trading/tradeDistribution';

const candidate = (id: string, pnl: string, selected = true): DistributionTrade => ({
  id,
  pnl,
  selected,
  timestamp: 1,
  checks: [
    { key: 'signal', passed: true },
    { key: 'balance', passed: selected },
  ],
});

describe('trade distribution layout', () => {
  it('represents all 10,000 candidates without sampling or overlapping identical outcomes', () => {
    const trades = Array.from({ length: 10000 }, (_, index) => candidate(`candidate-${index}`, '1', index % 2 === 0));
    const result = layoutTradeDistribution(trades);
    expect(result.balls).toHaveLength(trades.length);
    expect(new Set(result.balls.map((ball) => ball.id)).size).toBe(trades.length);
    expect(new Set(result.balls.map((ball) => `${ball.x}:${ball.y}`)).size).toBe(trades.length);
    for (const ball of result.balls) {
      expect(ball.x - ball.radius).toBeGreaterThanOrEqual(DISTRIBUTION_LEFT);
      expect(ball.x + ball.radius).toBeLessThanOrEqual(DISTRIBUTION_RIGHT);
      expect(ball.y - ball.radius).toBeGreaterThan(150);
      expect(ball.y + ball.radius).toBeLessThanOrEqual(DISTRIBUTION_BASE);
    }
    expect(result.balls.filter((ball) => ball.selected)).toHaveLength(5000);
  });

  it('keeps exact tiny and huge signed values on the correct side of zero', () => {
    const result = layoutTradeDistribution([
      candidate('negative', '-999999999999999999999999.123456789123456789'),
      candidate('positive', '999999999999999999999999.123456789123456789'),
      candidate('tiny-negative', '-0.000000000000000000000000000001'),
      candidate('tiny-positive', '0.000000000000000000000000000001'),
      candidate('zero', '0'),
    ]);
    const middle = (DISTRIBUTION_LEFT + DISTRIBUTION_RIGHT) / 2;
    expect(result.extent).toBe('999999999999999999999999.123456789123456789');
    expect(result.balls[0].x).toBeLessThan(middle);
    expect(result.balls[1].x).toBeGreaterThan(middle);
    expect(result.balls[2].x).toBeLessThan(middle);
    expect(result.balls[3].x).toBeGreaterThan(middle);
    expect(result.balls[4].x).toBe(middle);
    expect(result.balls[4].neutral).toBe(true);
    expect(layoutTradeDistribution([candidate('tiny', '0.000000000000000000000000000001')]).extent).toBe(
      '0.000000000000000000000000000001'
    );
  });

  it('preserves every constraint route and reaches a rejected trade’s final loss', () => {
    const { balls } = layoutTradeDistribution([candidate('rejected', '-2', false)]);
    const ball = balls[0];
    const route = distributionRoute(ball);
    expect(route).toHaveLength(4);
    expect(route[0].x).toBeLessThan((DISTRIBUTION_LEFT + DISTRIBUTION_RIGHT) / 2);
    expect(route[1].x).toBeLessThan(route[0].x);
    expect(route[2].x).toBeLessThan(route[1].x);
    expect(distributionPosition(ball, 1, 0).rejected).toBe(false);
    const complete = distributionPosition(ball, 1, 1);
    expect(complete).toMatchObject({ x: ball.x, y: ball.y, rejected: true, settled: true });
    expect(complete.y).toBeLessThan(DISTRIBUTION_HEIGHT);
    expect(distributionPosition(ball, 1, 1)).toEqual(distributionPosition(ball, 1, 1));
  });

  it('moves continuously toward each outcome without random zigzags, vertical bounce or overshoot', () => {
    const { balls } = layoutTradeDistribution([
      candidate('left', '-2', false),
      candidate('right', '2'),
      candidate('zero', '0'),
    ]);
    for (const ball of balls) {
      const route = distributionRoute(ball);
      expect(distributionRoute({ ...ball, id: 'different-id', index: 500 })).toEqual(route);
      let previous = distributionPosition({ ...ball, index: 0 }, 1, 0, route);
      const direction = Math.sign(ball.x - route[0].x);
      for (let step = 1; step <= 1000; step++) {
        const point = distributionPosition({ ...ball, index: 0 }, 1, (step / 1000) * 0.38, route);
        expect(point.y).toBeGreaterThanOrEqual(previous.y - 1e-9);
        expect(point.y).toBeLessThanOrEqual(ball.y + 1e-9);
        expect((point.x - previous.x) * direction).toBeGreaterThanOrEqual(-1e-9);
        expect(point.x).toBeGreaterThanOrEqual(Math.min(route[0].x, ball.x) - 1e-9);
        expect(point.x).toBeLessThanOrEqual(Math.max(route[0].x, ball.x) + 1e-9);
        previous = point;
      }
      expect(previous).toMatchObject({ x: ball.x, y: ball.y, settled: true });
    }
  });

  it('keeps waiting balls visible and supports deterministic arbitrary scrubbing', () => {
    const trades = [candidate('first', '3'), candidate('last', '-1')];
    const result = layoutTradeDistribution(trades);
    const last = result.balls[1];
    expect(distributionPosition(last, 2, 0)).toMatchObject({ waiting: true, settled: false });
    expect(distributionPosition(last, 2, 0).y).toBeGreaterThan(0);
    const middle = distributionPosition(last, 2, 0.8);
    expect(middle).toEqual(distributionPosition(last, 2, 0.8));
    expect(middle.settled).toBe(false);
    expect(distributionPosition(last, 2, 1).settled).toBe(true);
    expect(layoutTradeDistribution(trades)).toEqual(result);
  });

  it('uses the same landing and gate boundaries for accounting as for the visible balls', () => {
    for (const total of [1, 2, 7, 360]) {
      const { balls, gates } = layoutTradeDistribution(
        Array.from({ length: total }, (_, index) => candidate(`trade-${index}`, '1'))
      );
      const checkpoints = [0, 0.5, 1, Number.NaN];
      for (const index of new Set([0, Math.floor(total / 2), total - 1])) {
        const { delay } = distributionTiming(index, total, 0);
        for (let reached = 1; reached <= gates.length + 1; reached += 1) {
          const boundary = delay + (0.38 * reached) / (gates.length + 1);
          checkpoints.push(boundary - Number.EPSILON, boundary, boundary + Number.EPSILON);
        }
      }
      for (const progress of checkpoints) {
        const landed = balls.map((ball) => distributionPosition(ball, total, progress).settled);
        const count = distributionSettledCount(total, progress);
        expect(count).toBe(landed.filter(Boolean).length);
        expect(landed).toEqual(balls.map((_, index) => index < count));
        for (let gateIndex = 0; gateIndex < gates.length; gateIndex += 1) {
          // A single failing gate changes the visible rejection state exactly when reached.
          const visiblyReached = balls.filter(
            (ball) =>
              distributionPosition(
                { ...ball, gates: ball.gates.map((_, index) => index !== gateIndex) },
                total,
                progress
              ).rejected
          );
          expect(distributionGateReachedCount(total, progress, gates.length, gateIndex)).toBe(visiblyReached.length);
        }
      }
    }
    expect(distributionSettledCount(0, 1)).toBe(0);
    expect(distributionGateReachedCount(0, 1, 2, 0)).toBe(0);
    expect(distributionTiming(0, 1, -1)).toMatchObject({ bounded: 0, local: 0 });
    expect(distributionTiming(0, 1, Number.NaN)).toMatchObject({ bounded: 1, local: 1 });
  });

  it('handles empty and neutral inputs without invalid coordinates', () => {
    expect(layoutTradeDistribution([])).toEqual({ balls: [], gates: [], extent: '0' });
    const result = layoutTradeDistribution([candidate('zero', '0'), candidate('invalid', 'NaN')]);
    expect(result.extent).toBe('0');
    for (const ball of result.balls) {
      expect(ball.neutral).toBe(true);
      expect(Number.isFinite(ball.x)).toBe(true);
      expect(Number.isFinite(ball.y)).toBe(true);
    }
  });
});
