import { FPNumber } from '@/lib/substrate/math';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { addCodec, codec, fromCodec, percent, subtractCodec, toCodec } from './amounts';
import { assertTradeFunds, spendableHoldingCodec } from './allocation';
import { evaluateStrategyRules, parseStrategyRules, requiredRuleCandles } from './strategy-rules';
import type {
  BacktestResult,
  BacktestTrade,
  BotAsset,
  BotCandle,
  BotDefinition,
  BotEquityPoint,
  BotHistory,
  BotPortfolio,
  StrategyState,
  StrategyConfig,
  TradeProposal,
} from './types';

const PRECISION = 36;
const ZERO = new FPNumber('0', PRECISION);
const ONE = new FPNumber('1', PRECISION);
const HUNDRED = new FPNumber('100', PRECISION);

/** Parse decimal prices without accepting floats, exponent syntax, NaN, or zero. */
export function parseBotPrice(value: string): FPNumber {
  if (typeof value !== 'string' || value.length > 100 || !/^(0|[1-9]\d*)(\.\d{1,36})?$/.test(value)) {
    throw new Error('bots.errors.history');
  }
  const price = new FPNumber(value, PRECISION);
  if (!price.isFinity() || price.lte(ZERO)) throw new Error('bots.errors.history');
  return price;
}

/** Divide decimal values at 36 places without the SDK's global 20-place division limit. */
export function decimalRatio(numerator: FPNumber, denominator: FPNumber): FPNumber {
  if (!numerator.isFinity() || !denominator.isFinity() || denominator.lte(ZERO)) throw new Error('bots.errors.history');
  const scale = 10n ** BigInt(PRECISION);
  const toInteger = (value: FPNumber) => BigInt(value.value.toFixed(PRECISION, 1).replace('.', ''));
  const quotient = (toInteger(numerator) * scale) / toInteger(denominator);
  const negative = quotient < 0n;
  const digits = (negative ? -quotient : quotient).toString().padStart(PRECISION + 1, '0');
  return new FPNumber(`${negative ? '-' : ''}${digits.slice(0, -PRECISION)}.${digits.slice(-PRECISION)}`, PRECISION);
}

/** Reject malformed strategy settings before either simulation or live proposal generation. */
export function validateStrategy(bot: BotDefinition): void {
  const s = bot.strategy;
  validateSignalTiming(s);
  if (
    !['dca', 'threshold', 'sma', 'ai', 'rules'].includes(s.kind) ||
    !Number.isSafeInteger(s.intervalMs) ||
    s.intervalMs < 1000 ||
    codec(toCodec(s.amount, bot.assetIn.decimals)) === 0n ||
    bot.assetIn.address === bot.assetOut.address
  )
    throw new Error('bots.errors.strategy');
  if (s.kind === 'rules') parseStrategyRules(s.rules);
  else if (s.rules !== undefined) throw new Error('bots.errors.strategy');
  if (s.kind === 'threshold' && (!['above', 'below'].includes(s.direction) || !parseBotPrice(s.threshold))) {
    throw new Error('bots.errors.strategy');
  }
  if (
    s.kind === 'sma' &&
    (!Number.isSafeInteger(s.fastWindow) ||
      !Number.isSafeInteger(s.slowWindow) ||
      s.fastWindow < 1 ||
      s.slowWindow <= s.fastWindow ||
      s.slowWindow > 500)
  ) {
    throw new Error('bots.errors.strategy');
  }
}

/** Timing is an explicit SMA opt-in; legacy strategies must never gain intrahour execution implicitly. */
function validateSignalTiming(strategy: StrategyConfig): void {
  if (
    strategy.signalTiming !== undefined &&
    (strategy.kind !== 'sma' || !['live-price', 'closed-hour'].includes(strategy.signalTiming))
  )
    throw new Error('bots.errors.strategy');
}

