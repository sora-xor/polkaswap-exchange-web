import { describe, expect, it, vi } from 'vitest';
import {
  assertGoalResearchBinding,
  copyGoalResearchEvidence,
  createGoalResearchBinding,
  makeGoalEpisodeEvidence,
  summarizeGoalEpisodes,
  validateGoalResearchSnapshot,
  type GoalEpisodeEvidence,
  type GoalResearchEvidence,
  type GoalResearchSnapshot,
} from '@/features/bot-trading/goal-research';
import type { BacktestResult } from '@/features/bot-trading/types';
import { botFixture } from './fixtures';
import { goalHistoryFixture } from './goal-history.fixture';

vi.unmock('@polkadot/util-crypto');

const HOUR = 3_600_000,
  DAY = 24 * HOUR,
  START = Date.UTC(2026, 8, 1);
const fees = {
  networkFeeXor: '0.01',
  sellNetworkFeeXor: '0.02',
  swapFeePercent: '0.6',
  sellSwapFeePercent: '0.7',
  priceImpactPercent: '1',
  sellPriceImpactPercent: '2',
};

/** Synthetic arithmetic fixtures only; none of these rows are observations or executed trades. */
function fixture() {
  const bot = botFixture();
  bot.assetIn = { address: `0x${'1'.repeat(64)}`, symbol: 'KUSD', decimals: 2 };
  bot.assetOut = { address: `0x${'2'.repeat(64)}`, symbol: 'XOR', decimals: 2 };
  bot.policy.feeAsset = { ...bot.assetOut };
  bot.strategy.intervalMs = DAY;
  bot.policy.maxTradeCodec = { [bot.assetIn.address]: '100', [bot.assetOut.address]: '1000' };
  bot.portfolio.initial = { [bot.assetIn.address]: '10000', [bot.assetOut.address]: '100' };
  bot.portfolio.holdings = { ...bot.portfolio.initial };
  bot.goal = {
    title: 'Grow XOR',
    targetReturnPercent: '5',
    maxLossPercent: '5',
    durationMs: DAY,
    lossMetric: 'drawdown',
    valuationAsset: 'output',
  };
  const row = (startAt: number, positive: boolean): GoalEpisodeEvidence => ({
    startAt,
    endAt: startAt + DAY,
    initialValue: '100',
    finalValue: positive ? '101' : '100',
    heldFinalValue: '100',
    returnPercent: positive ? '1' : '0',
    drawdownPercent: positive ? '0.5' : '0',
    trades: positive ? 1 : 0,
    coverage: 1,
    outcome: 'expired',
  });
  const evidence: GoalResearchEvidence = {
    protocol: 'goal-episodes-v2',
    aggregation: 'mean-net-return',
    goal: { ...bot.goal },
    binding: createGoalResearchBinding(bot, fees),
    training: {
      startAt: START,
      endAt: START + 116 * HOUR,
      tailCandles: 20,
      episodes: Array.from({ length: 4 }, (_, i) => row(START + i * DAY, i === 0)),
    },
    validation: {
      startAt: START + 118 * HOUR,
      endAt: START + 167 * HOUR,
      tailCandles: 1,
      episodes: Array.from({ length: 2 }, (_, i) => row(START + (118 + i * 24) * HOUR, i === 0)),
    },
  };
  const all = summarizeGoalEpisodes([...evidence.training.episodes, ...evidence.validation.episodes]);
  const test = summarizeGoalEpisodes(evidence.validation.episodes);
  const snapshot: GoalResearchSnapshot = {
    version: 1,
    source: 'historical',
    testedAt: START + 168 * HOUR,
    startAt: START,
    endAt: START + 167 * HOUR,
    coverage: 1,
    validation: 'holdout',
    trainPercent: 70,
    folds: 2,
    optimized: true,
    returnPercent: all.returnPercent,
    drawdownPercent: all.drawdownPercent,
    trades: all.trades,
    valuationAsset: 'output',
    ...fees,
    qualification: {
      candidates: 3,
      startAt: evidence.validation.episodes[0].startAt,
      endAt: evidence.validation.episodes.at(-1)!.endAt,
      returnPercent: test.returnPercent,
      drawdownPercent: test.drawdownPercent,
      trades: test.trades,
      coverage: 1,
    },
    feeObservation: {
      blockNumber: 1,
      blockHash: `0x${'3'.repeat(64)}`,
      genesisHash: `0x${'4'.repeat(64)}`,
      endpoint: 'wss://test.example',
      queriedAt: START + 168 * HOUR,
      finalizedAt: START + 168 * HOUR,
      amountIn: '1',
      sellAmountIn: '1',
    },
    goalEpisodes: evidence,
  };
  return { bot, evidence, snapshot };
}

