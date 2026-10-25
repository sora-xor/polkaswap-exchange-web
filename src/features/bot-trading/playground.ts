import { FPNumber } from '@/lib/substrate/math';
import { XOR, VAL } from '@/lib/substrate/sdk/assets/consts';
import { codec, fromCodec, percent, toCodec } from './amounts';
import { decimalRatio, parseBotPrice, runBacktest } from './engine';
import type { BacktestResult, BacktestTrade, BotAsset, BotDefinition, BotHistory } from './types';

export interface PlaygroundSettings {
  preset: 'dca' | 'threshold' | 'sma';
  capital: string;
  tradePercent: number;
  intervalHours: number;
  /** Optional finalized-block cadence; one SORA block is nominally six seconds. */
  intervalBlocks?: number;
  days: 7 | 30 | 90;
  thresholdPercent: number;
  fastWindow: number;
  slowWindow: number;
  /** SMA timing preference; other presets ignore it without erasing the user's selection. */
  signalTiming?: 'live-price' | 'closed-hour';
  /** Omitted addresses select the default XOR/VAL market. */
  assetInAddress?: string;
  assetOutAddress?: string;
  /** XOR reserve, included in XOR input capital or added separately for other inputs. */
  feeBudgetXor?: string;
  /** Explicit observed fee inputs; replay fails until both are supplied. */
  networkFeeXor?: string;
  swapFeePercent?: string;
  /** Reverse-direction observations; omission supports older explicit-fee callers. */
  sellNetworkFeeXor?: string;
  sellSwapFeePercent?: string;
  /** Dated directional quote impact, applied separately from pool fees and slippage. Legacy studies omit it. */
  priceImpactPercent?: string;
  sellPriceImpactPercent?: string;
  /** Inclusive requested historical start, in UTC milliseconds. */
  historyStartAt?: number;
  /** Requested completed-candle cutoff, in UTC milliseconds. */
  historyEndAt?: number;
}
/** Only denomination-verified market history can be replayed. */
export interface PlaygroundSource {
  kind: 'historical';
  labelKey?: 'bots.playground.historicalData';
  history: BotHistory;
}
export type PlaygroundTradeMarker = BacktestTrade;
export interface PlaygroundResult {
  bot: BotDefinition;
  source: PlaygroundSource;
  result: BacktestResult;
  tradeMarkers: PlaygroundTradeMarker[];
  assumptions: {
    slippagePercent: string;
    feeAmount: string;
    feeCodec: string;
    swapFeePercent: string;
    sellNetworkFeeXor: string;
    sellSwapFeePercent: string;
    priceImpactPercent: string;
    sellPriceImpactPercent: string;
    execution: 'next-close';
  };
}

export const PLAYGROUND_DEFAULT_SETTINGS: Readonly<PlaygroundSettings> = Object.freeze({
  preset: 'dca',
  capital: '100',
  tradePercent: 10,
  intervalHours: 12,
  intervalBlocks: 10,
  days: 30,
  thresholdPercent: 8,
  fastWindow: 5,
  slowWindow: 20,
  historyStartAt: Date.UTC(2026, 2, 1),
  networkFeeXor: '',
  swapFeePercent: '',
  sellNetworkFeeXor: '',
  sellSwapFeePercent: '',
});
const HOUR = 3_600_000;
const PRECISION = 36;
const SLIPPAGE_PERCENT = '0.5';
const fp = (value: string) => new FPNumber(value, PRECISION);

/** Bound controls before constructing virtual capital or running a simulation. */
function validateSettings(settings: PlaygroundSettings): void {
  if (
    !['dca', 'threshold', 'sma'].includes(settings.preset) ||
    ![7, 30, 90].includes(settings.days) ||
    !Number.isInteger(settings.tradePercent) ||
    settings.tradePercent < 1 ||
    settings.tradePercent > 50 ||
    !Number.isInteger(settings.intervalHours) ||
    settings.intervalHours < 1 ||
    settings.intervalHours > 168 ||
    (settings.intervalBlocks !== undefined &&
      (!Number.isSafeInteger(settings.intervalBlocks) ||
        settings.intervalBlocks < 1 ||
        settings.intervalBlocks > 432000)) ||
    !Number.isInteger(settings.thresholdPercent) ||
    settings.thresholdPercent < 0 ||
    settings.thresholdPercent > 50 ||
    !Number.isInteger(settings.fastWindow) ||
    !Number.isInteger(settings.slowWindow) ||
    settings.fastWindow < 2 ||
    settings.slowWindow <= settings.fastWindow ||
    settings.slowWindow > 200 ||
    (settings.signalTiming !== undefined && !['live-price', 'closed-hour'].includes(settings.signalTiming)) ||
    (settings.historyStartAt !== undefined &&
      (!Number.isSafeInteger(settings.historyStartAt) || settings.historyStartAt < 0)) ||
    (settings.historyEndAt !== undefined &&
      (!Number.isSafeInteger(settings.historyEndAt) || settings.historyEndAt <= (settings.historyStartAt ?? 0)))
  )
    throw new Error('bots.errors.config');
}