/** Project supported strategy fields and detach bounded rule data at every persistence or handoff boundary. */
export function copyStrategyConfig(strategy: StrategyConfig): StrategyConfig {
  validateSignalTiming(strategy);
  const rules = strategy.kind === 'rules' ? parseStrategyRules(strategy.rules) : undefined;
  if (strategy.kind !== 'rules' && strategy.rules !== undefined) throw new Error('bots.errors.strategy');
  return {
    kind: strategy.kind,
    amount: strategy.amount,
    intervalMs: strategy.intervalMs,
    threshold: strategy.threshold,
    direction: strategy.direction,
    fastWindow: strategy.fastWindow,
    slowWindow: strategy.slowWindow,
    prompt: strategy.prompt,
    ...(strategy.signalTiming !== undefined ? { signalTiming: strategy.signalTiming } : {}),
    ...(rules ? { rules } : {}),
  };
}

/** Longest completed observation tail required by the deterministic signal, excluding trading state. */
export function requiredStrategyCandles(strategy: StrategyConfig): number {
  if (strategy.kind === 'sma') return strategy.slowWindow;
  if (strategy.kind !== 'rules') return 1;
  return requiredRuleCandles(parseStrategyRules(strategy.rules));
}

/** Validate strict chronology. Future observations are deliberately unavailable to strategy logic. */
function availableCandles(candles: BotCandle[], now: number): BotCandle[] {
  let previous = -1;
  const available: BotCandle[] = [];
  for (const candle of candles) {
    if (!Number.isSafeInteger(candle.timestamp) || candle.timestamp <= previous) throw new Error('bots.errors.history');
    parseBotPrice(candle.close);
    previous = candle.timestamp;
    if (candle.timestamp <= now) available.push(candle);
  }
  return available;
}

/** Return a natural amount rounded down to a real asset base unit. */
function roundedAmount(value: FPNumber, asset: BotAsset): string {
  return new FPNumber(value.value.toFixed(asset.decimals, 1), asset.decimals).toString();
}

/** Price-sized sells use allocated output holdings above the remaining network-fee reserve. */
function sellAmount(bot: BotDefinition, price: FPNumber): string {
  const desired = decimalRatio(new FPNumber(bot.strategy.amount, PRECISION), price);
  const held = new FPNumber(
    fromCodec(spendableHoldingCodec(bot, bot.assetOut.address), bot.assetOut.decimals),
    PRECISION
  );
  return roundedAmount(desired.min(held), bot.assetOut);
}

/** Compute a window mean over completed observations, using exact decimal arithmetic. */
function mean(candles: BotCandle[], window: number): FPNumber {
  return decimalRatio(
    candles.slice(-window).reduce((sum, candle) => sum.add(parseBotPrice(candle.close)), ZERO),
    new FPNumber(String(window), PRECISION)
  );
}

/**
 * Whether a rules strategy has already consumed the latest completed close in `candles`.
 * `evaluateStrategy` can then only hold, so a scheduler may skip such evaluations until a newer close arrives.
 */
export function ruleCloseConsumed(bot: BotDefinition, candles: BotCandle[], now: number): boolean {
  const consumed = bot.state.lastRuleObservationAt;
  if (bot.strategy.kind !== 'rules' || consumed === undefined || !Number.isSafeInteger(consumed) || consumed < 0)
    return false;
  const latest = availableCandles(candles, now).at(-1);
  return latest !== undefined && latest.timestamp <= consumed;
}

/**
 * Evaluate one deterministic signal. `close` is assetOut's price in assetIn.
 * The caller updates lastTradeAt only after a fill; proposals never imply execution.
 */
