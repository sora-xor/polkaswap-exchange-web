import { describe, expect, it } from 'vitest';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { toCodec } from '@/features/bot-trading/amounts';
import {
  createQuantBot,
  evaluateQuantSignal,
  quantArchiveCandles,
  quantDenomination,
  quantImpactCeiling,
  quantResearchSettings,
  quantResearchSnapshot,
  quantSignalWindow,
  quantStrategy,
} from '@/features/bot-trading/quant-deploy';
import {
  generateQuantCandidates,
  type QuantLoopResult,
  type QuantMarketResult,
} from '@/features/bot-trading/quant-loop';
import type { ResearchFeeSnapshot } from '@/features/bot-trading/research-fees';
import type { BotAsset } from '@/features/bot-trading/types';

const HOUR = 3_600_000;
const TOKEN: BotAsset = { address: '0xpswap', symbol: 'PSWAP', decimals: 18 };
const ASSETS: BotAsset[] = [{ address: XOR.address, symbol: 'XOR', decimals: 18 }, TOKEN];
const candidate = generateQuantCandidates().find((item) => item.id === 'reversion:48/15/10:3')!;

function market(status: QuantMarketResult['status'] = 'deploy'): QuantMarketResult {
  return {
    asset: TOKEN,
    status,
    medianXorDepth: 56.55,
    folds: [],
    walkForward: {
      startAt: Date.UTC(2026, 5, 10),
      endAt: Date.UTC(2026, 8, 19),
      returnPercent: '43.49',
      drawdownPercent: '33.72',
      trades: 37,
      priceChangePercent: '60.04',
      equity: [],
      fills: [
        {
          timestamp: Date.UTC(2026, 5, 11),
          side: 'buy',
          input: '3',
          output: '1',
          fee: '0.1',
          price: '1',
          pnlPercent: '0.00',
          impactPercent: '6.10',
        },
      ],
    },
    final: {
      candidate,
      robust: 103,
      train: { returnPercent: '94.17', drawdownPercent: '57.27', trades: 19, maxImpactPercent: '14.06' },
    },
  };
}

const result = { archive: { genesisHash: `0x${'7e'.repeat(32)}`, denominator: '100' } } as unknown as QuantLoopResult;
const fees: ResearchFeeSnapshot = {
  networkFeeXor: '0.100020612589707326',
  networkFeeCodec: '100020612589707326',
  swapFeePercent: '0.6',
  priceImpactPercent: '5.2',
  sellNetworkFeeXor: '0.100020612589707326',
  sellNetworkFeeCodec: '100020612589707326',
  sellSwapFeePercent: '0.6',
  sellPriceImpactPercent: '4.9',
  queriedAt: Date.UTC(2026, 9, 2, 12),
  finalizedAt: Date.UTC(2026, 9, 2, 12) - 6_000,
  expiresAt: Date.UTC(2026, 9, 2, 12, 5),
  blockNumber: 27_900_000,
  blockHash: `0x${'ab'.repeat(32)}`,
  genesisHash: `0x${'7e'.repeat(32)}`,
  endpoint: 'wss://ws.mof.sora.org',
  denominator: '100',
  amountIn: '3',
  amountOut: '100',
  sellAmountIn: '100',
  sellAmountOut: '2.9',
  assetInAddress: XOR.address,
  assetOutAddress: TOKEN.address,
  dexId: 0,
  route: [XOR.address, TOKEN.address],
  routeFees: [],
  sellDexId: 0,
  sellRoute: [TOKEN.address, XOR.address],
  sellRouteFees: [],
};

