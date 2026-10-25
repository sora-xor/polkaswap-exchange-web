import { describe, expect, it } from 'vitest';
import { XOR, VAL } from '@/lib/substrate/sdk/assets/consts';
import { toCodec } from '@/features/bot-trading/amounts';
import { runBacktest } from '@/features/bot-trading/engine';
import { createResearchBot, RESEARCH_DEFAULT_SETTINGS, runResearch } from '@/features/bot-trading/research';
import type { ResearchSettings, ResearchSource } from '@/features/bot-trading/research';
import type { BacktestTrade, BotAsset, StrategyConfig } from '@/features/bot-trading/types';
import { botFixture } from './fixtures';

const NOW = Date.UTC(2026, 8, 19, 12);
const HOUR = 3_600_000;
const assets: BotAsset[] = [XOR, VAL].map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));
const rules: NonNullable<StrategyConfig['rules']> = {
  version: 1,
  entry: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'above' }] },
  exit: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'below' }] },
};

/** All prices, fees and impacts in this suite are explicit synthetic scenarios, never market evidence. */
const source = (prices: string[]): ResearchSource => ({
  kind: 'historical',
  history: {
    candles: prices.map((close, index) => ({ close, feeClose: '1', timestamp: NOW - (prices.length - index) * HOUR })),
    missing: 0,
    denominationVerified: true,
  },
});
const settings = (patch: Partial<ResearchSettings> = {}): ResearchSettings => ({
  ...RESEARCH_DEFAULT_SETTINGS,
  historyStartAt: undefined,
  validation: 'none',
  preset: 'dca',
  capital: '100',
  tradePercent: 10,
  intervalHours: 1,
  intervalBlocks: undefined,
  slippagePercent: '1',
  networkFeeXor: '0.1',
  swapFeePercent: '2',
  sellNetworkFeeXor: '0.2',
  sellSwapFeePercent: '3',
  ...patch,
});
const ruleStrategy = (config: ResearchSettings) => ({
  ...createResearchBot(config, assets, NOW).strategy,
  kind: 'rules' as const,
  rules: structuredClone(rules),
});

