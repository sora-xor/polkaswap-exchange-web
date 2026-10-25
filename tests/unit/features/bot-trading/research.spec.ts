import { describe, expect, it } from 'vitest';
import { XOR, VAL } from '@/lib/substrate/sdk/assets/consts';
import { FPNumber } from '@/lib/substrate/math';
import { toCodec } from '@/features/bot-trading/amounts';
import { decimalRatio, runBacktest } from '@/features/bot-trading/engine';
import {
  RESEARCH_DEFAULT_SETTINGS,
  createResearchBot,
  runResearch,
  type ResearchSettings,
  type ResearchSource,
  type ResearchProgress,
} from '@/features/bot-trading/research';
import { createMockHistoricalSource } from '../../../fixtures/bot-trading/mockHistory';
import type { BacktestTrade, BotAsset } from '@/features/bot-trading/types';

const NOW = Date.UTC(2026, 8, 14, 12);
const HOUR = 3_600_000;
const assets: BotAsset[] = [XOR, VAL].map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));
const settings = (patch: Partial<ResearchSettings> = {}): ResearchSettings => ({
  ...RESEARCH_DEFAULT_SETTINGS,
  historyStartAt: undefined,
  validation: 'none',
  intervalHours: 1,
  intervalBlocks: undefined,
  // These are explicit mock observations, not a production fee assumption.
  networkFeeXor: '0.1',
  swapFeePercent: '0',
  sellNetworkFeeXor: undefined,
  sellSwapFeePercent: undefined,
  ...patch,
});
/** Mock the provider boundary with explicit test prices, never real market evidence. */
const source = (prices: string[]): ResearchSource => ({
  kind: 'historical',
  history: {
    candles: prices.map((close, index) => ({ close, feeClose: '1', timestamp: NOW - (prices.length - index) * HOUR })),
    missing: 0,
    denominationVerified: true,
  },
});
const fp = (amount: string) => new FPNumber(amount, 36);

