import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyStrategyConfig, requiredStrategyCandles } from '@/features/bot-trading/engine';
import { GOAL_EXACT_POLICY } from '@/features/bot-trading/goal-exact-ledger';
import { readGoalQualificationBinding } from '@/features/bot-trading/goal-qualification';
import { evaluateStrategyRules } from '@/features/bot-trading/strategy-rules';
import type { StrategyConfig } from '@/features/bot-trading/types';

const proposal = JSON.parse(
  readFileSync(new URL('../../../../docs/bots-partial-candidates-20260921.json', import.meta.url), 'utf8')
) as {
  kind: string;
  qualified: boolean;
  studyRegistered: boolean;
  studyWindow: unknown;
  runtimeProfile: unknown;
  constraints: {
    initialKusdCodec: string;
    initialFeeReserveXorCodec: string;
    maximumTradeKusdCodec: string;
    maximumTradeXorCodec: string;
    durationMs: number;
    targetPercent: string;
    maximumDrawdownPercent: string;
    intervalMs: number;
  };
  candidates: { id: string; strategy: StrategyConfig }[];
};
const [trend, restoring] = proposal.candidates.map((candidate) => candidate.strategy);
const UNIT = 10n ** 9n;
const HOUR = 3600000;

/** Encode invented rational closes exactly; no file contains market observations. */
function decimal(value: bigint): string {
  return `${value / UNIT}.${String(value % UNIT).padStart(9, '0')}`;
}

/** Twenty-five prior closes leave the final close/return out of the 24-pair fit. */
function synthetic(kind: 'restoring' | 'explosive' | 'oscillating' | 'zero' | 'one' | 'flat', current: string) {
  const prior = Array.from({ length: 25 }, (_, index) => {
    let difference = 0n;
    if (kind === 'restoring') difference = 1n << BigInt(24 - index);
    if (kind === 'explosive') difference = 1n << BigInt(index);
    if (kind === 'oscillating') difference = (index % 2 ? -1n : 1n) * (1n << BigInt(24 - index));
    if (kind === 'zero') difference = BigInt(index) * 1000000n;
    if (kind === 'one') difference = index === 0 ? 1000000n : 0n;
    return decimal(100n * UNIT + difference);
  });
  return [...prior, current].map((close, index) => ({ timestamp: (index + 1) * HOUR, close }));
}

const network = vi.fn(() => {
  throw new Error('No network in proposal validation');
});
beforeAll(() => vi.stubGlobal('fetch', network));
afterAll(() => {
  expect(network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

describe('unregistered partial-order candidate proposal', () => {
  it('contains two unchanged-lot hypotheses with no window, runtime or qualification claim', () => {
    expect(proposal).toMatchObject({
      kind: 'unregistered-partial-inventory-research-proposal',
      qualified: false,
      studyRegistered: false,
      studyWindow: null,
      runtimeProfile: null,
      constraints: {
        initialKusdCodec: '10000000000000000000',
        initialFeeReserveXorCodec: '1000000000000000000',
        maximumTradeKusdCodec: '5000000000000000000',
        maximumTradeXorCodec: '1000000000000000000',
        durationMs: 86400000,
        targetPercent: '5',
        maximumDrawdownPercent: '5',
        intervalMs: 21600000,
      },
    });
    expect(proposal.candidates).toHaveLength(2);
    for (const { strategy } of proposal.candidates) {
      expect(copyStrategyConfig(strategy)).toEqual(strategy);
      expect(strategy.amount).toBe('5');
      expect(strategy.intervalMs).toBe(21600000);
      // The denominator here is an invented parser input, not a runtime observation.
      expect(
        readGoalQualificationBinding({
          genesisHash: GOAL_EXACT_POLICY.genesisHash,
          denominator: '1',
          initialKusdCodec: proposal.constraints.initialKusdCodec,
          maxTradeKusdCodec: proposal.constraints.maximumTradeKusdCodec,
          maxTradeXorCodec: proposal.constraints.maximumTradeXorCodec,
          strategy,
        }).strategy
      ).toEqual(strategy);
    }
    expect(requiredStrategyCandles(trend)).toBe(24);
    expect(requiredStrategyCandles(restoring)).toBe(26);
  });

  it('uses an immediate level predicate, without requiring a new trend crossover', () => {
    expect(evaluateStrategyRules(trend.rules!, synthetic('flat', '101'))).toMatchObject({
      ready: true,
      entry: true,
      exit: false,
    });
    expect(evaluateStrategyRules(trend.rules!, synthetic('flat', '99'))).toMatchObject({
      ready: true,
      entry: false,
      exit: true,
    });
    expect(evaluateStrategyRules(trend.rules!, synthetic('flat', '100'))).toMatchObject({
      ready: true,
      entry: false,
      exit: false,
    });
  });

  it('recognizes a known phi=1/2 fit and excludes the current return from its regression', () => {
    const buy = evaluateStrategyRules(restoring.rules!, synthetic('restoring', '99'));
    const sell = evaluateStrategyRules(restoring.rules!, synthetic('restoring', '101'));
    expect(buy).toMatchObject({ ready: true, entry: true, exit: false });
    expect(sell).toMatchObject({ ready: true, entry: false, exit: true });
    expect(buy.entryConditions.slice(1).map((condition) => condition.value)).toEqual(['50', '50']);
    expect(sell.entryConditions.slice(1).map((condition) => condition.value)).toEqual(['50', '50']);
  });

  it.each([
    ['explosive', '-100'],
    ['oscillating', '150'],
  ] as const)('exits a below-mean position for a %s fitted slope', (kind, expected) => {
    const result = evaluateStrategyRules(restoring.rules!, synthetic(kind, '99'));
    expect(result).toMatchObject({ ready: true, entry: false, exit: true });
    expect(result.entryConditions[1].value).toBe(expected);
  });

  it.each([
    ['zero', '0'],
    ['one', '100'],
  ] as const)('preserves strict coefficient boundary %s rather than silently broadening it', (kind, expected) => {
    const below = evaluateStrategyRules(restoring.rules!, synthetic(kind, '99'));
    expect(below).toMatchObject({ ready: true, entry: false, exit: false });
    expect(below.entryConditions[1].value).toBe(expected);
    expect(evaluateStrategyRules(restoring.rules!, synthetic(kind, '101'))).toMatchObject({
      ready: true,
      entry: false,
      exit: true,
    });
  });

  it('holds when the fit is unavailable even if the any-group price exit would pass', () => {
    const result = evaluateStrategyRules(restoring.rules!, synthetic('flat', '101'));
    expect(result).toMatchObject({ ready: false, entry: false, exit: false });
    expect(result.exitConditions[0].passed).toBe(true);
    expect(result.exitConditions[1].ready).toBe(false);
  });
});