describe('quant deployment templates', () => {
  it('keeps the researched rules, order size and one-block cadence', () => {
    const strategy = quantStrategy(candidate);
    expect(strategy).toMatchObject({ kind: 'rules', amount: '3', intervalMs: 6_000, prompt: '' });
    expect(strategy.rules).toEqual(candidate.rules);
    expect(strategy.rules).not.toBe(candidate.rules);
  });

  it('builds an idle paper template with the researched capacity limits', () => {
    const bot = createQuantBot(market(), ASSETS, 'PSWAP liquidity harvester', Date.UTC(2026, 9, 2), fees);
    expect(bot.mode).toBe('paper');
    expect(bot.status).toBe('idle');
    expect(bot.name).toBe('PSWAP liquidity harvester');
    expect(bot.assetIn.address).toBe(XOR.address);
    expect(bot.assetOut).toEqual(TOKEN);
    expect(bot.strategy.rules).toEqual(candidate.rules);
    expect(bot.portfolio.initial[XOR.address]).toBe(toCodec('10', 18));
    expect(bot.policy.feeBudgetCodec).toBe(toCodec('2', 18));
    expect(bot.policy.maxTradeCodec[XOR.address]).toBe(toCodec('3', 18));
    // The largest researched impact was 14.06%: rounded up plus one point of headroom.
    expect(bot.policy.maxPriceImpactPercent).toBe('16');
    expect(bot.policy.slippagePercent).toBe('0.5');
  });

  it('refuses markets that are not deployable', () => {
    expect(() => createQuantBot(market('watch'), ASSETS, 'x', 1)).toThrow('bots.errors.config');
    expect(() => quantResearchSnapshot(result, market('thin'), fees, 1)).toThrow('bots.errors.config');
  });

  it('bounds the live impact ceiling', () => {
    const extreme = market();
    extreme.final!.train.maxImpactPercent = '48.2';
    expect(quantImpactCeiling(extreme)).toBe('20');
    const calm = market();
    calm.final!.train.maxImpactPercent = '0.1';
    calm.walkForward!.fills = [];
    expect(quantImpactCeiling(calm)).toBe('2');
  });

  it('records walk-forward provenance that satisfies the saved-bot research contract', () => {
    const testedAt = fees.queriedAt + 1_000;
    const snapshot = quantResearchSnapshot(result, market(), fees, testedAt);
    expect(snapshot).toMatchObject({
      version: 1,
      source: 'historical',
      validation: 'walk-forward',
      trainPercent: 50,
      folds: 4,
      optimized: true,
      coverage: 1,
      returnPercent: '43.49',
      drawdownPercent: '33.72',
      trades: 37,
      valuationAsset: 'input',
      networkFeeXor: fees.networkFeeXor,
      swapFeePercent: '0.6',
    });
    // Constraints enforced by the controller before a research snapshot can be saved.
    expect(snapshot.startAt).toBeLessThanOrEqual(snapshot.endAt);
    expect(snapshot.endAt).toBeLessThanOrEqual(snapshot.testedAt);
    expect(snapshot.trainPercent).toBeGreaterThanOrEqual(50);
    expect(snapshot.folds).toBeGreaterThanOrEqual(2);
    expect(snapshot.returnPercent).toMatch(/^-?(0|[1-9]\d*)(\.\d+)?$/);
    expect(snapshot.feeObservation).toMatchObject({ blockNumber: 27_900_000, genesisHash: fees.genesisHash });
    expect(snapshot.feeObservation!.queriedAt).toBeLessThanOrEqual(testedAt);
    expect(snapshot).not.toHaveProperty('qualification');
    expect(quantDenomination(result)).toEqual({ genesisHash: `0x${'7e'.repeat(32)}`, denominator: '100' });
  });

  it('uses the same settings shape the research workspace expects', () => {
    expect(quantResearchSettings(market(), fees)).toMatchObject({
      capital: '10',
      feeBudgetXor: '2',
      assetInAddress: XOR.address,
      assetOutAddress: TOKEN.address,
      validation: 'walk-forward',
      optimize: false,
      networkFeeXor: fees.networkFeeXor,
    });
  });
});

describe('quant live signals', () => {
  /** Hourly closes: flat at 1, then a final close at `last`. */
  const candles = (count: number, last: string) =>
    Array.from({ length: count }, (_value, index) => ({
      timestamp: index * HOUR,
      close: index === count - 1 ? last : '1',
    }));

  it('reports a buy zone with the exact entry deviation', () => {
    const signal = evaluateQuantSignal(candidate, candles(60, '0.7'), 'live');
    expect(signal.state).toBe('entry');
    expect(signal.source).toBe('live');
    expect(signal.observedAt).toBe(59 * HOUR);
    expect(signal.deviation?.window).toBe(48);
    expect(Number(signal.deviation?.value)).toBeCloseTo(-29.6, 1);
    expect(signal.deviation?.threshold).toBe('-15');
  });

  it('reports sell, neutral, warm-up and unavailable states', () => {
    expect(evaluateQuantSignal(candidate, candles(60, '1.2'), 'live').state).toBe('exit');
    expect(evaluateQuantSignal(candidate, candles(60, '1'), 'archive')).toMatchObject({
      state: 'neutral',
      source: 'archive',
    });
    expect(evaluateQuantSignal(candidate, candles(10, '0.5'), 'live').state).toBe('warmup');
    expect(evaluateQuantSignal(candidate, [], 'live')).toEqual({
      state: 'unavailable',
      observedAt: null,
      deviation: null,
      source: 'live',
    });
  });

  it('requests enough completed hours for the rule window', () => {
    const now = Date.UTC(2026, 9, 2, 12, 30);
    const window = quantSignalWindow(candidate, now);
    expect(window.endAt).toBe(Date.UTC(2026, 9, 2, 12));
    expect((window.endAt - window.startAt) / HOUR).toBe(48 + 48);
  });

  it('formats exact archive closes like the history loader', () => {
    const [one, half, tiny] = quantArchiveCandles(
      [10n ** 36n, 5n * 10n ** 35n, 537n * 10n ** 29n],
      [0, HOUR, 2 * HOUR]
    );
    expect(one).toEqual({ timestamp: 0, close: '1' });
    expect(half.close).toBe('0.5');
    expect(tiny.close).toBe('0.0000537');
  });
});
