import { describe, expect, it } from 'vitest';
import {
  commonDecisionEndpoint,
  decisionKind,
  decisionsInBin,
  decisionsInView,
  formatDecisionCheckValue,
  summarizeDecisionKinds,
  tradeFlowForView,
} from '@/features/bot-trading/decision-inspection';
import { summarizeResultDistribution } from '@/features/bot-trading/result-insights';
import type { DistributionTrade } from '@/features/bot-trading/tradeDistribution';
import {
  FLOW_PLOT_BOTTOM,
  FLOW_PLOT_TOP,
  flowLandingPosition,
  layoutTradeFlow,
} from '@/features/bot-trading/trade-flow';

const decisions: DistributionTrade[] = [
  {
    id: 'taken',
    timestamp: 1,
    endTimestamp: 2000,
    pnl: '1',
    selected: true,
    checks: [{ key: 'signal', passed: true }],
  },
  {
    id: 'no-signal',
    timestamp: 2,
    endTimestamp: 2000,
    pnl: '2',
    selected: false,
    checks: [
      { key: 'signal', passed: false },
      { key: 'balance', passed: false },
    ],
  },
  {
    id: 'blocked',
    timestamp: 3,
    endTimestamp: 2000,
    pnl: '1',
    selected: false,
    checks: [
      { key: 'signal', passed: true },
      { key: 'balance', passed: false },
    ],
  },
  { id: 'unknown', timestamp: 4, pnl: 'NaN', selected: false, checks: [] },
];

describe('recorded decision explanations', () => {
  it('separates no signal from blocked orders and keeps every record in exactly one category', () => {
    expect(decisions.map(decisionKind)).toEqual(['taken', 'noSignal', 'blocked', 'unknown']);
    expect(summarizeDecisionKinds(decisions)).toEqual({ checked: 4, taken: 1, noSignal: 1, blocked: 1, unknown: 1 });
    expect(decisionKind({ ...decisions[1], selected: true })).toBe('taken');
  });

  it('uses the selected cohort for navigation and bin readouts without changing shared bins', () => {
    expect(decisionsInView(decisions, 'selected').map(({ id }) => id)).toEqual(['taken']);
    expect(decisionsInView(decisions, 'excluded').map(({ id }) => id)).toEqual(['no-signal', 'blocked', 'unknown']);
    expect(decisionsInView(decisions, 'all')).toEqual(decisions);
    const bin = summarizeResultDistribution(decisions).bins.find(({ count }) => count === 2)!;
    expect([decisionsInBin(bin, 'all'), decisionsInBin(bin, 'selected'), decisionsInBin(bin, 'excluded')]).toEqual([
      2, 1, 1,
    ]);
    expect(bin.count).toBe(2);
  });

  it('never invents a common outcome date for mixed or invalid records', () => {
    expect(commonDecisionEndpoint(decisions)).toBe(2000);
    expect(commonDecisionEndpoint([])).toBeUndefined();
    expect(commonDecisionEndpoint([{ ...decisions[0], endTimestamp: NaN }])).toBeUndefined();
    expect(commonDecisionEndpoint([decisions[0], { ...decisions[1], endTimestamp: 3000 }])).toBeUndefined();
  });

  it('keeps sparse taken outcomes visible and exact when the comparison contains thousands of skipped checks', () => {
    const records = [
      decisions[0],
      ...Array.from({ length: 4000 }, (_, index) => ({ ...decisions[2], id: `skip-${index}` })),
    ];
    const insights = summarizeResultDistribution(records);
    const original = layoutTradeFlow(records, insights);
    const taken = tradeFlowForView(original, insights, 'selected');
    const skipped = tradeFlowForView(original, insights, 'excluded');
    expect(original.countMaximum).toBe(4004);
    expect(taken.countMaximum).toBe(4);
    expect(taken.particles[0].y).toBe(FLOW_PLOT_BOTTOM - (FLOW_PLOT_BOTTOM - FLOW_PLOT_TOP) / 8);
    expect(taken.particles[0].x).toBe(original.particles[0].x);
    expect(taken.particles.map(({ binIndex }) => binIndex)).toEqual(original.particles.map(({ binIndex }) => binIndex));
    const landed = flowLandingPosition(skipped.particles[1], 1, skipped, 0, 'excluded');
    expect(landed.y).toBeLessThan(FLOW_PLOT_BOTTOM);
    expect(landed.y).toBeGreaterThan(FLOW_PLOT_TOP);
    expect(tradeFlowForView(original, insights, 'all')).toBe(original);
    expect(original.countMaximum).toBe(4004);
  });

  it('decodes precise external fee and token amounts using the recorded asset instead of the trading pair', () => {
    const assets = [
      { address: 'xor', decimals: 18, symbol: 'XOR' },
      { address: 'unit', decimals: 6, symbol: 'UNIT' },
    ];
    const check = { key: 'balance', passed: false, actual: '1', limit: '1000000000000000001', assetAddress: 'xor' };
    expect(formatDecisionCheckValue(check, 'actual', assets)).toBe('0.000000000000000001 XOR');
    expect(formatDecisionCheckValue(check, 'limit', assets)).toBe('1.000000000000000001 XOR');
    expect(formatDecisionCheckValue({ ...check, assetAddress: 'unit', actual: '1234567' }, 'actual', assets)).toBe(
      '1.234567 UNIT'
    );
    expect(formatDecisionCheckValue({ ...check, assetAddress: 'missing' }, 'actual', assets)).toBeUndefined();
    expect(formatDecisionCheckValue({ ...check, actual: '1e20' }, 'actual', assets)).toBeUndefined();
    expect(formatDecisionCheckValue({ ...check, actual: '-1' }, 'actual', assets)).toBeUndefined();
  });

  it('formats cooldown milliseconds as exact seconds and leaves the first-trade interval unrecorded', () => {
    expect(formatDecisionCheckValue({ key: 'cooldown', passed: true, actual: '6001' }, 'actual', [])).toBe('6.001 s');
    expect(formatDecisionCheckValue({ key: 'cooldown', passed: true }, 'actual', [])).toBeUndefined();
  });
});