describe('directional price impact in exact replay', () => {
  it('multiplies slippage, route fees and impact once, floors to token precision, and prices exits separately', () => {
    const bot = botFixture();
    bot.strategy = { ...bot.strategy, kind: 'rules', amount: '10', intervalMs: HOUR, rules: structuredClone(rules) };
    const trades: BacktestTrade[] = [];
    const run = runBacktest(bot, source(['1', '2', '2', '1', '1']).history, {
      slippagePercent: '1',
      swapFeePercent: '2',
      sellSwapFeePercent: '3',
      priceImpactPercent: '20',
      sellPriceImpactPercent: '30',
      feeCodec: '1',
      sellFeeCodec: '2',
      onTrade: (trade) => trades.push({ ...trade }),
    });
    expect(trades.map((trade) => [trade.action, trade.inputCodec, trade.outputCodec, trade.feeCodec])).toEqual([
      ['buy', '1000', '388', '1'], // floor(10 / 2 × .99 × .98 × .8, 2) = 3.88
      ['sell', '388', '260', '2'], // floor(3.88 × 1 × .99 × .97 × .7, 2) = 2.60
    ]);
    expect(run.portfolio.holdings).toEqual({ in: '9257', out: '0' });
    expect(run.portfolio.feesPaidCodec).toBe('3');
  });

  it('agrees across both replay engines and attributes route fees plus impact without charging slippage twice', () => {
    const config = settings({ priceImpactPercent: '20', sellPriceImpactPercent: '30' });
    const market = source(['1', '2', '2', '1', '1']);
    const run = runResearch(config, assets, market, NOW, { strategy: ruleStrategy(config) });
    const trades: BacktestTrade[] = [];
    const shared = runBacktest(run.bot, market.history, {
      slippagePercent: '1',
      swapFeePercent: '2',
      sellSwapFeePercent: '3',
      priceImpactPercent: '20',
      sellPriceImpactPercent: '30',
      feeCodec: toCodec('0.1', 18),
      sellFeeCodec: toCodec('0.2', 18),
      onTrade: (trade) => trades.push({ ...trade }),
    });
    expect(run.result).toEqual(shared);
    expect(run.tradeMarkers).toEqual(trades);
    expect(trades.map((trade) => [trade.action, trade.outputCodec])).toEqual([
      ['buy', toCodec('3.8808', 18)],
      ['sell', toCodec('2.608712568', 18)],
    ]);
    expect(run.result.portfolio.holdings[VAL.address]).toBe('0');
    expect(run.costs).toEqual({ networkFeeXor: '0.3', networkFeeInCapital: '0.3', swapFeeInCapital: '3.371679432' });
    expect(
      run.candidates.filter((candidate) => candidate.selected).map((candidate) => candidate.costs.swapFeeInCapital)
    ).toEqual(['2.1384', '1.233279432']);
    expect(run.assumptions).toMatchObject({ priceImpactPercent: '20', sellPriceImpactPercent: '30' });
  });

  it('floors a fractional 18-decimal output instead of rounding it to the next base unit', () => {
    const config = settings({
      capital: '10',
      slippagePercent: '0.5',
      swapFeePercent: '0.6',
      priceImpactPercent: '1.38',
    });
    const market = source(['3', '3']);
    const run = runResearch(config, assets, market, NOW);
    expect(run.tradeMarkers).toHaveLength(1);
    expect(run.tradeMarkers[0].outputCodec).toBe('325127128666666666');
    const trades: BacktestTrade[] = [];
    runBacktest(run.bot, market.history, {
      slippagePercent: '0.5',
      swapFeePercent: '0.6',
      priceImpactPercent: '1.38',
      feeCodec: toCodec('0.1', 18),
      onTrade: (trade) => trades.push({ ...trade }),
    });
    expect(trades[0].outputCodec).toBe('325127128666666666');
  });

  it('preserves legacy results when optional impact scenarios are omitted or explicitly zero', () => {
    const market = source(['1', '2', '2', '1', '1']);
    const config = settings();
    const strategy = ruleStrategy(config);
    const legacy = runResearch(config, assets, market, NOW, { strategy });
    const zero = runResearch({ ...config, priceImpactPercent: '0', sellPriceImpactPercent: '0' }, assets, market, NOW, {
      strategy,
    });
    expect(zero.result).toEqual(legacy.result);
    expect(zero.costs).toEqual(legacy.costs);
    expect(zero.tradeMarkers).toEqual(legacy.tradeMarkers);
    const options = {
      slippagePercent: '1',
      swapFeePercent: '2',
      sellSwapFeePercent: '3',
      feeCodec: toCodec('0.1', 18),
    };
    expect(
      runBacktest(legacy.bot, market.history, { ...options, priceImpactPercent: '0', sellPriceImpactPercent: '0' })
    ).toEqual(runBacktest(legacy.bot, market.history, options));
  });

  it('does not silently reuse a buy impact as the reverse observation', () => {
    const config = settings({ priceImpactPercent: '20' });
    const market = source(['1', '2', '2', '1', '1']);
    const run = runResearch(config, assets, market, NOW, { strategy: ruleStrategy(config) });
    expect(run.tradeMarkers.map((trade) => trade.outputCodec)).toEqual([
      toCodec('3.8808', 18),
      toCodec('3.72673224', 18),
    ]);
    const trades: BacktestTrade[] = [];
    runBacktest(run.bot, market.history, {
      slippagePercent: '1',
      swapFeePercent: '2',
      sellSwapFeePercent: '3',
      priceImpactPercent: '20',
      feeCodec: toCodec('0.1', 18),
      onTrade: (trade) => trades.push({ ...trade }),
    });
    expect(trades.map((trade) => trade.outputCodec)).toEqual(run.tradeMarkers.map((trade) => trade.outputCodec));
  });

  it('applies the buy impact to the passive benchmark with the same protected reserve and cost attribution', () => {
    const config = settings({ validation: 'holdout', priceImpactPercent: '20', sellPriceImpactPercent: '30' });
    const run = runResearch(config, assets, source(Array(40).fill('2')), NOW);
    expect(run.validation.folds[0].testEvidence!.benchmark).toMatchObject({
      initialValue: '100',
      finalValue: '77.73984',
      trades: 1,
      costs: { networkFeeXor: '0.1', networkFeeInCapital: '0.1', swapFeeInCapital: '21.17016' },
    });
    const noImpact = runResearch({ ...config, priceImpactPercent: '0' }, assets, source(Array(40).fill('2')), NOW);
    expect(noImpact.validation.folds[0].testEvidence!.benchmark?.finalValue).toBe('96.9498');
  });

  it.each(['priceImpactPercent', 'sellPriceImpactPercent'] as const)(
    'rejects invalid %s before simulating either engine',
    (field) => {
      for (const invalid of ['-1', '100', '100.1', 'NaN', '1e1', '01', '', '0.0000000000000000001', null]) {
        const market = source(['2', '2']);
        const config = settings({ [field]: invalid as unknown as string });
        const bot = botFixture();
        expect(() => runResearch(config, assets, market, NOW), `${field}=${String(invalid)}`).toThrow();
        expect(
          () =>
            runBacktest(bot, market.history, {
              slippagePercent: '1',
              feeCodec: '0',
              [field]: invalid as unknown as string,
            }),
          `${field}=${String(invalid)}`
        ).toThrow();
      }
    }
  );
});
