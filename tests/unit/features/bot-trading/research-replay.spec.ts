import { describe, expect, it } from 'vitest';
import { XOR, VAL } from '@/lib/substrate/sdk/assets/consts';
import { FPNumber } from '@/lib/substrate/math';
import { portfolioPerformance } from '@/features/bot-trading/engine';
import {
  RESEARCH_DEFAULT_SETTINGS,
  runResearch,
  type ResearchResult,
  type ResearchSettings,
  type ResearchSource,
} from '@/features/bot-trading/research';
import { createResearchReplay } from '@/features/bot-trading/research-replay';
import type { BotAsset } from '@/features/bot-trading/types';

const NOW = Date.UTC(2026, 8, 14, 12);
const HOUR = 3_600_000;
const assets: BotAsset[] = [XOR, VAL].map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));

/** Fabricated test prices mock the verified provider boundary for isolated arithmetic checks. */
function source(prices: string[]): ResearchSource {
  return {
    kind: 'historical',
    history: {
      candles: prices.map((close, index) => ({
        close,
        feeClose: '1',
        timestamp: NOW - (prices.length - index) * HOUR,
      })),
      missing: 0,
      denominationVerified: true,
    },
  };
}

/** Build an engine result from test fixtures before specializing accounting evidence. */
function research(prices: string[], settings: Partial<ResearchSettings> = {}): ResearchResult {
  return runResearch(
    {
      ...RESEARCH_DEFAULT_SETTINGS,
      historyStartAt: undefined,
      validation: 'none',
      intervalHours: 1,
      networkFeeXor: '0.1',
      swapFeePercent: '0.6',
      sellNetworkFeeXor: '0.1',
      sellSwapFeePercent: '0.6',
      ...settings,
    },
    assets,
    source(prices),
    NOW
  );
}

/** All attribution categories with sub-base-unit evidence at the supported 36-place precision. */
function mixedResearch(): ResearchResult {
  const result = research(['1', '2', '3', '4', '5', '6']);
  const pnl = [
    '0.100000000000000000000000000000000001',
    '0.2',
    '-0.030000000000000000000000000000000003',
    '-0.04',
    '0',
  ];
  result.candidates = result.candidates.map((candidate, index) => ({
    ...candidate,
    selected: index === 0 || index === 2,
    action: index === 2 ? 'sell' : 'buy',
    pnl: pnl[index],
    costs:
      index === 0
        ? { networkFeeXor: '0.000000000000000001', networkFeeInCapital: '0.03', swapFeeInCapital: '0.2' }
        : index === 2
          ? { networkFeeXor: '0.000000000000000002', networkFeeInCapital: '0.07', swapFeeInCapital: '0.4' }
          : { networkFeeXor: '100', networkFeeInCapital: '300', swapFeeInCapital: '400' },
  }));
  const values = ['100', '100', '100.1', '101', '99.7', '99.8', '102'];
  result.result.equity = result.result.equity.map((point, index) => ({ ...point, value: values[index] }));
  result.result.returnPercent = '2';
  result.summary = {
    selectedProfit: '0.069999999999999999999999999999999998',
    excludedProfit: '0.16',
    missedProfit: '0.2',
    avoidedLoss: '0.04',
    selectedCount: 2,
    excludedCount: 3,
  };
  result.costs = { networkFeeXor: '0.000000000000000003', networkFeeInCapital: '0.1', swapFeeInCapital: '0.6' };
  return result;
}

