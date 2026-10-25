import { describe, expect, it } from 'vitest';
import {
  formatExperimentPercent,
  plotExperimentEquity,
  extendCalculationDistribution,
  layoutCalculationDistribution,
  calculationDistributionPosition,
  calculationDistributionOpacity,
  type CalculationUpdate,
} from '@/features/bot-trading/experiment-visuals';
import { DISTRIBUTION_HEIGHT, DISTRIBUTION_LEFT, DISTRIBUTION_RIGHT } from '@/features/bot-trading/tradeDistribution';

describe('experiment data visualization', () => {
  it('normalizes different token capitals with exact decimal ratios on shared timestamp axes', () => {
    const result = plotExperimentEquity([
      {
        id: 'small',
        equity: [
          { timestamp: 100, value: '0.000000000000000001', benchmark: '0' },
          { timestamp: 200, value: '0.0000000000000000011', benchmark: '0' },
        ],
      },
      {
        id: 'large',
        equity: [
          { timestamp: 200, value: '100000000000000000000000', benchmark: '0' },
          { timestamp: 300, value: '90000000000000000000000', benchmark: '0' },
        ],
      },
    ]);
    expect(result).toMatchObject({ start: 100, end: 300, minimum: '-10', maximum: '10', zeroY: 110 });
    expect(result.series[0].points[1]).toMatchObject({ x: 400, y: 10, returnPercent: '10' });
    expect(result.series[1].points[0]).toMatchObject({ x: 400, y: 110, returnPercent: '0' });
    expect(result.series[1].points[1]).toMatchObject({ x: 790, y: 210, returnPercent: '-10' });
  });

  it('breaks curves at invalid observations and never fabricates returns for zero starting capital', () => {
    const result = plotExperimentEquity([
      {
        id: 'gap',
        equity: [
          { timestamp: 1, value: '100', benchmark: '0' },
          { timestamp: 2, value: 'NaN', benchmark: '0' },
          { timestamp: 3, value: '110', benchmark: '0' },
        ],
      },
      {
        id: 'zero',
        equity: [
          { timestamp: 1, value: '0', benchmark: '0' },
          { timestamp: 2, value: '100', benchmark: '0' },
        ],
      },
    ]);
    expect(result.series[0].path.match(/M/g)).toHaveLength(2);
    expect(result.series[0].path).not.toContain('L');
    expect(result.series[1]).toMatchObject({ points: [], path: '' });
  });

  it('provides finite flat and empty plots and bounds tiny display dimensions', () => {
    const empty = plotExperimentEquity([], 0, 0);
    expect(empty).toMatchObject({ start: null, end: null, minimum: '-1', maximum: '1', zeroY: 10.5 });
    const flat = plotExperimentEquity([{ id: 'flat', equity: [{ timestamp: 1, value: '100', benchmark: '100' }] }]);
    expect(flat.series[0].points[0]).toMatchObject({ returnPercent: '0', x: 10, y: 110 });
  });

  it('formats precise percent labels without negative zero or misleading invalid values', () => {
    expect(formatExperimentPercent('0.600000000000000001', true)).toBe('+0.60');
    expect(formatExperimentPercent('-0.000000001', true)).toBe('0.00');
    expect(formatExperimentPercent('-23.129', true)).toBe('-23.13');
    expect(formatExperimentPercent('NaN')).toBe('—');
    expect(formatExperimentPercent(undefined)).toBe('—');
  });
});

