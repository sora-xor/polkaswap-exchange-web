import { beforeAll, describe, expect, it, vi } from 'vitest';
import { runGoalSyntheticReachability } from '../../../../scripts/bots/goal-synthetic-reachability';
import {
  assessGoalExactFill,
  createGoalExactLedger,
  GOAL_EXACT_KUSD,
  GOAL_EXACT_XOR,
} from '@/features/bot-trading/goal-exact-ledger';

vi.unmock('@polkadot/util-crypto');
let report: ReturnType<typeof runGoalSyntheticReachability>;
beforeAll(() => {
  const network = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
    throw Error('network forbidden');
  });
  try {
    report = runGoalSyntheticReachability();
    expect(network).not.toHaveBeenCalled();
  } finally {
    network.mockRestore();
  }
}, 60000);
const policy = (id: string, name = 'partial-target') =>
  report.cases.find((c) => c.scenario.id === id)!.policies.find((p) => p.policy === name)!;
const sign = (value: { numerator: string }) => BigInt(value.numerator);

describe('synthetic exact-goal reachability, without qualification', () => {
  it('preserves actual lot sizes and identifies all evidence as invented engineering input', () => {
    expect(report.cases).toHaveLength(10);
    expect(report).toMatchObject({
      engineeringOnly: true,
      qualificationEligible: false,
      realDataRead: false,
      networkAttempts: 0,
      initialKusdCodec: '10000000000000000000',
      protectedInitialXorCodec: '1000000000000000000',
      buyLotCodec: '5000000000000000000',
      sellLotCodec: '1000000000000000000',
    });
    expect(Object.isFrozen(report.cases[0].policies[0].events)).toBe(true);
  });

  it('uses real delayed-entry predicates and shows flat-market costs, not invented profit', () => {
    expect(policy('flat', 'passive').fills).toBe(0);
    expect(policy('flat', 'delayed-entry').firstProposalMinute).toBeNull();
    const partial = policy('flat');
    expect(partial).toMatchObject({
      firstDecisionMinute: 1,
      firstFillMinute: 1,
      fills: 1,
      feesPaidCodec: '10000000000000000',
      holdings: { kusdCodec: '5000000000000000000', xorCodec: '5965000000000000000' },
    });
    expect(sign(partial.excessOverPassive)).toBeLessThan(0n);
  });

  it('distinguishes reduced exposure from guaranteed profit and preserves both target and loss latches', () => {
    expect(policy('xor-strengthens', 'passive').outcome).toBe('loss');
    expect(policy('xor-weakens', 'passive').outcome).toBe('target');
    const protectedCase = policy('xor-strengthens');
    expect(protectedCase.outcome).toBe('expired');
    expect(sign(protectedCase.excessOverPassive)).toBeGreaterThan(0n);
    expect(BigInt(protectedCase.endingValue.numerator)).toBeLessThan(
      11n * 10n ** 18n * BigInt(protectedCase.endingValue.denominator)
    );
    expect(sign(policy('xor-weakens').excessOverPassive)).toBeLessThan(0n);
  });

  it.each(['jump-before-decision', 'publication-delay'])('reports %s as infeasible before the first decision', (id) => {
    for (const result of report.cases.find((c) => c.scenario.id === id)!.policies) {
      expect(result.firstDecisionMinute).toBeNull();
      expect(result.firstFillMinute).toBeNull();
      expect(result.firstLatch!.minute).toBeLessThan(result.firstEligibleMinute);
      expect(result.firstLatch!.outcome).toBe('loss');
    }
  });

  it('requires strict success and fee-only failure headroom at the exact boundary', () => {
    const failure = policy('failure-headroom-boundary').events.find((e) => e.kind === 'proposal')!;
    expect(failure).toMatchObject({
      reason: 'goal-trade-cost',
      failureInsideHeadroom: false,
      successInsideHeadroom: false,
    });
    const success = policy('success-headroom-boundary').events.find((e) => e.kind === 'proposal')!;
    expect(success).toMatchObject({
      reason: 'goal-trade-cost',
      failureInsideHeadroom: true,
      successInsideHeadroom: false,
    });
    expect(policy('inside-headroom-boundary').firstFillMinute).toBe(1);
  });

  it('charges a failed transaction without inventing a fill or losing the remaining reserve', () => {
    const result = policy('fee-only-failure');
    expect(result).toMatchObject({
      failures: 1,
      fills: 1,
      firstProposalMinute: 1,
      firstFillMinute: 61,
      feesPaidCodec: '20000000000000000',
    });
    expect(result.events.find((e) => e.kind === 'proposal')).toMatchObject({
      success: false,
      reason: 'synthetic-fee-only-failure',
    });
    expect(result.holdings.xorCodec).toBe('5955000000000000000');
  });

  it('never swaps the complete input, spends the fee reserve, or submits after a latch', () => {
    for (const scenario of report.cases)
      for (const result of scenario.policies) {
        expect(BigInt(result.holdings.xorCodec)).toBeGreaterThanOrEqual(10n ** 18n - BigInt(result.feesPaidCodec));
        for (const event of result.events.filter((e) => e.kind === 'proposal' && e.inputCodec)) {
          expect(BigInt(event.inputCodec!)).toBeLessThan(10n * 10n ** 18n);
          expect(BigInt(event.inputCodec!)).toBeLessThanOrEqual(event.action === 'buy' ? 5n * 10n ** 18n : 10n ** 18n);
          if (event.success !== undefined) {
            expect(event.successInsideHeadroom && event.failureInsideHeadroom).toBe(true);
            expect(event.minute).toBeLessThanOrEqual(result.firstLatch!.minute);
          }
        }
      }
    const mark = {
      blockHash: '0x' + '1'.repeat(64),
      blockNumber: 1,
      timestampMs: 1,
      denominator: '1',
      kusdReserveCodec: '100000000000000000000',
      xorReserveCodec: '100000000000000000000',
    };
    const initial = createGoalExactLedger(
      {
        goalId: 'synthetic-reserve',
        startedAtMs: 1,
        initialKusdCodec: report.initialKusdCodec,
        maxTradeKusdCodec: report.buyLotCodec,
        maxTradeXorCodec: report.sellLotCodec,
      },
      mark
    );
    expect(
      assessGoalExactFill(initial, {
        expectedRevision: 0,
        accountingAtMs: 1,
        mark,
        fill: {
          inputAsset: GOAL_EXACT_XOR,
          outputAsset: GOAL_EXACT_KUSD,
          inputCodec: report.sellLotCodec,
          minimumOutputCodec: '995000000000000000',
          feeCeilingCodec: '10000000000000000',
        },
      }).rejection
    ).toBe('balance');
  });
});