export function evaluateStrategy(
  bot: BotDefinition,
  candles: BotCandle[],
  now: number
): { proposal: TradeProposal; state: StrategyState; blockedAction?: 'buy' | 'sell' } {
  validateStrategy(bot);
  if (!Number.isSafeInteger(now) || now < 0 || now < bot.state.lastEvaluatedAt) throw new Error('bots.errors.strategy');
  const state: StrategyState = { ...bot.state, lastEvaluatedAt: now };
  const hold = (reason: string, blockedAction?: 'buy' | 'sell') => ({
    proposal: { action: 'hold', amount: '0', reason } as TradeProposal,
    state,
    ...(blockedAction ? { blockedAction } : {}),
  });
  const observed = availableCandles(candles, now);
  const latest = observed.at(-1);
  if (!latest) return hold('bots.events.noData');
  if (bot.strategy.kind === 'sma' && bot.strategy.signalTiming === 'live-price') {
    const consumed = bot.state.lastLiveObservationAt;
    if (consumed !== undefined && (!Number.isSafeInteger(consumed) || consumed < 0))
      throw new Error('bots.errors.strategy');
    if (consumed !== undefined && latest.timestamp <= consumed) return hold('bots.events.noSignal');
    if (observed.length < bot.strategy.slowWindow) return hold('bots.events.warmup');
    state.lastLiveObservationAt = latest.timestamp;
  }
  let ruleSignal: ReturnType<typeof evaluateStrategyRules> | undefined;
  if (bot.strategy.kind === 'rules') {
    const consumed = bot.state.lastRuleObservationAt;
    if (consumed !== undefined && (!Number.isSafeInteger(consumed) || consumed < 0))
      throw new Error('bots.errors.strategy');
    if (consumed !== undefined && latest.timestamp <= consumed) return hold('bots.events.noSignal');
    ruleSignal = evaluateStrategyRules(bot.strategy.rules!, observed.slice(-requiredStrategyCandles(bot.strategy)));
    if (!ruleSignal.ready) return hold('bots.events.warmup');
    // A rejected or absent fill must not retry the same completed close on a later timer tick.
    state.lastRuleObservationAt = latest.timestamp;
  }
  if (bot.state.lastTradeAt > 0 && now - bot.state.lastTradeAt < bot.strategy.intervalMs) {
    return hold('bots.events.interval');
  }
  if (bot.strategy.kind === 'ai') return hold('bots.events.aiRequired');
  const price = parseBotPrice(latest.close);
  let action: TradeProposal['action'] = 'hold';
  let reason = 'bots.events.noSignal';
  if (ruleSignal) {
    if (ruleSignal.exit) {
      action = 'sell';
      reason = 'bots.rules.exitMatch';
    } else if (ruleSignal.entry) {
      action = 'buy';
      reason = 'bots.rules.entryMatch';
    }
  } else if (bot.strategy.kind === 'dca') {
    action = 'buy';
    reason = 'bots.events.scheduled';
  } else if (bot.strategy.kind === 'threshold') {
    const threshold = parseBotPrice(bot.strategy.threshold);
    if (bot.strategy.direction === 'below' && price.lte(threshold)) action = 'buy';
    if (bot.strategy.direction === 'above' && price.gte(threshold)) action = 'sell';
    if (action !== 'hold') reason = 'bots.events.threshold';
  } else {
    if (observed.length < bot.strategy.slowWindow) return hold('bots.events.warmup');
    const difference = mean(observed, bot.strategy.fastWindow).sub(mean(observed, bot.strategy.slowWindow));
    const signal = difference.gt(ZERO) ? 1 : difference.lt(ZERO) ? -1 : 0;
    // Repeated price samples are not separate crossovers. A zero line retains the last nonzero side.
    const previous = bot.state.previousSignal;
    if (signal !== 0) state.previousSignal = signal;
    if (previous !== undefined && previous !== 0 && signal !== 0 && previous !== signal) {
      action = signal > 0 ? 'buy' : 'sell';
      reason = 'bots.events.crossover';
    }
  }
  if (action === 'hold') return hold(reason);
  const amount = action === 'buy' ? bot.strategy.amount : sellAmount(bot, price);
  if (new FPNumber(amount, PRECISION).isZero()) return hold('bots.events.noAllocation', action);
  const input = action === 'buy' ? bot.assetIn : bot.assetOut;
  try {
    assertTradeFunds(bot, input.address, toCodec(amount, input.decimals));
  } catch (error) {
    if (error instanceof Error && ['bots.errors.balance', 'bots.errors.feeBudget'].includes(error.message)) {
      return hold('bots.events.noAllocation', action);
    }
    throw error;
  }
  return { proposal: { action, amount, reason }, state };
}