describe('research replay accounting', () => {
  it('starts at the opening allocation and advances signed attribution and paid fees only when each ball lands', () => {
    const result = mixedResearch();
    const snapshots = createResearchReplay(result);
    expect(snapshots).toHaveLength(result.candidates.length + 1);
    expect(snapshots[0]).toEqual({
      landedCount: 0,
      timestamp: result.result.equity[0].timestamp,
      equityIndex: 0,
      equityValue: '100',
      returnPercent: '0',
      selectedProfit: '0',
      excludedProfit: '0',
      missedProfit: '0',
      avoidedLoss: '0',
      selectedCount: 0,
      excludedCount: 0,
      networkFeeXor: '0',
      networkFeeInCapital: '0',
      swapFeeInCapital: '0',
    });
    expect(snapshots[1]).toMatchObject({
      selectedProfit: '0.100000000000000000000000000000000001',
      selectedCount: 1,
      excludedCount: 0,
      missedProfit: '0',
      avoidedLoss: '0',
      networkFeeXor: '0.000000000000000001',
      networkFeeInCapital: '0.03',
      swapFeeInCapital: '0.2',
    });
    expect(snapshots[2]).toMatchObject({
      selectedProfit: snapshots[1].selectedProfit,
      excludedProfit: '0.2',
      missedProfit: '0.2',
      avoidedLoss: '0',
      selectedCount: 1,
      excludedCount: 1,
      networkFeeXor: snapshots[1].networkFeeXor,
      networkFeeInCapital: snapshots[1].networkFeeInCapital,
      swapFeeInCapital: snapshots[1].swapFeeInCapital,
    });
    expect(snapshots[3]).toMatchObject({
      selectedProfit: '0.069999999999999999999999999999999998',
      selectedCount: 2,
      excludedCount: 1,
      networkFeeXor: '0.000000000000000003',
      networkFeeInCapital: '0.1',
      swapFeeInCapital: '0.6',
    });
    expect(snapshots[4]).toMatchObject({
      selectedProfit: snapshots[3].selectedProfit,
      excludedProfit: '0.16',
      missedProfit: '0.2',
      avoidedLoss: '0.04',
      selectedCount: 2,
      excludedCount: 2,
    });
    expect(snapshots.at(-1)).toMatchObject({ ...result.summary, ...result.costs, returnPercent: '2' });
  });

  it('maps every landed execution, including exclusions, to its actual equity without looking ahead', () => {
    const result = mixedResearch();
    const snapshots = createResearchReplay(result);
    expect(snapshots.map(({ equityIndex }) => equityIndex)).toEqual([0, 2, 3, 4, 5, 6]);
    expect(snapshots.map(({ equityValue }) => equityValue)).toEqual(['100', '100.1', '101', '99.7', '99.8', '102']);
    expect(snapshots.map(({ returnPercent }) => returnPercent)).toEqual(['0', '0.1', '1', '-0.3', '-0.2', '2']);
    expect(snapshots.slice(1).map(({ timestamp }) => timestamp)).toEqual(
      result.candidates.map(({ timestamp }) => timestamp)
    );
    expect(snapshots[3].returnPercent).not.toBe(snapshots[3].selectedProfit);
  });

  it('supports scrubbing backward, resetting, and replaying without accumulating totals or mutating research', () => {
    const result = mixedResearch();
    const original = JSON.stringify(result);
    const snapshots = createResearchReplay(result);
    const originalSnapshots = JSON.stringify(snapshots);
    const counts = [5, 2, 0, 4, 1, 5, 0];
    expect(counts.map((count) => snapshots[count].landedCount)).toEqual(counts);
    expect(counts.map((count) => snapshots[count].selectedCount)).toEqual([2, 1, 0, 2, 1, 2, 0]);
    expect(JSON.stringify(snapshots)).toBe(originalSnapshots);
    expect(JSON.stringify(result)).toBe(original);
    expect(createResearchReplay(result)).toEqual(snapshots);
  });

  it('keeps revalued external XOR reserves in chronological return and charges only landed fills', () => {
    const other: BotAsset = { address: `0x${'a'.repeat(64)}`, symbol: 'OTHER', decimals: 18 };
    const market = source(['2', '2', '2']);
    market.history.candles.forEach((candle, index) => {
      candle.feeClose = String(index + 2);
    });
    const result = runResearch(
      {
        ...RESEARCH_DEFAULT_SETTINGS,
        historyStartAt: undefined,
        validation: 'none',
        intervalHours: 1,
        assetInAddress: VAL.address,
        assetOutAddress: other.address,
        networkFeeXor: '0.1',
        swapFeePercent: '0.6',
        sellNetworkFeeXor: '0.1',
        sellSwapFeePercent: '0.6',
      },
      [...assets, other],
      market,
      NOW
    );
    const snapshots = createResearchReplay(result);
    expect(snapshots[0].equityValue).toBe('102');
    expect(snapshots[1]).toMatchObject({
      equityValue: '102.5903',
      selectedProfit: '-0.5097',
      networkFeeXor: '0.1',
      networkFeeInCapital: '0.3',
      swapFeeInCapital: '0.0597',
    });
    expect(new FPNumber(snapshots[1].returnPercent).gt(new FPNumber('0'))).toBe(true);
    expect(snapshots[1].returnPercent).toBe(portfolioPerformance(result.result.equity.slice(0, 3)).returnPercent);
    expect(snapshots[2]).toMatchObject({
      ...result.summary,
      ...result.costs,
      returnPercent: result.result.returnPercent,
      equityValue: result.result.equity.at(-1)!.value,
      equityIndex: result.result.equity.length - 1,
    });
  });

  it('agrees with simulated buy and sell portfolio history without treating sell attribution as cumulative return', () => {
    const result = research(['1', '2', '3', '2', '1', '2', '3', '4', '3', '2', '1'], {
      preset: 'sma',
      capital: '200',
      sellNetworkFeeXor: '0.3',
      sellSwapFeePercent: '2',
      fastWindow: 2,
      slowWindow: 3,
    });
    const snapshots = createResearchReplay(result);
    const selectedSellIndex = result.candidates.findIndex(
      (candidate) => candidate.selected && candidate.action === 'sell'
    );
    expect(selectedSellIndex).toBeGreaterThanOrEqual(0);
    for (const snapshot of snapshots) {
      expect(snapshot.returnPercent).toBe(
        portfolioPerformance(result.result.equity.slice(0, snapshot.equityIndex + 1)).returnPercent
      );
    }
    expect(snapshots[selectedSellIndex + 1].returnPercent).not.toBe(snapshots[selectedSellIndex + 1].selectedProfit);
    expect(snapshots.at(-1)).toMatchObject({
      ...result.summary,
      ...result.costs,
      returnPercent: result.result.returnPercent,
    });
  });

  it('handles an empty candidate or equity series with a safe opening snapshot', () => {
    const result = research(['1', '2']);
    result.candidates = [];
    expect(createResearchReplay(result)).toHaveLength(1);
    expect(createResearchReplay(result)[0]).toMatchObject({
      equityValue: result.result.equity[0].value,
      returnPercent: '0',
    });
    result.result.equity = [];
    expect(createResearchReplay(result)[0]).toMatchObject({
      landedCount: 0,
      timestamp: null,
      equityIndex: 0,
      equityValue: '0',
      returnPercent: '0',
      selectedCount: 0,
      excludedCount: 0,
      selectedProfit: '0',
      missedProfit: '0',
      avoidedLoss: '0',
      networkFeeXor: '0',
      swapFeeInCapital: '0',
    });
  });
});
