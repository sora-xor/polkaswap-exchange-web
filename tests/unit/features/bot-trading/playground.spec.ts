import { describe, expect, it } from 'vitest';
import { XOR, VAL } from '@/lib/substrate/sdk/assets/consts';
import { toCodec } from '@/features/bot-trading/amounts';
import {
  PLAYGROUND_DEFAULT_SETTINGS,
  createPlaygroundBot,
  runPlayground,
  type PlaygroundSettings,
  type PlaygroundSource,
} from '@/features/bot-trading/playground';
import { createMockHistoricalSource } from '../../../fixtures/bot-trading/mockHistory';
import type { BotAsset, BotHistory } from '@/features/bot-trading/types';
import { assertQuote } from '@/features/bot-trading/policy';
import type { AgentSwapQuote } from '@/features/agent-trading/types';

const NOW = Date.UTC(2026, 8, 14, 12);
const HOUR = 3_600_000;
const assets: BotAsset[] = [XOR, VAL].map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));
const settings = (patch: Partial<PlaygroundSettings> = {}): PlaygroundSettings => ({
  ...PLAYGROUND_DEFAULT_SETTINGS,
  historyStartAt: undefined,
  intervalBlocks: undefined,
  // Mock fee observations for isolated engine tests, not production network rates.
  networkFeeXor: '0.1',
  swapFeePercent: '0',
  sellNetworkFeeXor: undefined,
  sellSwapFeePercent: undefined,
  ...patch,
});
const historical = (prices: string[]): BotHistory => ({
  candles: prices.map((close, index) => ({ close, feeClose: '1', timestamp: NOW - (prices.length - index) * HOUR })),
  missing: 0,
  denominationVerified: true,
});