/** Resolve a distinct selected pair from supplied public metadata without changing XOR precision. */
function selectAssets(settings: PlaygroundSettings, assets: BotAsset[]): [BotAsset, BotAsset] {
  const selected = [settings.assetInAddress ?? XOR.address, settings.assetOutAddress ?? VAL.address];
  if (selected[0] === selected[1]) throw new Error('bots.errors.config');
  return selected.map((address) => {
    const asset = assets.find((item) => item.address === address);
    if (
      !asset ||
      !asset.symbol ||
      asset.symbol.length > 20 ||
      (asset.address === XOR.address && asset.decimals !== XOR.decimals)
    )
      throw new Error('bots.errors.config');
    toCodec('1', asset.decimals);
    return { address: asset.address, symbol: asset.symbol, decimals: asset.decimals };
  }) as [BotAsset, BotAsset];
}

/** Anchor dip rules and output limits to the first observable price, without reading a later candle. */
function withReferencePrice(bot: BotDefinition, settings: PlaygroundSettings, price: string): BotDefinition {
  const reference = parseBotPrice(price);
  const threshold = reference.mul(decimalRatio(fp(String(100 - settings.thresholdPercent)), fp('100')));
  const maximumOutput = decimalRatio(fp(settings.capital), reference).value.toFixed(bot.assetOut.decimals, 0);
  return {
    ...bot,
    strategy: { ...bot.strategy, threshold: threshold.toString() },
    policy: {
      ...bot.policy,
      maxTradeCodec: {
        ...bot.policy.maxTradeCodec,
        [bot.assetOut.address]: toCodec(maximumOutput, bot.assetOut.decimals),
      },
    },
  };
}

/**
 * Construct an isolated paper definition from public asset metadata. No wallet,
 * storage, session, random identifier, or signing dependency is involved. Capital
 * includes the XOR fee reserve when XOR is the input; other pairs add a separate
 * XOR allocation. Calculations never change their inputs or use token floats.
 */
export function createPlaygroundBot(settings: PlaygroundSettings, assets: BotAsset[], now = Date.now()): BotDefinition {
  validateSettings(settings);
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('bots.errors.config');
  const [assetIn, assetOut] = selectAssets(settings, assets);
  const capital = codec(toCodec(settings.capital, assetIn.decimals));
  if (!capital || capital > codec(toCodec('1000000000', assetIn.decimals))) throw new Error('bots.errors.amount');
  const trade = (capital * BigInt(settings.tradePercent)) / 100n;
  if (!trade) throw new Error('bots.errors.amount');
  const fee =
    settings.feeBudgetXor === undefined
      ? assetIn.address === XOR.address
        ? capital / 5n || 1n
        : codec(toCodec('1', XOR.decimals))
      : codec(toCodec(settings.feeBudgetXor, XOR.decimals));
  if (!fee || fee > codec(toCodec('1000000000', XOR.decimals)) || (assetIn.address === XOR.address && fee >= capital))
    throw new Error('bots.errors.amount');
  const initial = { [assetIn.address]: capital.toString(), [assetOut.address]: '0' };
  if (assetIn.address !== XOR.address) initial[XOR.address] = fee.toString();
  const bot: BotDefinition = {
    version: 1,
    id: 'playground-preview',
    name: 'Polkaswap playground',
    mode: 'paper',
    status: 'idle',
    account: 'paper',
    network: 'paper',
    assetIn,
    assetOut,
    strategy: {
      kind: settings.preset,
      amount: fromCodec(trade.toString(), assetIn.decimals),
      intervalMs:
        settings.intervalBlocks === undefined ? settings.intervalHours * HOUR : settings.intervalBlocks * 6000,
      // Replay anchors this incomplete template to its first real observation.
      threshold: '',
      direction: 'below',
      fastWindow: settings.fastWindow,
      slowWindow: settings.slowWindow,
      ...(settings.preset === 'sma' && settings.signalTiming !== undefined
        ? { signalTiming: settings.signalTiming }
        : {}),
      prompt: '',
    },
    policy: {
      maxTradeCodec: { [assetIn.address]: trade.toString(), [assetOut.address]: '0' },
      slippagePercent: SLIPPAGE_PERCENT,
      maxPriceImpactPercent: '1',
      feeAsset: { address: XOR.address, symbol: XOR.symbol, decimals: XOR.decimals },
      feeBudgetCodec: fee.toString(),
      sessionDurationMs: HOUR,
    },
    portfolio: { initial: { ...initial }, holdings: { ...initial }, feesPaidCodec: '0', trades: 0 },
    state: { lastEvaluatedAt: 0, lastTradeAt: 0 },
    provider: 'openai',
    model: '',
    endpoint: '',
    createdAt: now,
    sessionExpiresAt: 0,
    activity: [],
    equity: [],
    apiUsage: { inputTokens: 0, outputTokens: 0, requests: 0 },
  };
  return bot;
}