describe('goal episode evidence', () => {
  it('roundtrips v3 history without moving funded episode or validation boundaries', () => {
    const { bot, evidence, snapshot } = fixture();
    const history = goalHistoryFixture(bot, START - HOUR).history.goalHistory;
    const warmed: GoalResearchEvidence = { ...evidence, protocol: 'goal-episodes-v3', history };
    snapshot.goalEpisodes = warmed;
    bot.network = history.identity.genesisHash;
    expect(copyGoalResearchEvidence(warmed)).toEqual(warmed);
    const copied = validateGoalResearchSnapshot(snapshot)!;
    expect(copied).toEqual(warmed);
    expect(() => assertGoalResearchBinding(bot, copied)).not.toThrow();
    expect(warmed.training).toEqual(evidence.training);
    expect(warmed.validation).toEqual(evidence.validation);
  });
  it('never upgrades v2 evidence merely because a history field was attached', () => {
    const { bot, evidence } = fixture();
    const history = goalHistoryFixture(bot, START - HOUR).history.goalHistory;
    expect(copyGoalResearchEvidence({ ...evidence, history } as GoalResearchEvidence)).toEqual(evidence);
    expect(copyGoalResearchEvidence(evidence).protocol).toBe('goal-episodes-v2');
  });
  it.each(['missingHistory', 'asset', 'shiftedStudy', 'genesis', 'network', 'digest'])(
    'rejects v3 %s mismatch',
    (field) => {
      const { bot, evidence, snapshot } = fixture();
      const history = goalHistoryFixture(bot, START - HOUR).history.goalHistory;
      const warmed: GoalResearchEvidence = { ...evidence, protocol: 'goal-episodes-v3', history };
      bot.network = history.identity.genesisHash;
      if (field === 'missingHistory') Object.assign(warmed, { history: undefined });
      if (field === 'asset') warmed.binding.assetIn.symbol = 'OTHER';
      if (field === 'shiftedStudy') warmed.history = goalHistoryFixture(bot, START).history.goalHistory;
      if (field === 'genesis') snapshot.feeObservation!.genesisHash = `0x${'9'.repeat(64)}`;
      if (field === 'network') bot.network = `0x${'9'.repeat(64)}`;
      if (field === 'digest') warmed.history.commitmentSha256 = '0'.repeat(64);
      snapshot.goalEpisodes = warmed;
      expect(() => {
        const copied = validateGoalResearchSnapshot(snapshot)!;
        assertGoalResearchBinding(bot, copied);
      }).toThrow('bots.errors.config');
    }
  );
  it('keeps abstention episodes and uses a mean and worst episode drawdown without joining capital resets', () => {
    const { evidence } = fixture();
    expect(summarizeGoalEpisodes(evidence.training.episodes)).toEqual({
      returnPercent: '0.25',
      drawdownPercent: '0.5',
      trades: 1,
      coverage: 1,
      netChange: '0.25',
      excessChange: '0.25',
      excessReturnPercent: '0.25',
    });
    const rows = structuredClone(evidence.training.episodes);
    Object.assign(rows[1], { finalValue: '96', heldFinalValue: '96', returnPercent: '-4', drawdownPercent: '4' });
    expect(summarizeGoalEpisodes(rows)).toMatchObject({ returnPercent: '-0.75', drawdownPercent: '4', trades: 1 });
  });
  it('copies the exact protocol and binds it to the unchanged live allocation', () => {
    const { bot, evidence, snapshot } = fixture();
    const copied = validateGoalResearchSnapshot(snapshot)!;
    expect(copied).toEqual(evidence);
    expect(() => assertGoalResearchBinding(bot, copied)).not.toThrow();
    copied.training.episodes[0].finalValue = '999';
    expect(evidence.training.episodes[0].finalValue).toBe('101');
    expect(validateGoalResearchSnapshot({ ...snapshot, goalEpisodes: undefined })).toBeUndefined();
  });
  it('rejects v1 USD-derived episodes instead of silently upgrading their price basis', () => {
    const { evidence, snapshot } = fixture();
    Object.assign(evidence, { protocol: 'goal-episodes-v1' });
    expect(() => copyGoalResearchEvidence(evidence)).toThrow('bots.errors.config');
    expect(() => validateGoalResearchSnapshot(snapshot)).toThrow('bots.errors.config');
  });
  it.each([
    'goal',
    'capital',
    'reserve',
    'strategy',
    'outputLimit',
    'inputLimit',
    'slippage',
    'priceImpact',
    'initialOutput',
  ])('rejects changed live %s rather than reusing old qualification', (field) => {
    const { bot, evidence } = fixture();
    if (field === 'goal') bot.goal!.durationMs = 2 * DAY;
    if (field === 'capital') bot.portfolio.initial[bot.assetIn.address] = '9999';
    if (field === 'reserve') bot.policy.feeBudgetCodec = '101';
    if (field === 'strategy') bot.strategy.intervalMs = HOUR;
    if (field === 'outputLimit') bot.policy.maxTradeCodec[bot.assetOut.address] = '1001';
    if (field === 'inputLimit') bot.policy.maxTradeCodec[bot.assetIn.address] = '101';
    if (field === 'slippage') bot.policy.slippagePercent = '1';
    if (field === 'priceImpact') bot.policy.maxPriceImpactPercent = '2';
    if (field === 'initialOutput') bot.portfolio.initial[bot.assetOut.address] = '101';
    expect(() => assertGoalResearchBinding(bot, evidence)).toThrow('bots.errors.config');
  });
  it.each([
    'omittedIdle',
    'shiftedStart',
    'tail',
    'gap',
    'incomplete',
    'wrongReturn',
    'summary',
    'fees',
    'horizon',
    'noFeeProvenance',
    'feeAmount',
    'optimized',
    'sparseEpisodes',
    'understatedDrawdown',
    'idleValue',
  ])('rejects %s evidence', (field) => {
    const { snapshot } = fixture(),
      evidence = snapshot.goalEpisodes!;
    if (field === 'omittedIdle') evidence.training.episodes.pop();
    if (field === 'shiftedStart') evidence.training.episodes[0].startAt += HOUR;
    if (field === 'tail') evidence.training.tailCandles = 0;
    if (field === 'gap') evidence.validation.startAt += HOUR;
    if (field === 'incomplete') evidence.validation.episodes[0].coverage = 0.9;
    if (field === 'wrongReturn') evidence.training.episodes[0].returnPercent = '2';
    if (field === 'summary') snapshot.qualification!.returnPercent = '2';
    if (field === 'fees') snapshot.networkFeeXor = '0.001';
    if (field === 'horizon') evidence.goal.durationMs = 12 * HOUR;
    if (field === 'noFeeProvenance') delete snapshot.feeObservation;
    if (field === 'feeAmount') snapshot.feeObservation!.amountIn = '2';
    if (field === 'optimized') snapshot.optimized = false;
    if (field === 'sparseEpisodes') delete evidence.training.episodes[1];
    if (field === 'understatedDrawdown')
      Object.assign(evidence.training.episodes[0], { finalValue: '96', returnPercent: '-4', drawdownPercent: '1' });
    if (field === 'idleValue') evidence.training.episodes[1].heldFinalValue = '99';
    expect(() => validateGoalResearchSnapshot(snapshot)).toThrow('bots.errors.config');
  });
  it('does not qualify positive returns caused only by idle asset appreciation', () => {
    const { snapshot } = fixture();
    snapshot.goalEpisodes!.validation.episodes[0].heldFinalValue = '102';
    expect(() => validateGoalResearchSnapshot(snapshot)).toThrow('bots.errors.config');
  });
  it('rejects positive mean percentages when independently funded days lose net XOR units', () => {
    const { snapshot } = fixture();
    const rows = snapshot.goalEpisodes!.validation.episodes;
    Object.assign(rows[0], { initialValue: '2', finalValue: '2.04', heldFinalValue: '2', returnPercent: '2' });
    Object.assign(rows[1], {
      initialValue: '3',
      finalValue: '2.955',
      heldFinalValue: '3',
      returnPercent: '-1.5',
      drawdownPercent: '1.5',
      trades: 1,
    });
    const test = summarizeGoalEpisodes(rows);
    expect(test).toMatchObject({
      returnPercent: '0.25',
      excessReturnPercent: '0.25',
      netChange: '-0.0025',
      excessChange: '-0.0025',
    });
    const all = summarizeGoalEpisodes([...snapshot.goalEpisodes!.training.episodes, ...rows]);
    Object.assign(snapshot, {
      returnPercent: all.returnPercent,
      drawdownPercent: all.drawdownPercent,
      trades: all.trades,
    });
    Object.assign(snapshot.qualification!, {
      returnPercent: test.returnPercent,
      drawdownPercent: test.drawdownPercent,
      trades: test.trades,
    });
    expect(() => validateGoalResearchSnapshot(snapshot)).toThrow('bots.errors.config');
  });
  it('extracts final marked values after a latched goal without inventing a liquidation', () => {
    const result = {
      equity: [
        { timestamp: START - 1, value: '100', benchmark: '100' },
        { timestamp: START + DAY, value: '97', benchmark: '96' },
      ],
      drawdownPercent: '4',
      trades: 1,
      coverage: 1,
    } as BacktestResult;
    expect(makeGoalEpisodeEvidence(result, START, START + DAY, 'target')).toMatchObject({
      outcome: 'target',
      finalValue: '97',
      heldFinalValue: '96',
      returnPercent: '-3',
    });
    expect(() => makeGoalEpisodeEvidence(result, START, START + DAY + HOUR, 'target')).toThrow();
  });
  it('rejects accessors without invoking them', () => {
    const { evidence } = fixture();
    let calls = 0;
    Object.defineProperty(evidence.training.episodes[0], 'finalValue', {
      get() {
        calls++;
        return '101';
      },
    });
    expect(() => copyGoalResearchEvidence(evidence)).toThrow();
    expect(calls).toBe(0);
  });
  it.each(['goalEpisodes', 'qualification', 'feeObservation'])(
    'rejects a snapshot %s accessor before reading it',
    (field) => {
      const { snapshot } = fixture();
      let calls = 0;
      Object.defineProperty(snapshot, field, {
        get() {
          calls++;
          return undefined;
        },
      });
      expect(() => validateGoalResearchSnapshot(snapshot)).toThrow('bots.errors.config');
      expect(calls).toBe(0);
    }
  );
  it('rejects sparse aggregate input instead of silently omitting an episode', () => {
    const { evidence } = fixture();
    delete evidence.training.episodes[1];
    expect(() => summarizeGoalEpisodes(evidence.training.episodes)).toThrow('bots.errors.config');
  });
});