export interface PaperFill {
  inputAsset: string;
  inputCodec: string;
  outputAsset: string;
  outputCodec: string;
  feeAsset: string;
  feeCodec: string;
}

/**
 * Apply an already-validated quote to an isolated virtual inventory. Input and fee
 * debits happen before output credit, so a fill cannot borrow its own proceeds.
 */
export function applyPaperFill(bot: BotDefinition, fill: PaperFill): BotPortfolio {
  const { assetIn, assetOut, portfolio, policy } = bot;
  if (
    !(
      (fill.inputAsset === assetIn.address && fill.outputAsset === assetOut.address) ||
      (fill.inputAsset === assetOut.address && fill.outputAsset === assetIn.address)
    ) ||
    fill.feeAsset !== policy.feeAsset.address ||
    codec(fill.inputCodec) <= 0n ||
    codec(fill.outputCodec) <= 0n
  ) {
    throw new Error('bots.errors.proposal');
  }
  if (codec(fill.inputCodec) > codec(policy.maxTradeCodec[fill.inputAsset] ?? '0'))
    throw new Error('bots.errors.policy');
  assertTradeFunds(bot, fill.inputAsset, fill.inputCodec, fill.feeCodec);
  const feesPaidCodec = addCodec(portfolio.feesPaidCodec, fill.feeCodec);
  const holdings = { ...portfolio.holdings };
  holdings[fill.inputAsset] = subtractCodec(holdings[fill.inputAsset] ?? '0', fill.inputCodec);
  holdings[fill.feeAsset] = subtractCodec(holdings[fill.feeAsset] ?? '0', fill.feeCodec);
  holdings[fill.outputAsset] = addCodec(holdings[fill.outputAsset] ?? '0', fill.outputCodec);
  return { ...portfolio, initial: { ...portfolio.initial }, holdings, feesPaidCodec, trades: portfolio.trades + 1 };
}

/** Value allocated tokens and any finalized XOR fee deficit in assetIn units. */
export function valuePortfolio(bot: BotDefinition, candle: BotCandle, holdings?: Record<string, string>): string {
  const quotePrice = parseBotPrice(candle.close);
  const assets = new Map([bot.assetIn, bot.assetOut, bot.policy.feeAsset].map((asset) => [asset.address, asset]));
  let total = ZERO;
  for (const [address, amount] of Object.entries(holdings ?? bot.portfolio.holdings)) {
    if (codec(amount) === 0n) continue;
    const asset = assets.get(address);
    if (!asset) throw new Error('bots.errors.history');
    const price =
      address === bot.assetIn.address
        ? ONE
        : address === bot.assetOut.address
          ? quotePrice
          : parseBotPrice(candle.feeClose ?? '');
    total = total.add(new FPNumber(fromCodec(amount, asset.decimals), PRECISION).mul(price));
  }
  // Explicit historical/benchmark holdings are debt-free snapshots. The default
  // current portfolio must include an actual fee overrun in its marked value.
  if (holdings === undefined) {
    const deficit = codec(bot.portfolio.xorDeficitCodec ?? '0');
    if (deficit > 0n) {
      const asset = assets.get(XOR.address);
      if (!asset) throw new Error('bots.errors.history');
      const price = asset.address === bot.assetIn.address
        ? ONE
        : asset.address === bot.assetOut.address
          ? quotePrice
          : parseBotPrice(candle.feeClose ?? '');
      total = total.sub(new FPNumber(fromCodec(deficit.toString(), asset.decimals), PRECISION).mul(price));
    }
  }
  // Charts and goal snapshots require a nonnegative valuation. The exact
  // shortfall remains in xorDeficitCodec even when it exceeds all holdings.
  return total.max(ZERO).toString();
}