describe('bot research replay', () => {
  it('replays exact composed levels with next-close fills and the shared standalone accounting', () => {
    const input = settings({ preset: 'dca' });
    const strategy = createResearchBot(input, assets, NOW).strategy;
    strategy.kind = 'rules';
    strategy.rules = {
      version: 1,
      entry: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'above' }] },
      exit: { operator: 'any', conditions: [{ kind: 'trend', window: 2, direction: 'below' }] },
    };
    const observed = source(['1', '2', '3', '4', '2', '1', '2', '3', '4']);
    const run = runResearch(input, assets, observed, NOW, { strategy });
    const trades: BacktestTrade[] = [];
    const standard = runBacktest(run.bot, run.source.history, {
      slippagePercent: run.assumptions.slippagePercent,
      feeCodec: run.assumptions.feeCodec,
      swapFeePercent: run.assumptions.swapFeePercent,
      dataSource: 'historical',
      onTrade: (trade) => trades.push(trade),
    });
    expect(run.bot.strategy.rules).toEqual(strategy.rules);
    expect(run.bot.strategy.rules).not.toBe(strategy.rules);
    expect(run.result).toEqual(standard);
    expect(run.tradeMarkers).toEqual(trades);
    expect(trades.length).toBeGreaterThan(0);
    expect(
      run.candidates
        .filter((candidate) => candidate.selected)
        .every((candidate) => candidate.timestamp > candidate.signalTimestamp)
    ).toBe(true);
    expect(() => runResearch({ ...input, optimize: true }, assets, observed, NOW, { strategy })).toThrow(
      'bots.errors.config'
    );
  });

  it('uses only preceding rule warmup and resets portfolio and consumed observations in every validation fold', () => {
    const input = settings({ validation: 'walk-forward', folds: 3, trainPercent: 50 });
    const strategy = createResearchBot(input, assets, NOW).strategy;
    strategy.kind = 'rules';
    strategy.rules = {
      version: 1,
      entry: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'above' }] },
      exit: null,
    };
    const run = runResearch(input, assets, source(Array.from({ length: 80 }, (_, i) => String(i + 1))), NOW, {
      strategy,
    });
    expect(run.validation.folds).toHaveLength(3);
    for (const fold of run.validation.folds) {
      expect(fold.searchCount).toBe(1);
      expect(fold.testEvidence.warmupCandles).toBe(2);
      expect(fold.test.trades).toBeGreaterThan(0);
      expect(fold.test.equity[1].value).toBe(run.result.equity[0].value);
      expect(fold.test.equity[2].value).not.toBe(fold.test.equity[1].value);
    }
  });

  it.each(['dca', 'threshold', 'sma'] as const)('matches shared %s fills, exact portfolio and equity', (preset) => {
    const run = runResearch(settings({ preset }), assets, createMockHistoricalSource(NOW), NOW);
    const trades: BacktestTrade[] = [];
    const standard = runBacktest(run.bot, run.source.history, {
      slippagePercent: run.assumptions.slippagePercent,
      feeCodec: run.assumptions.feeCodec,
      swapFeePercent: run.assumptions.swapFeePercent,
      dataSource: 'historical',
      onTrade: (trade) => trades.push({ ...trade }),
    });
    expect(run.result).toEqual(standard);
    expect(run.tradeMarkers).toEqual(trades);
    expect(run.candidates.filter((trade) => trade.selected)).toHaveLength(trades.length);
    expect(run.candidates).toHaveLength(run.source.history.candles.length - 1);
    expect(run.candidates.every((trade) => trade.selected === trade.checks.every((check) => check.passed))).toBe(true);
  });

  it('shows every next-close opportunity, including exact missed winners and cooldown gates', () => {
    const input = settings({ intervalHours: 2 });
    const history = source(['2', '2', '3', '4']);
    const before = JSON.stringify({ input, history, assets });
    const run = runResearch(input, assets, history, NOW);
    expect(run.candidates).toHaveLength(3);
    expect(run.candidates.map((candidate) => candidate.selected)).toEqual([true, false, true]);
    expect(run.candidates[0]).toMatchObject({
      signalTimestamp: history.history.candles[0].timestamp,
      timestamp: history.history.candles[1].timestamp,
      price: '2',
      amount: '10',
      pnl: '9.8',
      endPrice: '4',
    });
    expect(run.candidates[1].checks.find((check) => check.key === 'cooldown')?.passed).toBe(false);
    expect(fp(run.summary.missedProfit).gt(fp('0'))).toBe(true);
    expect(run.summary.selectedProfit).toBe('9.65');
    expect(run.summary.selectedCount).toBe(2);
    expect(run.summary.excludedCount).toBe(1);
    expect(JSON.stringify({ input, history, assets })).toBe(before);
  });

  it('does not hide no-signal losses, and never uses hindsight to decide selection', () => {
    const history = source(['2', '3', '2', '1']);
    const run = runResearch(settings({ preset: 'threshold', thresholdPercent: 0 }), assets, history, NOW);
    expect(run.candidates.map((candidate) => candidate.selected)).toEqual([true, false, true]);
    expect(run.candidates[1]).toMatchObject({ action: 'buy', pnl: '-5.125', reason: 'bots.events.noSignal' });
    expect(run.candidates[1].checks[0]).toEqual({ key: 'signal', passed: false });
    expect(run.summary.avoidedLoss).toBe('5.125');
    expect(run.summary.missedProfit).toBe('0');
    const changed = structuredClone(history);
    changed.history.candles.at(-1)!.close = '100';
    const future = runResearch(settings({ preset: 'threshold', thresholdPercent: 0 }), assets, changed, NOW);
    expect(future.candidates.map(({ selected, checks, action }) => ({ selected, checks, action }))).toEqual(
      run.candidates.map(({ selected, checks, action }) => ({ selected, checks, action }))
    );
    expect(future.summary.missedProfit).not.toBe('0');
    expect(future.candidates[1].pnl).not.toBe(run.candidates[1].pnl);
  });

  it('exposes fee-reserve and cumulative fee-budget failures without borrowing proceeds', () => {
    const history = source(Array(8).fill('2'));
    const budget = runResearch(settings({ capital: '10', feeBudgetXor: '0.15' }), assets, history, NOW);
    expect(budget.result.trades).toBe(1);
    expect(budget.candidates[1].checks.find((check) => check.key === 'feeBudget')).toMatchObject({ passed: false });
    expect(budget.bot.policy.feeBudgetCodec).toBe(toCodec('0.15', XOR.decimals));
    const balance = runResearch(
      settings({ capital: '1', tradePercent: 50, feeBudgetXor: '0.5' }),
      assets,
      history,
      NOW
    );
    expect(balance.result.trades).toBe(1);
    expect(balance.candidates[1].checks.find((check) => check.key === 'balance')).toMatchObject({ passed: false });
    expect(balance.result.portfolio.holdings[XOR.address]).toBe(toCodec('0.4', XOR.decimals));
    expect(balance.candidates[1]).toMatchObject({ action: 'buy', selected: false, amount: '0.5' });
    expect(balance.tradeMarkers.map((trade) => trade.action)).toEqual(['buy']);
  });

  it('uses customized slippage in both persisted policy and displayed outcomes', () => {
    const run = runResearch(settings({ slippagePercent: '2' }), assets, source(['2', '2']), NOW);
    expect(run.bot.policy.slippagePercent).toBe('2');
    expect(run.assumptions.slippagePercent).toBe('2');
    expect(run.candidates[0].pnl).toBe('-0.3');
  });

  it('deducts pool fees and network XOR independently and exposes the net cost ledger', () => {
    const run = runResearch(
      settings({ swapFeePercent: '0.6', networkFeeXor: '0.001' }),
      assets,
      source(['2', '2']),
      NOW
    );
    expect(run.candidates[0].pnl).toBe('-0.1107');
    expect(run.costs).toEqual({ networkFeeXor: '0.001', networkFeeInCapital: '0.001', swapFeeInCapital: '0.0597' });
    expect(run.candidates[0].costs).toEqual(run.costs);
    expect(run.assumptions).toMatchObject({ networkFeeXor: '0.001', swapFeePercent: '0.6' });
    expect(run.result).toEqual(
      runBacktest(run.bot, run.source.history, {
        slippagePercent: '0.5',
        feeCodec: run.assumptions.feeCodec,
        swapFeePercent: '0.6',
      })
    );
  });

  it('uses each direction’s fee for every candidate, accepted fill, cost ledger and fee-budget gate', () => {
    const market = source(['1', '2', '3', '2', '1', '2', '3', '4', '3', '2', '1']);
    const config = settings({
      preset: 'sma',
      fastWindow: 2,
      slowWindow: 3,
      feeBudgetXor: '5',
      networkFeeXor: '0.1',
      swapFeePercent: '0',
      sellNetworkFeeXor: '0.3',
      sellSwapFeePercent: '2',
    });
    const run = runResearch(config, assets, market, NOW);
    expect(run.tradeMarkers.some((trade) => trade.action === 'buy')).toBe(true);
    expect(run.tradeMarkers.some((trade) => trade.action === 'sell')).toBe(true);
    for (const candidate of run.candidates)
      expect(candidate.costs.networkFeeXor).toBe(candidate.action === 'buy' ? '0.1' : '0.3');
    for (const trade of run.tradeMarkers)
      expect(trade.feeCodec).toBe(toCodec(trade.action === 'buy' ? '0.1' : '0.3', XOR.decimals));
    const buys = run.tradeMarkers.filter((trade) => trade.action === 'buy').length;
    const sells = run.tradeMarkers.length - buys;
    expect(run.costs.networkFeeXor).toBe(
      fp('0.1')
        .mul(fp(String(buys)))
        .add(fp('0.3').mul(fp(String(sells))))
        .toString()
    );
    expect(run.result).toEqual(
      runBacktest(run.bot, market.history, {
        slippagePercent: config.slippagePercent,
        feeCodec: toCodec('0.1', XOR.decimals),
        swapFeePercent: '0',
        sellFeeCodec: toCodec('0.3', XOR.decimals),
        sellSwapFeePercent: '2',
      })
    );
    expect(run.assumptions).toMatchObject({
      networkFeeXor: '0.1',
      sellNetworkFeeXor: '0.3',
      swapFeePercent: '0',
      sellSwapFeePercent: '2',
    });
    const limited = runResearch({ ...config, feeBudgetXor: '0.2' }, assets, market, NOW);
    expect(
      limited.candidates.some(
        (candidate) =>
          candidate.action === 'sell' &&
          !candidate.selected &&
          candidate.checks.some((check) => check.key === 'feeBudget' && !check.passed)
      )
    ).toBe(true);
  });

  it('values external XOR fees in the chosen capital token without floating point or fee double counting', () => {
    const other: BotAsset = { address: `0x${'a'.repeat(64)}`, symbol: 'OTHER', decimals: 18 };
    const market = source(['2', '2', '2']);
    market.history.candles.forEach((candle, index) => {
      candle.feeClose = String(index + 2);
    });
    const run = runResearch(
      settings({
        assetInAddress: VAL.address,
        assetOutAddress: other.address,
        networkFeeXor: '0.1',
        swapFeePercent: '0.6',
      }),
      [...assets, other],
      market,
      NOW
    );
    expect(run.bot.policy.feeAsset.address).toBe(XOR.address);
    expect(run.bot.portfolio.initial[XOR.address]).toBe(toCodec('1', XOR.decimals));
    expect(run.costs).toEqual({ networkFeeXor: '0.2', networkFeeInCapital: '0.7', swapFeeInCapital: '0.1194' });
    expect(run.candidates.map((candidate) => candidate.pnl)).toEqual(['-0.5097', '-0.5097']);
    expect(run.summary.selectedProfit).toBe('-1.0194');
    const last = run.result.equity.at(-1)!;
    expect(fp(last.value).sub(fp(last.benchmark)).toString()).toBe(run.summary.selectedProfit);
    expect(run.result.portfolio.holdings[XOR.address]).toBe(toCodec('0.8', XOR.decimals));
    expect(run.result).toEqual(
      runBacktest(run.bot, run.source.history, {
        slippagePercent: '0.5',
        feeCodec: run.assumptions.feeCodec,
        swapFeePercent: '0.6',
      })
    );
  });

  it('supports XOR as the output and refuses an unpriced separate fee reserve', () => {
    const market = source(['2', '2']);
    for (const candle of market.history.candles) delete candle.feeClose;
    const run = runResearch(
      settings({ assetInAddress: VAL.address, assetOutAddress: XOR.address }),
      assets,
      market,
      NOW
    );
    expect(run.candidates[0].pnl).toBe('-0.25');
    expect(run.costs.networkFeeInCapital).toBe('0.2');
    const other: BotAsset = { address: `0x${'a'.repeat(64)}`, symbol: 'OTHER', decimals: 18 };
    expect(() =>
      runResearch(
        settings({ assetInAddress: VAL.address, assetOutAddress: other.address }),
        [...assets, other],
        market,
        NOW
      )
    ).toThrow('bots.errors.history');
  });

  it('retains 36-decimal token precision through fills, fees, and attribution', () => {
    const other: BotAsset = { address: `0x${'a'.repeat(64)}`, symbol: 'OTHER', decimals: 36 };
    const precise = [{ ...assets[1], decimals: 36 }, other];
    const run = runResearch(
      settings({
        assetInAddress: VAL.address,
        assetOutAddress: other.address,
        capital: '1.000000000000000000000000000000000019',
        tradePercent: 10,
      }),
      precise,
      source(['1', '1']),
      NOW
    );
    expect(run.bot.strategy.amount).toBe('0.100000000000000000000000000000000001');
    expect(run.tradeMarkers[0].inputCodec).toBe('100000000000000000000000000000000001');
    expect(run.tradeMarkers[0].outputCodec).toBe('99500000000000000000000000000000000');
    expect(run.candidates[0].pnl).toBe('-0.100500000000000000000000000000000001');
  });

  it('handles sell crossovers and no-allocation rejections using real inventory', () => {
    const run = runResearch(
      settings({ preset: 'sma', fastWindow: 2, slowWindow: 3 }),
      assets,
      source(['1', '2', '3', '2', '1', '2', '3', '4', '3', '2', '1']),
      NOW
    );
    const rejectedSell = run.candidates.find((candidate) => candidate.reason === 'bots.events.noAllocation');
    expect(rejectedSell).toMatchObject({ action: 'sell', selected: false });
    expect(rejectedSell?.checks.find((check) => check.key === 'balance')?.passed).toBe(false);
    expect(run.candidates.some((candidate) => candidate.selected && candidate.action === 'sell')).toBe(true);
    expect(run.candidates.some((candidate) => candidate.reason === 'bots.events.warmup')).toBe(true);
  });

  it('defaults to March 1 2026 and leaves fees unavailable until observed', () => {
    expect(RESEARCH_DEFAULT_SETTINGS.historyStartAt).toBe(Date.UTC(2026, 2, 1));
    expect(RESEARCH_DEFAULT_SETTINGS.validation).toBe('walk-forward');
    expect(RESEARCH_DEFAULT_SETTINGS.folds).toBe(3);
    expect(RESEARCH_DEFAULT_SETTINGS.optimize).toBe(false);
    expect(RESEARCH_DEFAULT_SETTINGS.networkFeeXor).toBe('');
    expect(RESEARCH_DEFAULT_SETTINGS.swapFeePercent).toBe('');
    expect(RESEARCH_DEFAULT_SETTINGS.sellNetworkFeeXor).toBe('');
    expect(RESEARCH_DEFAULT_SETTINGS.sellSwapFeePercent).toBe('');
    for (const patch of [
      { networkFeeXor: '' },
      { swapFeePercent: '' },
      { sellNetworkFeeXor: '' },
      { sellSwapFeePercent: '' },
    ]) {
      expect(() => runResearch(settings(patch), assets, source(['2', '2']), NOW)).toThrow('bots.errors.amount');
    }
    const run = runResearch(settings(), assets, source(['2', '2']), NOW);
    expect(run.costs.networkFeeXor).toBe('0.1');
    expect(run.assumptions.feeCodec).toBe(toCodec('0.1', XOR.decimals));
  });

  it('requires explicit verified historical input and refuses demo or uploaded sources', () => {
    expect(() => runResearch(settings(), assets, undefined, NOW)).toThrow('bots.errors.history');
    for (const kind of ['demo', 'imported']) {
      const invalid = { ...source(['2', '3', '2']), kind } as unknown as ResearchSource;
      expect(() => runResearch(settings(), assets, invalid, NOW)).toThrow('bots.errors.history');
    }
    const invalid = source(['2', '3']);
    invalid.history.denominationVerified = false;
    expect(() => runResearch(settings(), assets, invalid, NOW)).toThrow('bots.errors.denomination');
  });

  it('rejects observations outside the requested historical window', () => {
    const history = source(['2', '3']);
    expect(() => runResearch(settings({ historyStartAt: NOW }), assets, history, NOW)).toThrow('bots.errors.history');
    expect(() => runResearch(settings({ historyEndAt: NOW - 2 * HOUR }), assets, history, NOW)).toThrow(
      'bots.errors.history'
    );
  });

  it('accepts verified partial history at its actual range and preserves missing coverage', () => {
    const history = source(['2', '3', '4']);
    const config = settings({ historyStartAt: NOW - 4 * HOUR, historyEndAt: NOW - HOUR });
    expect(runResearch(config, assets, history, NOW).source.history.candles).toEqual(history.history.candles);
    history.history.candles.shift();
    history.history.missing = 1;
    const partial = runResearch(config, assets, history, NOW);
    expect(partial.source.history.candles).toEqual(history.history.candles);
    expect(partial.source.history.candles[0].timestamp).toBe(NOW - 2 * HOUR);
    expect(partial.source.history.candles.at(-1)!.timestamp).toBe(config.historyEndAt);
    expect(partial.result.coverage).toBe(2 / 3);
  });

  it.each([
    { trainPercent: 49 },
    { trainPercent: 81 },
    { folds: 1 },
    { folds: 6 },
    { slippagePercent: '0' },
    { slippagePercent: '11' },
    { slippagePercent: 'NaN' },
    { feeBudgetXor: '0' },
    { feeBudgetXor: '1000000001' },
    { feeBudgetXor: '-1' },
    { networkFeeXor: '-1' },
    { networkFeeXor: '0.0000000000000000001' },
    { swapFeePercent: '-1' },
    { swapFeePercent: '11' },
    { validation: 'random' },
    { optimize: 'yes' },
  ])('rejects unsupported research controls %j', (patch) => {
    expect(() => runResearch(settings(patch as Partial<ResearchSettings>), assets, source(['2', '3']), NOW)).toThrow();
  });

  it('rejects duplicate, future, malformed or excessive observations before replay', () => {
    const duplicate = source(['2', '3']);
    duplicate.history.candles[1].timestamp = duplicate.history.candles[0].timestamp;
    expect(() => runResearch(settings(), assets, duplicate, NOW)).toThrow('bots.errors.history');
    const future = source(['2', '3']);
    future.history.candles[1].timestamp = NOW + 1;
    expect(() => runResearch(settings(), assets, future, NOW)).toThrow('bots.errors.history');
    expect(() => runResearch(settings(), assets, source(['2', '0']), NOW)).toThrow('bots.errors.history');
    expect(() => runResearch(settings(), assets, source(Array(10001).fill('2')), NOW)).toThrow('bots.errors.history');
  });
});