/**
 * Replay supplied, verified market observations through the shared engine. Missing
 * data is an error: this entry point never manufactures prices or falls back.
 */
export function runPlayground(
  settings: PlaygroundSettings,
  assets: BotAsset[],
  source?: PlaygroundSource,
  now = Date.now()
): PlaygroundResult {
  let bot = createPlaygroundBot(settings, assets, now);
  if (!source || source.kind !== 'historical' || !source.history || source.history.candles.length > 10000)
    throw new Error('bots.errors.history');
  const selected = source;
  if (!selected.history.denominationVerified) throw new Error('bots.errors.denomination');
  if (
    selected.history.candles.some(
      (candle) =>
        candle.timestamp > now ||
        candle.timestamp < (settings.historyStartAt ?? 0) ||
        (settings.historyEndAt !== undefined && candle.timestamp > settings.historyEndAt)
    )
  )
    throw new Error('bots.errors.history');
  const history: BotHistory = {
    ...selected.history,
    candles: selected.history.candles.map((candle) => ({ ...candle })),
  };
  if (!history.candles.length) throw new Error('bots.errors.history');
  bot = withReferencePrice(bot, settings, history.candles[0].close);
  const feeCodec = toCodec(settings.networkFeeXor ?? '', bot.policy.feeAsset.decimals);
  const feeAmount = fromCodec(feeCodec, bot.policy.feeAsset.decimals);
  const swapFeePercent = percent(settings.swapFeePercent ?? '', '10').toString();
  const sellFeeCodec = toCodec(
    settings.sellNetworkFeeXor ?? settings.networkFeeXor ?? '',
    bot.policy.feeAsset.decimals
  );
  const sellNetworkFeeXor = fromCodec(sellFeeCodec, bot.policy.feeAsset.decimals);
  const sellSwapFeePercent = percent(settings.sellSwapFeePercent ?? settings.swapFeePercent ?? '', '10').toString();
  const priceImpactPercent = percent(
    settings.priceImpactPercent === undefined ? '0' : settings.priceImpactPercent
  ).toString();
  const sellPriceImpactPercent = percent(
    settings.sellPriceImpactPercent === undefined ? '0' : settings.sellPriceImpactPercent
  ).toString();
  const tradeMarkers: PlaygroundTradeMarker[] = [];
  const result = runBacktest(bot, history, {
    slippagePercent: SLIPPAGE_PERCENT,
    swapFeePercent,
    sellFeeCodec,
    sellSwapFeePercent,
    priceImpactPercent,
    sellPriceImpactPercent,
    feeCodec,
    dataSource: 'historical',
    onTrade: (trade) => tradeMarkers.push({ ...trade }),
  });
  const outputSource: PlaygroundSource = { kind: 'historical', labelKey: 'bots.playground.historicalData', history };
  return {
    bot,
    source: outputSource,
    result,
    tradeMarkers,
    assumptions: {
      slippagePercent: SLIPPAGE_PERCENT,
      feeAmount,
      feeCodec,
      swapFeePercent,
      sellNetworkFeeXor,
      sellSwapFeePercent,
      priceImpactPercent,
      sellPriceImpactPercent,
      execution: 'next-close',
    },
  };
}