/** Calculate peak-to-trough loss and net return from the pre-trade opening allocation. */
export function portfolioPerformance(equity: BotEquityPoint[]): { drawdownPercent: string; returnPercent: string } {
  if (!equity.length) return { drawdownPercent: '0', returnPercent: '0' };
  const initial = new FPNumber(equity[0].value, PRECISION);
  let peak = initial;
  let drawdown = ZERO;
  for (const point of equity) {
    const value = new FPNumber(point.value, PRECISION);
    if (!value.isFinity() || value.lt(ZERO)) throw new Error('bots.errors.history');
    peak = peak.max(value);
    if (peak.gt(ZERO)) drawdown = drawdown.max(decimalRatio(peak.sub(value), peak).mul(HUNDRED));
  }
  const final = new FPNumber(equity[equity.length - 1].value, PRECISION);
  return {
    drawdownPercent: drawdown.toString(),
    returnPercent: initial.gt(ZERO) ? decimalRatio(final.sub(initial), initial).mul(HUNDRED).toString() : '0',
  };
}

/**
 * Observe completed closes and fill each resulting signal at the next available
 * candle's close. These indicative fills do not reconstruct historical liquidity.
 * No signing or wallet dependency is reachable from this pure function.
 */
export function runBacktest(
  bot: BotDefinition,
  history: BotHistory,
  options: {
    slippagePercent: string;
    feeCodec: string;
    /** Optional pool fee applied to output, separately from slippage and the network fee. */
    swapFeePercent?: string;
    /** Reverse-direction observations; omitted values preserve explicitly supplied legacy buy fees. */
    sellFeeCodec?: string;
    sellSwapFeePercent?: string;
    /** Dated quote-impact scenario, distinct from pool fees and the slippage allowance. */
    priceImpactPercent?: string;
    sellPriceImpactPercent?: string;
    /** All new runs require historical provenance; legacy labels are read-only storage metadata. */
    dataSource?: 'historical';
    onTrade?: (trade: Readonly<BacktestTrade>) => void;
  }
): BacktestResult {
  validateStrategy(bot);
  if (bot.strategy.kind === 'ai') throw new Error('bots.errors.backtestAi');
  const dataSource = options.dataSource ?? 'historical';
  if (dataSource !== 'historical') throw new Error('bots.errors.history');
  if (!history.denominationVerified) throw new Error('bots.errors.denomination');
  if (!history.candles.length || !Number.isSafeInteger(history.missing) || history.missing < 0)
    throw new Error('bots.errors.history');
  const candles = availableCandles(history.candles, Number.MAX_SAFE_INTEGER);
  const slippage = percent(options.slippagePercent);
  const swapFee = percent(options.swapFeePercent ?? '0');
  const sellSwapFee = percent(options.sellSwapFeePercent ?? options.swapFeePercent ?? '0');
  const priceImpact = percent(options.priceImpactPercent === undefined ? '0' : options.priceImpactPercent);
  const sellPriceImpact = percent(options.sellPriceImpactPercent === undefined ? '0' : options.sellPriceImpactPercent);
  const sellFeeCodec = options.sellFeeCodec ?? options.feeCodec;
  if (slippage.gte(HUNDRED)) throw new Error('bots.errors.policy');
  if (swapFee.gte(HUNDRED) || sellSwapFee.gte(HUNDRED)) throw new Error('bots.errors.policy');
  if (priceImpact.gte(HUNDRED) || sellPriceImpact.gte(HUNDRED)) throw new Error('bots.errors.policy');
  codec(options.feeCodec);
  codec(sellFeeCodec);
  let current: BotDefinition = {
    ...bot,
    mode: 'paper',
    portfolio: {
      initial: { ...bot.portfolio.initial },
      holdings: { ...bot.portfolio.initial },
      feesPaidCodec: '0',
      trades: 0,
    },
    state: { lastEvaluatedAt: 0, lastTradeAt: 0 },
  };
  const first = candles[0];
  const equity: BotEquityPoint[] = [
    {
      timestamp: first.timestamp - 1,
      value: valuePortfolio(current, first),
      benchmark: valuePortfolio(current, first),
    },
  ];
  const observed: BotCandle[] = [];
  // The complete series was validated above; signals need only the longest mean
  // window, with crossover direction retained in state. Avoid quadratic rechecks.
  const observationWindow = requiredStrategyCandles(bot.strategy);
  let proposal: TradeProposal = { action: 'hold', amount: '0', reason: 'bots.events.noSignal' };
  for (const candle of candles) {
    if (
      proposal.action !== 'hold' &&
      (current.state.lastTradeAt === 0 || candle.timestamp - current.state.lastTradeAt >= current.strategy.intervalMs)
    ) {
      const buying = proposal.action === 'buy';
      const input = buying ? bot.assetIn : bot.assetOut;
      const output = buying ? bot.assetOut : bot.assetIn;
      const price = parseBotPrice(candle.close);
      const naturalInput = new FPNumber(proposal.amount, PRECISION);
      const naturalOutput = (buying ? decimalRatio(naturalInput, price) : naturalInput.mul(price))
        .mul(ONE.sub(decimalRatio(slippage, HUNDRED)))
        .mul(ONE.sub(decimalRatio(buying ? swapFee : sellSwapFee, HUNDRED)))
        .mul(ONE.sub(decimalRatio(buying ? priceImpact : sellPriceImpact, HUNDRED)));
      let accepted: PaperFill | undefined;
      try {
        const fill: PaperFill = {
          inputAsset: input.address,
          inputCodec: toCodec(proposal.amount, input.decimals),
          outputAsset: output.address,
          outputCodec: toCodec(roundedAmount(naturalOutput, output), output.decimals),
          feeAsset: bot.policy.feeAsset.address,
          feeCodec: buying ? options.feeCodec : sellFeeCodec,
        };
        current.portfolio = applyPaperFill(current, fill);
        current.state = { ...current.state, lastTradeAt: candle.timestamp };
        accepted = fill;
      } catch (error) {
        // A declined fill is a missed opportunity, not additional virtual credit.
        if (
          !(error instanceof Error) ||
          !['bots.errors.balance', 'bots.errors.feeBudget', 'bots.errors.policy', 'bots.errors.proposal'].includes(
            error.message
          )
        )
          throw error;
      }
      if (accepted)
        options.onTrade?.({
          ...accepted,
          timestamp: candle.timestamp,
          action: buying ? 'buy' : 'sell',
          price: candle.close,
          amount: proposal.amount,
          reason: proposal.reason,
        });
    }
    equity.push({
      timestamp: candle.timestamp,
      value: valuePortfolio(current, candle),
      benchmark: valuePortfolio(current, candle, current.portfolio.initial),
    });
    observed.push(candle);
    if (observed.length > observationWindow) observed.shift();
    // Signals use this completed close; cooldown belongs to the next bar's fill,
    // otherwise a fill would force an extra empty candle before every new order.
    const decision = evaluateStrategy(
      { ...current, state: { ...current.state, lastTradeAt: 0 } },
      observed,
      candle.timestamp
    );
    current = { ...current, state: { ...decision.state, lastTradeAt: current.state.lastTradeAt } };
    proposal = decision.proposal;
  }
  return {
    dataSource,
    portfolio: current.portfolio,
    equity,
    trades: current.portfolio.trades,
    ...portfolioPerformance(equity),
    coverage: candles.length / (candles.length + history.missing),
  };
}