describe('chronological strategy validation', () => {
  it('purges one candle and freezes training-selected parameters before untouched holdout data', () => {
    const history = source(Array.from({ length: 40 }, (_, index) => String(1 + Math.floor(index / 4))));
    const config = settings({ validation: 'holdout', optimize: true, trainPercent: 70, intervalHours: 4 });
    const run = runResearch(config, assets, history, NOW);
    const fold = run.validation.folds[0];
    expect(run.validation).toMatchObject({ mode: 'holdout', purgeCandles: 1, tuned: true });
    expect(fold.trainEnd).toBe(history.history.candles[27].timestamp);
    expect(fold.testStart).toBe(history.history.candles[29].timestamp);
    expect(fold.testStart - fold.trainEnd).toBe(2 * HOUR);
    expect(fold.searchCount).toBe(3);
    expect(fold.train.equity.at(-1)?.timestamp).toBe(fold.trainEnd);
    expect(fold.test.equity[0].timestamp).toBe(fold.testStart - 1);
    expect(fold.test.equity[0].value).toBe('100');
    const changed = structuredClone(history);
    for (const candle of changed.history.candles.slice(29)) candle.close = '0.001';
    const future = runResearch(config, assets, changed, NOW);
    expect(future.recommendedSettings).toEqual(run.recommendedSettings);
    expect(future.validation.folds[0].train).toEqual(fold.train);
    expect(future.validation.folds[0].test).not.toEqual(fold.test);
    expect(run.settings).toEqual(config);
  });

  it('keeps absolute threshold anchored to training prices when test prices shift', () => {
    const history = source([...Array(15).fill('2'), ...Array(15).fill('4')]);
    const run = runResearch(
      settings({ preset: 'threshold', thresholdPercent: 0, validation: 'holdout', trainPercent: 50 }),
      assets,
      history,
      NOW
    );
    expect(run.validation.folds[0].train.trades).toBeGreaterThan(0);
    expect(run.validation.folds[0].test.trades).toBe(0);
    expect(run.validation.folds[0].test.returnPercent).toBe('0');
  });

  it('initializes test SMA from past observations without carrying training fills or using future prices', () => {
    const market = source(['6', '5', '4', '3', '2', '1', '1', '3', '4', '5', '6', '7']);
    const config = settings({ preset: 'sma', fastWindow: 2, slowWindow: 3, validation: 'holdout', trainPercent: 50 });
    const checkpoints: ResearchProgress[] = [];
    const run = runResearch(config, assets, market, NOW, { onProgress: (progress) => checkpoints.push(progress) });
    const fold = run.validation.folds[0];
    const firstTest = checkpoints.flatMap((progress) => (progress.scope === 'test' ? progress.decisions : []))[0];
    expect(firstTest).toMatchObject({
      signalTimestamp: market.history.candles[7].timestamp,
      timestamp: market.history.candles[8].timestamp,
      selected: true,
      action: 'buy',
      reason: 'bots.events.crossover',
    });
    expect(fold.testEvidence).toMatchObject({ warmupCandles: 3, candleCount: 5, candidateCount: 4 });
    expect(fold.test.equity[0].value).toBe('100');
    expect(fold.test.trades).toBe(1);
    expect(fold.test.portfolio.feesPaidCodec).toBe(toCodec('0.1', XOR.decimals));
    expect(fold.test.returnPercent).toBe('7.3125');
    const cold = runBacktest(
      run.bot,
      { ...market.history, candles: market.history.candles.slice(7) },
      {
        slippagePercent: config.slippagePercent,
        feeCodec: run.assumptions.feeCodec,
        swapFeePercent: config.swapFeePercent,
      }
    );
    expect(cold.trades).toBe(0);
    const changed = structuredClone(market);
    changed.history.candles.at(-1)!.close = '70';
    const future = runResearch(config, assets, changed, NOW);
    expect(future.validation.folds[0].train).toEqual(fold.train);
    expect(future.validation.folds[0].settings).toEqual(fold.settings);
    expect(future.validation.folds[0].test.equity.slice(0, 4)).toEqual(fold.test.equity.slice(0, 4));
    expect(future.validation.folds[0].test.returnPercent).not.toBe(fold.test.returnPercent);
  });

  it('retains the final training crossover through a zero-line purge without carrying its fills into the test', () => {
    const market = source(['1', '1', '1', '3', '3', '1', '5', '4', '6', '7', '8', '9']);
    const config = settings({ preset: 'sma', fastWindow: 2, slowWindow: 3, validation: 'holdout', trainPercent: 50 });
    const checkpoints: ResearchProgress[] = [];
    const run = runResearch(config, assets, market, NOW, { onProgress: (progress) => checkpoints.push(progress) });
    const fold = run.validation.folds[0];
    const decisions = checkpoints.flatMap((progress) => (progress.scope === 'test' ? progress.decisions : []));
    // The last training close moves below zero; the excluded close is exactly zero.
    // The first test close moves above zero, so only its next close may execute a buy.
    expect(decisions[0]).toMatchObject({
      signalTimestamp: market.history.candles[7].timestamp,
      timestamp: market.history.candles[8].timestamp,
      action: 'buy',
      reason: 'bots.events.crossover',
      selected: true,
    });
    expect(fold.test.trades).toBe(1);
    expect(fold.test.equity[0].value).toBe('100');
    expect(fold.test.equity[1].value).toBe('100');
    expect(fold.test.portfolio.feesPaidCodec).toBe(toCodec('0.1', XOR.decimals));
    expect(fold.train.equity.at(-1)!.timestamp).toBe(market.history.candles[5].timestamp);
    expect(decisions.every((decision) => decision.timestamp >= market.history.candles[8].timestamp)).toBe(true);
  });

  it('reports the excluded boundary and exact duration-normalized evidence for unequal train/test periods', () => {
    const market = source(Array.from({ length: 40 }, (_, index) => String(2 + (index % 7))));
    const run = runResearch(settings({ validation: 'holdout', optimize: true }), assets, market, NOW);
    const fold = run.validation.folds[0];
    expect(fold.selectionObjective).toBe('net-training-return');
    expect(fold.purge).toEqual({
      candleCount: 1,
      start: market.history.candles[28].timestamp,
      end: market.history.candles[28].timestamp,
    });
    expect(fold.trainEvidence).toMatchObject({
      candleCount: 28,
      candidateCount: 27,
      durationMs: 27 * HOUR,
      warmupCandles: 0,
    });
    expect(fold.testEvidence).toMatchObject({
      candleCount: 11,
      candidateCount: 10,
      durationMs: 10 * HOUR,
      warmupCandles: 0,
    });
    expect(fold.trainEvidence!.returnPerDayPercent).toBe(
      decimalRatio(fp(fold.train.returnPercent).mul(fp('24')), fp('27')).toString()
    );
    expect(fold.testEvidence!.returnPerDayPercent).toBe(fp(fold.test.returnPercent).mul(fp('2.4')).toString());
    expect(fold.testEvidence!.excessReturnPercent).toBe(
      fp(fold.test.returnPercent).sub(fp(fold.testEvidence!.benchmark!.returnPercent)).toString()
    );
  });

  it('compares passive buying after protecting the same reserve, with next-close slippage and observed fees', () => {
    const market = source(Array(40).fill('2'));
    market.history.candles[29].close = '200';
    const run = runResearch(settings({ validation: 'holdout', swapFeePercent: '1' }), assets, market, NOW);
    const benchmark = run.validation.folds[0].testEvidence!.benchmark;
    expect(benchmark).toEqual({
      trades: 1,
      initialValue: '100',
      finalValue: '98.41995',
      returnPercent: '-1.58005',
      drawdownPercent: '1.58005',
      costs: { networkFeeXor: '0.1', networkFeeInCapital: '0.1', swapFeeInCapital: '0.98505' },
    });
    expect(run.bot.policy.maxTradeCodec[XOR.address]).toBe(toCodec('10', XOR.decimals));
    expect(run.bot.portfolio.trades).toBe(0);
    expect(run.bot.portfolio.feesPaidCodec).toBe('0');
  });

  it('values passive fee reserves in capital units and leaves unavailable passive entries explicit', () => {
    const other: BotAsset = { address: `0x${'a'.repeat(64)}`, symbol: 'OTHER', decimals: 18 };
    const market = source(Array(40).fill('2'));
    market.history.candles.forEach((candle) => {
      candle.feeClose = '3';
    });
    const run = runResearch(
      settings({
        assetInAddress: VAL.address,
        assetOutAddress: other.address,
        validation: 'holdout',
        swapFeePercent: '1',
      }),
      [...assets, other],
      market,
      NOW
    );
    expect(run.validation.folds[0].testEvidence!.benchmark).toMatchObject({
      initialValue: '103',
      finalValue: '101.205',
      trades: 1,
      costs: { networkFeeXor: '0.1', networkFeeInCapital: '0.3', swapFeeInCapital: '0.995' },
    });
    const impossible = runResearch(settings({ validation: 'holdout', networkFeeXor: '2' }), assets, market, NOW);
    expect(impossible.validation.folds[0].testEvidence).toMatchObject({ benchmark: null, excessReturnPercent: null });
  });

  it('expands training windows with disjoint walk-forward tests and independent capital', () => {
    const history = source(Array.from({ length: 60 }, (_, index) => String(1 + (index % 7))));
    const run = runResearch(
      settings({ validation: 'walk-forward', trainPercent: 50, folds: 3, optimize: true }),
      assets,
      history,
      NOW
    );
    const folds = run.validation.folds;
    expect(folds).toHaveLength(3);
    for (const fold of folds) {
      expect(fold.trainStart).toBe(history.history.candles[0].timestamp);
      expect(fold.testStart - fold.trainEnd).toBe(2 * HOUR);
      expect(fold.test.equity[0].value).toBe('100');
      expect(fold.searchCount).toBeLessThanOrEqual(3);
      expect(fold.testEnd).toBeLessThanOrEqual(history.history.candles.at(-1)!.timestamp);
    }
    expect(folds[1].trainEnd).toBeGreaterThan(folds[0].trainEnd);
    expect(folds[0].testEnd).toBeLessThan(folds[1].testStart);
    expect(folds[1].testEnd).toBeLessThan(folds[2].testStart);
    expect(run.recommendedSettings).toEqual(folds[2].settings);
  });

  it.each(['dca', 'threshold', 'sma'] as const)(
    'bounds %s training search, reports provenance, and keeps replay unchanged',
    (preset) => {
      const run = runResearch(
        settings({ preset, validation: 'holdout', optimize: true }),
        assets,
        createMockHistoricalSource(NOW),
        NOW
      );
      const untuned = runResearch(
        settings({ preset, validation: 'holdout', optimize: false }),
        assets,
        run.source,
        NOW
      );
      expect(run.validation.folds[0].searchCount).toBeGreaterThan(1);
      expect(run.validation.folds[0].searchCount).toBeLessThanOrEqual(3);
      expect(run.validation.folds[0].test.dataSource).toBe('historical');
      expect(run.result).toEqual(untuned.result);
      expect(run.candidates).toEqual(untuned.candidates);
      expect(untuned.validation.folds[0].searchCount).toBe(1);
    }
  );

  it('keeps direction-specific current fees in every chronological training and test fold', () => {
    const market = createMockHistoricalSource(NOW);
    const config = settings({
      preset: 'sma',
      fastWindow: 2,
      slowWindow: 3,
      validation: 'walk-forward',
      trainPercent: 50,
      folds: 3,
      feeBudgetXor: '5',
      sellNetworkFeeXor: '0.3',
      sellSwapFeePercent: '2',
    });
    const run = runResearch(config, assets, market, NOW);
    const fees = {
      slippagePercent: config.slippagePercent,
      feeCodec: toCodec('0.1', XOR.decimals),
      swapFeePercent: '0',
      sellFeeCodec: toCodec('0.3', XOR.decimals),
      sellSwapFeePercent: '2',
    };
    for (const fold of run.validation.folds) {
      expect(fold.settings).toMatchObject({ sellNetworkFeeXor: '0.3', sellSwapFeePercent: '2' });
      for (const phase of ['train', 'test'] as const) {
        const start = phase === 'train' ? fold.trainStart : fold.testStart;
        const end = phase === 'train' ? fold.trainEnd : fold.testEnd;
        expect(fold[phase]).toEqual(
          runBacktest(
            run.bot,
            {
              ...market.history,
              candles: market.history.candles.filter((candle) => candle.timestamp >= start && candle.timestamp <= end),
            },
            fees
          )
        );
      }
    }
  });

  it('does not silently optimize against the whole replay when validation is disabled', () => {
    const config = settings({ optimize: true });
    const run = runResearch(config, assets, createMockHistoricalSource(NOW), NOW);
    expect(run.validation.folds).toEqual([]);
    expect(run.validation.tuned).toBe(false);
    expect(run.recommendedSettings).toEqual(config);
  });

  it('refuses insufficient data for an honest split and retains source coverage', () => {
    expect(() => runResearch(settings({ validation: 'holdout' }), assets, source(['1', '2', '3']), NOW)).toThrow(
      'bots.errors.history'
    );
    const history = source(Array(30).fill('2'));
    history.history.missing = 30;
    const run = runResearch(settings({ validation: 'holdout' }), assets, history, NOW);
    expect(run.result.coverage).toBe(0.5);
    expect(run.validation.folds[0].test.dataSource).toBe('historical');
  });
});
