import { describe, expect, it } from 'vitest';
import {
  summarizeValidation,
  VALIDATION_INSIGHT_THRESHOLDS,
  type ValidationFoldInput,
} from '@/features/bot-trading/validation-insights';

/** Small explicit held-out windows, independent of network data and the research engine. */
function fold(index: number, returnPercent: string, trades = 5, drawdownPercent = '2'): ValidationFoldInput {
  return {
    index,
    trainStart: 0,
    trainEnd: index * 100,
    testStart: index * 100 + 1,
    testEnd: index * 100 + 99,
    train: { trades: 10, returnPercent: '10', drawdownPercent: '2', coverage: 1 },
    test: { trades, returnPercent, drawdownPercent, coverage: 1 },
  };
}

/** Apply validation metadata without pulling runtime trading modules into the test. */
function summarize(folds: ValidationFoldInput[], tuned = false) {
  return summarizeValidation({ mode: 'walk-forward', folds, tuned });
}

describe('held-out validation insights', () => {
  it('does not treat disabled validation or empty folds as zero-return evidence', () => {
    for (const result of [summarize([]), summarizeValidation({ mode: 'none', folds: [fold(1, '5')], tuned: true })]) {
      expect(result).toMatchObject({
        verdict: 'not-validated',
        foldCount: 0,
        validFoldCount: 0,
        eligibleFoldCount: 0,
        medianReturnPercent: null,
        minReturnPercent: null,
        maxReturnPercent: null,
        maxDrawdownPercent: null,
        positiveFoldCount: 0,
        testTradeCount: 0,
        notes: [],
      });
    }
  });

  it('reports exact ranges, drawdown and samples while keeping independent fold returns separate', () => {
    const result = summarize([fold(1, '0.1', 5, '1.5'), fold(2, '0.3', 6, '4.25'), fold(3, '0.2', 7, '2')]);
    expect(result).toMatchObject({
      verdict: 'consistent',
      thresholds: { minimumFolds: 3, minimumTestTradesPerFold: 5 },
      foldCount: 3,
      validFoldCount: 3,
      eligibleFoldCount: 3,
      positiveFoldCount: 3,
      testTradeCount: 18,
      eligibleTestTradeCount: 18,
      medianReturnPercent: '0.2',
      minReturnPercent: '0.1',
      maxReturnPercent: '0.3',
      maxDrawdownPercent: '4.25',
    });
    expect(result.notes).toContain('no-cost-stress');
    expect(result).not.toHaveProperty('compoundedReturnPercent');
    expect(result).not.toHaveProperty('probability');
    expect(Object.isFrozen(VALIDATION_INSIGHT_THRESHOLDS)).toBe(true);
  });

  it('preserves a 37-place even median and sorts values beyond JS integer precision exactly', () => {
    const epsilon = '0.000000000000000000000000000000000001';
    expect(summarize([fold(1, '0'), fold(2, epsilon)]).medianReturnPercent).toBe(
      '0.0000000000000000000000000000000000005'
    );
    const large = summarize([fold(1, '9007199254740993.1'), fold(2, '9007199254740992.9')]);
    expect(large.medianReturnPercent).toBe('9007199254740993');
    expect(large.minReturnPercent).toBe('9007199254740992.9');
    expect(large.maxReturnPercent).toBe('9007199254740993.1');
  });

  it('distinguishes negative, flat and positive tests without turning a lone positive holdout into consistency', () => {
    const mixed = summarize([fold(1, '-0.2'), fold(2, '0'), fold(3, '0.1')]);
    expect(mixed).toMatchObject({
      verdict: 'mixed',
      positiveFoldCount: 1,
      negativeFoldCount: 1,
      flatFoldCount: 1,
      medianReturnPercent: '0',
    });
    const holdout = summarizeValidation({ mode: 'holdout', folds: [fold(1, '10', 100)], tuned: false });
    expect(holdout.verdict).toBe('mixed');
    expect(holdout.notes).toContain('few-folds');
    expect(summarize([fold(1, '-3'), fold(2, '-2'), fold(3, '-1')]).verdict).toBe('mixed');
  });

  it('keeps inactive windows visible and exposes the exact trades excluded by the sample screen', () => {
    const result = summarize([fold(1, '1', 4), fold(2, '0', 0, '0'), fold(3, '3', 5)]);
    expect(result).toMatchObject({
      verdict: 'insufficient-trades',
      validFoldCount: 3,
      eligibleFoldCount: 1,
      insufficientTradeFoldCount: 2,
      emptyFoldCount: 1,
      testTradeCount: 9,
      eligibleTestTradeCount: 5,
      medianReturnPercent: '1',
      minReturnPercent: '0',
    });
    expect(result.folds.map((item) => item.eligible)).toEqual([false, false, true]);
  });

  it('labels raw training/test gaps with their different durations and exposes existing normalized evidence', () => {
    const input = fold(1, '0.1');
    input.train.returnPercent = '0.3';
    input.trainEvidence = { returnPerDayPercent: '0.03' };
    input.testEvidence = {
      returnPerDayPercent: '0.02',
      benchmark: { returnPercent: '0.2' },
      excessReturnPercent: '-0.1',
    };
    const result = summarize([input], true);
    expect(result.folds[0]).toMatchObject({
      trainDurationMs: 100,
      testDurationMs: 98,
      durationsDiffer: true,
      returnGapPercentagePoints: '0.2',
      trainReturnPerDayPercent: '0.03',
      testReturnPerDayPercent: '0.02',
      benchmarkReturnPercent: '0.2',
      excessReturnPercent: '-0.1',
    });
    expect(result.notes).toEqual(
      expect.arrayContaining(['unequal-periods', 'few-folds', 'tuning-risk', 'no-cost-stress'])
    );
    expect(result).toMatchObject({ benchmarkedFoldCount: 1, benchmarkBeatCount: 0, medianExcessReturnPercent: '-0.1' });
  });

  it('summarizes only supplied benchmark evidence without inventing missing or invalid comparisons', () => {
    const inputs = [fold(1, '1'), fold(2, '2'), fold(3, '3')];
    inputs[0].testEvidence = {
      returnPerDayPercent: null,
      benchmark: { returnPercent: '0.5' },
      excessReturnPercent: '0.5',
    };
    inputs[1].testEvidence = {
      returnPerDayPercent: null,
      benchmark: { returnPercent: '3' },
      excessReturnPercent: '-1',
    };
    inputs[2].testEvidence = { returnPerDayPercent: null, benchmark: null, excessReturnPercent: '100' };
    const result = summarize(inputs);
    expect(result).toMatchObject({
      benchmarkedFoldCount: 2,
      benchmarkBeatCount: 1,
      medianExcessReturnPercent: '-0.25',
    });
    expect(result.folds[2].excessReturnPercent).toBeNull();
    expect(result.notes).toContain('missing-benchmark');
  });

  it('excludes malformed metrics, invalid counts and overlapping test windows from evidence', () => {
    const inputs = [fold(1, '1'), fold(2, 'NaN'), fold(3, '3', 5, '-1'), fold(4, '4', 1.5), fold(5, '5')];
    inputs[4].testStart = inputs[0].testStart;
    const result = summarize(inputs);
    expect(result).toMatchObject({
      validFoldCount: 1,
      invalidFoldCount: 4,
      medianReturnPercent: '1',
      eligibleFoldCount: 1,
      verdict: 'mixed',
    });
    expect(result.notes).toContain('invalid-fold-data');
    expect(summarize([fold(1, '1e1000')]).verdict).toBe('not-validated');
    expect(summarize([fold(1, '1', 10_001)]).verdict).toBe('not-validated');
    expect(summarize([fold(1, '1', Number.MAX_SAFE_INTEGER + 1)]).verdict).toBe('not-validated');
    const invalidTrain = fold(1, '5');
    invalidTrain.train.returnPercent = 'NaN';
    expect(summarize([invalidTrain]).invalidFoldCount).toBe(1);
  });

  it('retains incomplete-coverage observations but excludes them from a consistency verdict without mutating input', () => {
    const inputs = [fold(1, '1'), fold(2, '2'), fold(3, '3')];
    inputs[1].test.coverage = 0.9;
    const before = JSON.stringify(inputs);
    const result = summarize(inputs);
    expect(result).toMatchObject({ verdict: 'mixed', validFoldCount: 3, eligibleFoldCount: 2, positiveFoldCount: 3 });
    expect(result.notes).toContain('incomplete-coverage');
    expect(result.notes).not.toContain('tuning-risk');
    expect(JSON.stringify(inputs)).toBe(before);
  });
});