describe('actual calculation visualization', () => {
  const update = (
    checkpoint: number,
    ids: string[],
    scope: CalculationUpdate['scope'] = 'study'
  ): CalculationUpdate => ({
    checkpoint,
    scope,
    scopeCompleted: checkpoint * 32,
    scopeTotal: 1000,
    decisions: ids.map((id, index) => ({
      id,
      timestamp: checkpoint,
      selected: index % 2 === 0,
      checks: [{ key: 'signal', passed: index % 2 === 0 }],
    })),
    gateTotals: { signal: { passed: ids.length, rejected: 0 } },
  });

  it('appends evaluated checkpoint deltas exactly once and never invents absent financial outcomes', () => {
    const first = extendCalculationDistribution(undefined, update(1, ['one', 'two']));
    expect(first.decisions.map((decision) => decision.id)).toEqual(['one', 'two']);
    expect(first.decisions.every((decision) => decision.pnl === undefined)).toBe(true);
    expect(extendCalculationDistribution(first, update(1, ['ignored']))).toBe(first);
    const second = extendCalculationDistribution(first, update(2, ['three']));
    expect(second.decisions.map((decision) => decision.id)).toEqual(['one', 'two', 'three']);
    expect(second.currentIds).toEqual(['three']);
  });

  it('recovers all earlier evaluated points when a lane mounts in the middle of computation', () => {
    const earlier = update(1, ['earlier']).decisions;
    const current = update(5, ['current']);
    const state = extendCalculationDistribution(undefined, {
      ...current,
      scopeDecisions: [...earlier, ...current.decisions],
    });
    expect(state.decisions.map((decision) => decision.id)).toEqual(['earlier', 'current']);
    expect(state.currentIds).toEqual(['current']);
  });

  it('resets scope for validation folds, alternatives and restarted calculations', () => {
    const study = extendCalculationDistribution(undefined, update(4, ['study']));
    const training = extendCalculationDistribution(study, { ...update(5, ['training'], 'train'), fold: 1, variant: 1 });
    expect(training.decisions.map((decision) => decision.id)).toEqual(['training']);
    const next = extendCalculationDistribution(training, { ...update(6, ['variant'], 'train'), fold: 1, variant: 2 });
    expect(next.decisions.map((decision) => decision.id)).toEqual(['variant']);
    const restart = extendCalculationDistribution(study, update(1, ['new']));
    expect(restart.decisions.map((decision) => decision.id)).toEqual(['new']);
  });

  it('bounds retained scope memory and categorizes pass/reject evidence without a profit scale', () => {
    const state = extendCalculationDistribution(
      undefined,
      update(
        1,
        Array.from({ length: 10002 }, (_, i) => String(i))
      )
    );
    expect(state.decisions).toHaveLength(10000);
    const layout = layoutCalculationDistribution(state.decisions);
    expect(layout.balls).toHaveLength(10000);
    expect(layout.extent).toBe('0');
    expect(layout.balls.every((ball) => Number.isFinite(ball.x) && Number.isFinite(ball.y))).toBe(true);
    expect(
      layout.balls.filter((ball) => ball.selected).every((ball) => ball.positive && !ball.neutral && ball.x > 509)
    ).toBe(true);
    expect(layout.balls.filter((ball) => !ball.selected).every((ball) => ball.neutral && ball.x < 509)).toBe(true);
  });

  it('keeps all earlier positions and sizes fixed when later evidence arrives', () => {
    const first = update(
      1,
      Array.from({ length: 40 }, (_, i) => `early-${i}`)
    ).decisions;
    const later = update(
      2,
      Array.from({ length: 2000 }, (_, i) => `later-${i}`)
    ).decisions;
    const initial = layoutCalculationDistribution(first);
    const extended = layoutCalculationDistribution([...first, ...later]);
    expect(extended.balls.slice(0, first.length)).toEqual(initial.balls);
  });

  it('keeps a 32-decision batch and all earlier evidence at fixed bounded positions throughout its arrival', () => {
    const earlier = update(
      1,
      Array.from({ length: 50 }, (_, index) => `earlier-${index}`)
    ).decisions;
    const incoming = update(
      2,
      Array.from({ length: 32 }, (_, index) => `incoming-${index}`)
    ).decisions;
    const layout = layoutCalculationDistribution([...earlier, ...incoming]);
    const settled = layout.balls.slice(0, earlier.length);
    const moving = layout.balls.slice(earlier.length);
    for (let step = 0; step <= 20; step += 1) {
      const progress = step / 20;
      for (const ball of settled) {
        expect(calculationDistributionPosition(ball, undefined, moving.length, progress)).toMatchObject({
          x: ball.x,
          y: ball.y,
          settled: true,
        });
      }
      moving.forEach((ball, index) => {
        const point = calculationDistributionPosition(ball, index, moving.length, progress);
        expect(point).toMatchObject({ x: ball.x, y: ball.y });
        expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
        expect(point.x).toBeGreaterThanOrEqual(DISTRIBUTION_LEFT);
        expect(point.x).toBeLessThanOrEqual(DISTRIBUTION_RIGHT);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(DISTRIBUTION_HEIGHT);
        if (step === 20) {
          expect(point).toMatchObject({ x: ball.x, y: ball.y, settled: true, waiting: false });
        }
      });
    }
  });

  it('fades only actual incoming evidence monotonically without restarting earlier observations', () => {
    const layout = layoutCalculationDistribution(update(1, ['earlier', 'first', 'last']).decisions);
    const [earlier, first, last] = layout.balls;
    expect(calculationDistributionPosition(earlier, undefined, 2, 0)).toMatchObject({
      x: earlier.x,
      y: earlier.y,
      settled: true,
    });
    expect(calculationDistributionPosition(first, 0, 2, 0).settled).toBe(false);
    expect(calculationDistributionOpacity(1, 2, 0.1)).toBe(0);
    const entering = calculationDistributionPosition(first, 0, 2, 0.5);
    expect(entering).toMatchObject({ x: first.x, y: first.y });
    expect(entering.settled).toBe(false);
    expect(calculationDistributionPosition(first, 0, 2, 1)).toMatchObject({
      x: first.x,
      y: first.y,
      settled: true,
      rejected: true,
    });
    expect(calculationDistributionPosition(last, 1, 2, 1)).toMatchObject({
      x: last.x,
      y: last.y,
      settled: true,
      waiting: false,
    });
    expect(calculationDistributionPosition(last, 0, 1, 0.75).settled).toBe(false);
    expect(calculationDistributionPosition(last, 0, 1, NaN).settled).toBe(true);
    for (let index = 0; index < 32; index++) {
      let previous = 0;
      expect(calculationDistributionOpacity(index, 32, 0)).toBe(0);
      expect(calculationDistributionOpacity(index, 32, 1)).toBe(1);
      for (let step = 0; step <= 20; step++) {
        const opacity = calculationDistributionOpacity(index, 32, step / 20);
        expect(Number.isFinite(opacity)).toBe(true);
        expect(opacity).toBeGreaterThanOrEqual(previous);
        expect(opacity).toBeLessThanOrEqual(1);
        expect(calculationDistributionOpacity(undefined, 32, step / 20)).toBe(1);
        previous = opacity;
      }
    }
    expect(calculationDistributionOpacity(0, 1, -1)).toBe(0);
    expect(calculationDistributionOpacity(0, 1, 2)).toBe(1);
    expect(calculationDistributionOpacity(0, 1, NaN)).toBe(1);
  });
});
