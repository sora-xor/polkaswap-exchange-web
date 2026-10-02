import { describe, expect, it } from 'vitest';
import {
  experimentDateRange,
  formatExperimentValue,
  holdingBenchmarkReturn,
  latestHeldOutFold,
  summarizeExperimentDecisions,
  summarizeExperimentPortfolio,
} from '@/features/bot-trading/experiment-results';
import type { ResearchCandidate, ResearchCheck, ResearchFold, ResearchResult } from '@/features/bot-trading/research';

describe('experiment result evidence', () => {
  it('uses actual marked portfolio values and the same-period held allocation without subtracting fees twice', () => {
    expect(
      summarizeExperimentPortfolio([
        { timestamp: 1, value: '100.000000000000000001', benchmark: '100.000000000000000001' },
        { timestamp: 2, value: '127.000000000000000009', benchmark: '115.000000000000000003' },
      ])
    ).toEqual({
      initial: '100.000000000000000001',
      final: '127.000000000000000009',
      netChange: '27.000000000000000008',
      heldFinal: '115.000000000000000003',
      excessOverHolding: '12.000000000000000006',
      valuedAt: 2,
    });
  });

  it('keeps losses, a zero final portfolio and incomplete valuation evidence distinct', () => {
    const first = { timestamp: 1, value: '100', benchmark: '100' };
    expect(summarizeExperimentPortfolio([first, { timestamp: 2, value: '0', benchmark: '90' }])).toMatchObject({
      final: '0',
      netChange: '-100',
      excessOverHolding: '-90',
    });
    expect(summarizeExperimentPortfolio([first])).toBeUndefined();
    for (const value of ['-1', 'NaN', 'Infinity']) {
      expect(summarizeExperimentPortfolio([first, { timestamp: 2, value, benchmark: '100' }])).toBeUndefined();
    }
    expect(
      summarizeExperimentPortfolio([first, { timestamp: Infinity, value: '100', benchmark: '100' }])
    ).toBeUndefined();
  });

  it('formats exact token values without turning tiny changes into an apparent zero', () => {
    expect(formatExperimentValue('1000.000000000000000001')).toBe('1000');
    expect(formatExperimentValue('1.23459', true)).toBe('+1.2345');
    expect(formatExperimentValue('-0.000000000000000001', true)).toBe('−<0.0001');
    expect(formatExperimentValue('0', true)).toBe('0');
    expect(formatExperimentValue(undefined)).toBe('—');
    expect(formatExperimentValue('NaN')).toBe('—');
  });

  it('separates no-signal bars and mutually exclusive first-failure blocks from actual fills', () => {
    const candidate = (selected: boolean, failed: ResearchCheck['key'][]): ResearchCandidate =>
      ({
        selected,
        checks: (['signal', 'cooldown', 'balance', 'tradeLimit', 'feeBudget'] as const).map((key) => ({
          key,
          passed: !failed.includes(key),
        })),
      }) as ResearchCandidate;
    const candidates = [
      candidate(true, []),
      candidate(false, ['signal', 'balance']),
      candidate(false, ['balance', 'feeBudget']),
      candidate(false, ['balance']),
      candidate(false, ['feeBudget']),
    ];
    expect(summarizeExperimentDecisions(candidates)).toEqual({
      checked: 5,
      signals: 4,
      taken: 1,
      noSignal: 1,
      blocked: 3,
      unexplained: 0,
      dominantBlock: { key: 'balance', count: 2 },
      reviewTarget: 'order-size',
    });
    expect(candidates[1].checks.filter((check) => !check.passed)).toHaveLength(2);
  });

  it('does not call missing evidence a blocked signal and keeps the recorded fill authoritative', () => {
    expect(
      summarizeExperimentDecisions([
        { selected: false, checks: [] },
        { selected: false, checks: [{ key: 'signal', passed: true }] },
        { selected: true, checks: [] },
      ] as ResearchCandidate[])
    ).toEqual({ checked: 3, signals: 2, taken: 1, noSignal: 0, blocked: 0, unexplained: 2 });
  });

  it('routes the dominant blocking cause to the setting users can review', () => {
    for (const [key, target] of [
      ['signal', 'rules'],
      ['cooldown', 'rules'],
      ['feeBudget', 'fees'],
      ['priceImpact', 'order-size'],
      ['goal', 'rules'],
    ] as const) {
      expect(
        summarizeExperimentDecisions([
          {
            selected: false,
            checks: [
              { key: 'signal', passed: key !== 'signal' },
              ...(key === 'signal' ? [] : [{ key, passed: false }]),
            ],
          },
        ] as ResearchCandidate[]).reviewTarget
      ).toBe(target);
    }
  });
  it('compares the held original portfolio instead of the strategy equity or output-token price', () => {
    expect(
      holdingBenchmarkReturn([
        { timestamp: 1, value: '100', benchmark: '100' },
        { timestamp: 2, value: '535.2', benchmark: '102' },
      ])
    ).toBe('2');
    expect(
      holdingBenchmarkReturn([
        { timestamp: 1, value: '0.000000000000000001', benchmark: '0.000000000000000001' },
        { timestamp: 2, value: '0.000000000000000001', benchmark: '0.0000000000000000015' },
      ])
    ).toBe('50');
  });

  it('preserves a zero holding return while withholding missing or invalid evidence', () => {
    expect(
      holdingBenchmarkReturn([
        { timestamp: 1, value: '100', benchmark: '100' },
        { timestamp: 2, value: '100', benchmark: '100' },
      ])
    ).toBe('0');
    expect(holdingBenchmarkReturn([])).toBeUndefined();
    for (const benchmark of ['0', '-1', 'NaN', 'Infinity']) {
      expect(
        holdingBenchmarkReturn([
          { timestamp: 1, value: '100', benchmark },
          { timestamp: 2, value: '100', benchmark: '100' },
        ])
      ).toBeUndefined();
    }
  });

  it('finds the latest test period without averaging folds or reordering source evidence', () => {
    const later = { testEnd: 20, test: { returnPercent: '0', trades: 0 } } as ResearchFold;
    const earlier = { testEnd: 10, test: { returnPercent: '90', trades: 10 } } as ResearchFold;
    const result = { validation: { mode: 'walk-forward', folds: [later, earlier] } } as ResearchResult;
    expect(latestHeldOutFold(result)).toBe(later);
    expect(result.validation.folds).toEqual([later, earlier]);
    expect(latestHeldOutFold()).toBeUndefined();
    expect(latestHeldOutFold({ ...result, validation: { ...result.validation, mode: 'none' } })).toBeUndefined();
  });

  it('labels date ranges with years and UTC and rejects corrupt timestamps', () => {
    expect(experimentDateRange(Date.UTC(2025, 11, 31), Date.UTC(2026, 0, 1))).toBe('2025-12-31 – 2026-01-01 UTC');
    expect(experimentDateRange()).toBe('—');
    expect(experimentDateRange(Infinity, Infinity)).toBe('—');
    expect(experimentDateRange(0, 1e30)).toBe('—');
    expect(experimentDateRange(2, 1)).toBe('—');
  });
});