describe('ephemeral bot playground', () => {
  it('creates isolated wallet-free paper capital without an active session or saved results', () => {
    const input = settings();
    const before = JSON.stringify({ input, assets });
    const bot = createPlaygroundBot(input, assets, NOW);
    expect(bot).toMatchObject({
      mode: 'paper',
      status: 'idle',
      account: 'paper',
      network: 'paper',
      sessionExpiresAt: 0,
      activity: [],
      equity: [],
    });
    expect(bot.portfolio.initial[XOR.address]).toBe(toCodec('100', XOR.decimals));
    expect(bot.strategy.amount).toBe('10');
    expect(bot.portfolio.holdings).not.toBe(bot.portfolio.initial);
    bot.portfolio.holdings[XOR.address] = '0';
    expect(bot.portfolio.initial[XOR.address]).toBe(toCodec('100', XOR.decimals));
    expect(JSON.stringify({ input, assets })).toBe(before);
    expect(createPlaygroundBot(input, assets, NOW).portfolio.holdings[XOR.address]).toBe(toCodec('100', XOR.decimals));
  });

  it('preserves 36-decimal token capital and rounds percentage sizes down to real base units', () => {
    const precise = assets.map((asset) => ({ ...asset, address: `precise-${asset.symbol}`, decimals: 36 }));
    const capital = '1.000000000000000000000000000000000019';
    const bot = createPlaygroundBot(
      settings({
        capital,
        tradePercent: 10,
        assetInAddress: precise[0].address,
        assetOutAddress: precise[1].address,
      }),
      precise,
      NOW
    );
    expect(bot.portfolio.initial[precise[0].address]).toBe('1000000000000000000000000000000000019');
    expect(bot.strategy.amount).toBe('0.100000000000000000000000000000000001');
    expect(bot.policy.feeAsset).toEqual({ address: XOR.address, symbol: XOR.symbol, decimals: XOR.decimals });
    expect(bot.portfolio.initial[XOR.address]).toBe(toCodec('1', XOR.decimals));
  });

  it('uses selected token decimals and a separate canonical XOR fee allocation', () => {
    const selectedAssets: BotAsset[] = [
      { address: 'token-a', symbol: 'AAA', decimals: 6 },
      { address: 'token-b', symbol: 'BBB', decimals: 8 },
    ];
    const bot = createPlaygroundBot(
      settings({
        assetInAddress: 'token-a',
        assetOutAddress: 'token-b',
        capital: '123.456789',
        feeBudgetXor: '0.012345678901234567',
      }),
      selectedAssets,
      NOW
    );
    expect(bot.assetIn).toEqual(selectedAssets[0]);
    expect(bot.assetOut).toEqual(selectedAssets[1]);
    expect(bot.strategy.amount).toBe('12.345678');
    expect(bot.policy.feeAsset.address).toBe(XOR.address);
    expect(bot.policy.feeBudgetCodec).toBe('12345678901234567');
    expect(bot.portfolio.initial).toEqual({
      'token-a': '123456789',
      'token-b': '0',
      [XOR.address]: '12345678901234567',
    });
  });

  it('initializes the XOR output with its fee reserve without replacing input capital', () => {
    const bot = createPlaygroundBot(
      settings({
        assetInAddress: VAL.address,
        assetOutAddress: XOR.address,
        capital: '25',
        feeBudgetXor: '0.03',
      }),
      assets,
      NOW
    );
    expect(bot.portfolio.initial[VAL.address]).toBe(toCodec('25', VAL.decimals));
    expect(bot.portfolio.initial[XOR.address]).toBe(toCodec('0.03', XOR.decimals));
    expect(bot.policy.feeAsset.address).toBe(XOR.address);
    expect(bot.policy.feeBudgetCodec).toBe(toCodec('0.03', XOR.decimals));
  });

  it('includes an explicit XOR fee reserve within XOR input capital', () => {
    const bot = createPlaygroundBot(settings({ capital: '100', feeBudgetXor: '1.5' }), assets, NOW);
    expect(bot.portfolio.initial[XOR.address]).toBe(toCodec('100', XOR.decimals));
    expect(bot.policy.feeBudgetCodec).toBe(toCodec('1.5', XOR.decimals));
  });

  it.each([
    { preset: 'ai' },
    { capital: '0' },
    { capital: 'NaN' },
    { capital: '1000000001' },
    { tradePercent: 0 },
    { tradePercent: 51 },
    { tradePercent: 1.5 },
    { intervalHours: 0 },
    { intervalHours: 169 },
    { days: 8 },
    { thresholdPercent: -1 },
    { thresholdPercent: 51 },
    { fastWindow: 1 },
    { fastWindow: 20, slowWindow: 20 },
    { slowWindow: 201 },
    { historyStartAt: -1 },
    { historyStartAt: NaN },
    { historyStartAt: Date.UTC(2026, 2, 1), historyEndAt: Date.UTC(2026, 1, 1) },
    { historyEndAt: Infinity },
    { assetInAddress: 'unknown' },
    { assetOutAddress: XOR.address },
    { feeBudgetXor: '0' },
    { feeBudgetXor: '-1' },
    { feeBudgetXor: '100' },
    { feeBudgetXor: '0.0000000000000000001' },
  ])('rejects unsupported or unbounded settings %j', (patch) => {
    expect(() => createPlaygroundBot(settings(patch as Partial<PlaygroundSettings>), assets, NOW)).toThrow();
  });

  it('requires supplied canonical assets and refuses sub-base-unit position sizes', () => {
    expect(() => createPlaygroundBot(settings(), [assets[0]], NOW)).toThrow('bots.errors.config');
    expect(() =>
      createPlaygroundBot(
        settings(),
        assets.map((asset) => ({ ...asset, decimals: 37 })),
        NOW
      )
    ).toThrow();
    expect(() =>
      createPlaygroundBot(
        settings(),
        assets.map((asset) => ({ ...asset, decimals: 36 })),
        NOW
      )
    ).toThrow('bots.errors.config');
    expect(() => createPlaygroundBot(settings({ capital: '0.000000000000000001' }), assets, NOW)).toThrow(
      'bots.errors.amount'
    );
  });

  it('supports exact six-second blocks and preserves legacy hours only when blocks are omitted', () => {
    expect(PLAYGROUND_DEFAULT_SETTINGS.intervalBlocks).toBe(10);
    expect(createPlaygroundBot(PLAYGROUND_DEFAULT_SETTINGS, assets, NOW).strategy.intervalMs).toBe(60_000);
    expect(createPlaygroundBot(settings({ intervalBlocks: 1 }), assets, NOW).strategy.intervalMs).toBe(6000);
    expect(createPlaygroundBot(settings({ intervalBlocks: 50 }), assets, NOW).strategy.intervalMs).toBe(300000);
    expect(createPlaygroundBot(settings({ intervalHours: 12 }), assets, NOW).strategy.intervalMs).toBe(43200000);
    for (const intervalBlocks of [0, -1, 0.5, NaN, 432001])
      expect(() => createPlaygroundBot(settings({ intervalBlocks }), assets, NOW)).toThrow('bots.errors.config');
  });

  it('copies explicit signal timing only to SMA and preserves legacy omission', () => {
    for (const signalTiming of ['live-price', 'closed-hour'] as const) {
      expect(createPlaygroundBot(settings({ preset: 'sma', signalTiming }), assets, NOW).strategy.signalTiming).toBe(
        signalTiming
      );
      for (const preset of ['dca', 'threshold'] as const) {
        const input = settings({ preset, signalTiming });
        expect(createPlaygroundBot(input, assets, NOW).strategy.signalTiming).toBeUndefined();
        expect(input.signalTiming).toBe(signalTiming);
      }
    }
    expect(createPlaygroundBot(settings({ preset: 'sma' }), assets, NOW).strategy).not.toHaveProperty('signalTiming');
    for (const signalTiming of ['', 'ticks', null, 1])
      expect(() => createPlaygroundBot(settings({ signalTiming } as Partial<PlaygroundSettings>), assets, NOW)).toThrow(
        'bots.errors.config'
      );
  });

  it('rejects price impact above one percent for new drafts while preserving explicit existing policies', () => {
    const bot = createPlaygroundBot(settings(), assets, NOW);
    const proposal = { action: 'buy' as const, amount: '10', reason: 'test' };
    const quote = {
      assetIn: bot.assetIn,
      assetOut: bot.assetOut,
      request: { side: 'input', slippageTolerance: '0.5' },
      amountIn: '10',
      amountInMeta: { codec: toCodec('10', XOR.decimals) },
      amountOut: '1',
      minMaxCodec: toCodec('0.995', VAL.decimals),
      priceImpact: '1',
    } as AgentSwapQuote;
    expect(() => assertQuote(bot, proposal, quote)).not.toThrow();
    expect(() => assertQuote(bot, proposal, { ...quote, priceImpact: '1.0001' })).toThrow('bots.errors.policy');
    const existing = { ...bot, policy: { ...bot.policy, maxPriceImpactPercent: '3' } };
    expect(() => assertQuote(existing, proposal, { ...quote, priceImpact: '2' })).not.toThrow();
  });

  it('defaults the requested start to March 1 2026 UTC', () => {
    expect(PLAYGROUND_DEFAULT_SETTINGS.historyStartAt).toBe(Date.UTC(2026, 2, 1));
  });

  it('requires explicit network and swapping fee observations without a fallback', () => {
    expect(PLAYGROUND_DEFAULT_SETTINGS.networkFeeXor).toBe('');
    expect(PLAYGROUND_DEFAULT_SETTINGS.swapFeePercent).toBe('');
    expect(PLAYGROUND_DEFAULT_SETTINGS.sellNetworkFeeXor).toBe('');
    expect(PLAYGROUND_DEFAULT_SETTINGS.sellSwapFeePercent).toBe('');
    const history = createMockHistoricalSource(NOW);
    for (const patch of [
      { networkFeeXor: '' },
      { swapFeePercent: '' },
      { sellNetworkFeeXor: '' },
      { sellSwapFeePercent: '' },
      { networkFeeXor: undefined },
      { swapFeePercent: undefined },
    ]) {
      expect(() => runPlayground(settings(patch), assets, history, NOW)).toThrow('bots.errors.amount');
    }
    const run = runPlayground(settings({ swapFeePercent: '0.6' }), assets, history, NOW);
    expect(run.assumptions).toMatchObject({ feeAmount: '0.1', swapFeePercent: '0.6' });
    expect(run.result.portfolio.feesPaidCodec).toBe(
      (BigInt(toCodec('0.1', XOR.decimals)) * BigInt(run.result.trades)).toString()
    );
  });

  it('refuses absent, synthetic, imported and out-of-window sources', () => {
    expect(() => runPlayground(settings(), assets, undefined, NOW)).toThrow('bots.errors.history');
    for (const kind of ['demo', 'imported']) {
      const invalid = { ...createMockHistoricalSource(NOW), kind } as unknown as PlaygroundSource;
      expect(() => runPlayground(settings(), assets, invalid, NOW)).toThrow('bots.errors.history');
    }
    expect(() =>
      runPlayground(settings({ historyStartAt: NOW }), assets, createMockHistoricalSource(NOW), NOW)
    ).toThrow('bots.errors.history');
    expect(() =>
      runPlayground(settings({ historyEndAt: NOW - HOUR }), assets, createMockHistoricalSource(NOW), NOW)
    ).toThrow('bots.errors.history');
  });

  it('accepts a complete requested opening boundary and its final completed close', () => {
    const source = createMockHistoricalSource(NOW);
    const config = settings({ historyStartAt: source.history.candles[0].timestamp - HOUR, historyEndAt: NOW });
    const run = runPlayground(config, assets, source, NOW);
    expect(run.source.history.candles.at(-1)?.timestamp).toBe(NOW);
    source.history.candles.shift();
    source.history.missing++;
    const partial = runPlayground(config, assets, source, NOW);
    expect(partial.source.history.candles[0].timestamp).toBe(source.history.candles[0].timestamp);
    expect(partial.result.coverage).toBe(source.history.candles.length / (source.history.candles.length + 1));
  });

  it.each(['dca', 'threshold', 'sma'] as const)(
    'computes %s fixture metrics and only accepted fill markers through the shared engine',
    (preset) => {
      const input = settings({ preset });
      const before = JSON.stringify(input);
      const run = runPlayground(input, assets, createMockHistoricalSource(NOW), NOW);
      expect(run.source.kind).toBe('historical');
      expect(run.source.history.denominationVerified).toBe(true);
      expect(run.result.dataSource).toBe('historical');
      expect(run.tradeMarkers.length).toBe(run.result.trades);
      expect(run.result.trades).toBeGreaterThan(0);
      expect(run.bot.portfolio.trades).toBe(0);
      expect(run.result.equity.length).toBe(run.source.history.candles.length + 1);
      expect(run.assumptions).toMatchObject({ slippagePercent: '0.5', feeAmount: '0.1', execution: 'next-close' });
      expect(JSON.stringify(input)).toBe(before);
    }
  );

  it('uses verified historical prices, reports coverage and anchors dip thresholds to the first close', () => {
    const history = historical(['10', '8', '9']);
    history.missing = 3;
    const before = JSON.stringify(history);
    const run = runPlayground(
      settings({ preset: 'threshold', intervalHours: 1 }),
      assets,
      { kind: 'historical', history },
      NOW
    );
    expect(run.bot.strategy.threshold).toBe('9.2');
    expect(run.result.dataSource).toBe('historical');
    expect(run.result.coverage).toBe(0.5);
    expect(run.tradeMarkers).toHaveLength(1);
    expect(run.tradeMarkers[0]).toMatchObject({ timestamp: history.candles[2].timestamp, price: '9', action: 'buy' });
    expect(JSON.stringify(history)).toBe(before);
    expect(run.source.history).not.toBe(history);
  });

  it('cannot relabel unverified candles as historical evidence', () => {
    const unverified = createMockHistoricalSource(NOW).history;
    unverified.denominationVerified = false;
    expect(() => runPlayground(settings(), assets, { kind: 'historical', history: unverified }, NOW)).toThrow(
      'bots.errors.denomination'
    );
    const future = historical(['2', '3']);
    future.candles[1].timestamp = NOW + HOUR;
    expect(() => runPlayground(settings(), assets, { kind: 'historical', history: future }, NOW)).toThrow(
      'bots.errors.history'
    );
  });

  it('can sell and reuse virtual proceeds while exact fees reduce net capital', () => {
    const run = runPlayground(
      settings({ preset: 'sma', intervalHours: 1, sellNetworkFeeXor: '0.2', sellSwapFeePercent: '1.1' }),
      assets,
      createMockHistoricalSource(NOW),
      NOW
    );
    const sell = run.tradeMarkers.findIndex((trade) => trade.action === 'sell');
    expect(sell).toBeGreaterThan(0);
    expect(run.tradeMarkers.slice(sell + 1).some((trade) => trade.action === 'buy')).toBe(true);
    expect(BigInt(run.result.portfolio.feesPaidCodec)).toBe(
      run.tradeMarkers.reduce((sum, trade) => sum + BigInt(trade.feeCodec), 0n)
    );
    for (const trade of run.tradeMarkers)
      expect(trade.feeCodec).toBe(toCodec(trade.action === 'buy' ? '0.1' : '0.2', XOR.decimals));
    expect(run.assumptions).toMatchObject({ sellNetworkFeeXor: '0.2', sellSwapFeePercent: '1.1' });
    for (const value of Object.values(run.result.portfolio.holdings)) expect(BigInt(value)).toBeGreaterThanOrEqual(0n);
  });
});
