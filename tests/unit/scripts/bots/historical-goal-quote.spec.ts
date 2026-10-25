import { describe, expect, it, vi } from 'vitest';
import { prepareHistoricalGoalFill } from '../../../../scripts/bots/historical-goal-quote';
import { planHistoricalExecutionClock } from '../../../../scripts/bots/historical-execution-clock';
import {
  decodeHistoricalFeeDetailsScale,
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../scripts/bots/historical-execution-codec';
import { createHistoricalGoalLedger, applyHistoricalGoalFill } from '../../../../scripts/bots/historical-goal-ledger';
import { executionBot } from '../../features/bot-trading/execution-fixtures';

const START = 1000 * 3_600_000;
const UNIT = 10n ** 18n;
const FEE = '100000000000000';
const hash = (value: number) => `0x${value.toString(16).padStart(64, '0')}`;
/** Exact synthetic runtime FeeDetails bytes; no quote or market data is loaded. */
function feeBytes() {
  const bytes = Buffer.alloc(65);
  bytes[0] = 1;
  bytes.writeBigUInt64LE(BigInt(FEE), 1);
  return `0x${bytes.toString('hex')}`;
}
/** Reader-projection fixture, deliberately detached from real archived responses. */
function fixture(sell = false) {
  const block = (height: number, timestampMs: number) => ({
    height,
    hash: hash(height),
    parentHash: hash(height - 1),
    timestampMs,
  });
  const signal = { completedAtMs: START, closing: block(70, START - 6000), successor: block(71, START) };
  const plan = planHistoricalExecutionClock(
    signal,
    {
      version: 1,
      purpose: 'development',
      availability: 'assumed-after-successor-block',
      signalDelayMs: 60000,
      executionDelayMs: 120000,
      maximumExecutionLagMs: 60000,
    },
    { startedAtMs: START, endedAtMs: START + 86_400_000 }
  );
  const previous = block(100, START + 174000),
    execution = block(101, START + 180000);
  const pending = {
    assetIn: sell ? XOR : KUSD,
    assetOut: sell ? KUSD : XOR,
    amountInCodec: '2500000000000000000',
    expectedDenominator: '1',
  };
  const binding = {
    genesisHash: GENESIS,
    blockHash: execution.hash,
    metadataSha256: 'a'.repeat(64),
    metadataVersion: 14,
    runtimeVersion: { specVersion: 130, transactionVersion: 130 },
  };
  const request = { ...pending, block: { hash: execution.hash, height: execution.height } };
  const state = { timestampMs: execution.timestampMs, denominator: '1' };
  const quote = {
    kind: 'hypothetical-historical-execution-estimate',
    request,
    context: {
      genesisHash: GENESIS,
      block: request.block,
      parentHash: previous.hash,
      expectedDenominator: '1',
      state,
      codecBinding: binding,
    },
    quote: {
      amountOutCodec: '2500000000000000000',
      amountWithoutImpactCodec: '2500000000000000000',
      poolFeeCodec: '10000',
      dexId: 0,
      liquiditySource: 'XYKPool',
      slippageBps: 50,
      feeAssetAddress: XOR,
      route: [pending.assetIn, pending.assetOut],
    },
    envelope: {
      ...binding,
      assetIn: pending.assetIn,
      assetOut: pending.assetOut,
      amountInCodec: pending.amountInCodec,
      minimumCodec: '2487500000000000000',
      feeAssetAddress: XOR,
      estimation: {
        signature: 'fake-placeholder-only',
        nonce: '0',
        tip: '0',
        era: 'immortal',
        feeExtension: 'ChargeTransactionPayment',
      },
    },
    fees: { assetId: XOR, info: { partialFeeCodec: FEE }, details: decodeHistoricalFeeDetailsScale(feeBytes()) },
    observedFill: false,
    transactionSubmitted: false,
  };
  const pool = {
    binding,
    state,
    basis: 'direct-pool-reserve-ratio',
    status: 'present',
    accounts: { reservesAccountId: hash(501), feesAccountId: hash(502) },
    pair: { baseAssetId: XOR, targetAssetId: KUSD, baseDecimals: 18, targetDecimals: 18 },
    reserves: { kusdCodec: '100000000000000000000', xorCodec: '100000000000000000000' },
    marks: {
      xorPerKusd: { numeratorCodec: '100000000000000000000', denominatorCodec: '100000000000000000000' },
      kusdPerXor: { numeratorCodec: '100000000000000000000', denominatorCodec: '100000000000000000000' },
    },
    observedFill: false,
    transactionSubmitted: false,
  };
  return { pending, plan, previous, execution, quote, pool };
}
const prepare = (h = fixture()) =>
  prepareHistoricalGoalFill(h.pending, h.plan, h.previous, h.execution, h.quote, h.pool);

describe('causal historical quote to goal ledger join', () => {
  it('uses the quote minimum and one decoded native fee, without subtracting pool fees again', () => {
    const result = prepare();
    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') throw new Error('fixture');
    expect(result.fill).toEqual({
      inputAsset: KUSD,
      outputAsset: XOR,
      inputCodec: '2500000000000000000',
      outputCodec: '2487500000000000000',
      feeAsset: XOR,
      feeCodec: FEE,
    });
    expect(result.clock.executionAtMs).toBe(START + 180000);
    expect(Object.isFrozen(result.fill)).toBe(true);
    expect(Object.isFrozen(result.mark)).toBe(true);
    expect(result.feeEnvelopePolicy).toBe('nonce-zero-tip-zero-immortal-estimate');
    expect(result.transactionSubmitted).toBe(false);
  });

  it('passes the same exact rules for a separately frozen reverse lot', () => {
    const result = prepare(fixture(true));
    expect(result.kind === 'ready' && result.fill.inputAsset).toBe(XOR);
    const h = fixture(true);
    h.quote.request.amountInCodec = '2499999999999999999';
    expect(() => prepare(h)).toThrow();
  });

  it.each([
    'hash',
    'parent',
    'height',
    'timestamp',
    'denominator',
    'metadata',
    'runtime',
    'envelope-runtime',
    'envelope-metadata',
    'minimum',
    'fee-total',
    'fee-bytes',
    'dex',
    'source',
    'slippage',
    'input',
    'route',
    'pool-time',
    'pool-pair',
  ] as const)('rejects mismatched %s evidence before a fill is exposed', (field) => {
    const h = fixture();
    if (field === 'hash') h.quote.request.block.hash = hash(999);
    if (field === 'parent') h.quote.context.parentHash = hash(999);
    if (field === 'height') h.quote.request.block.height++;
    if (field === 'timestamp') h.quote.context.state.timestampMs++;
    if (field === 'denominator') h.quote.request.expectedDenominator = '2';
    if (field === 'metadata') h.pool.binding = { ...h.pool.binding, metadataSha256: 'b'.repeat(64) };
    if (field === 'runtime')
      h.pool.binding = { ...h.pool.binding, runtimeVersion: { specVersion: 132, transactionVersion: 132 } };
    if (field === 'envelope-runtime') h.quote.envelope.runtimeVersion = { specVersion: 131, transactionVersion: 131 };
    if (field === 'envelope-metadata') h.quote.envelope.metadataVersion = 13;
    if (field === 'minimum') h.quote.envelope.minimumCodec = '2500000000000000000';
    if (field === 'fee-total') h.quote.fees.details.finalFee = '1';
    if (field === 'fee-bytes') h.quote.fees.details.encodedHex = '0x01';
    if (field === 'dex') h.quote.quote.dexId = 1;
    if (field === 'source') h.quote.quote.liquiditySource = 'Default';
    if (field === 'slippage') h.quote.quote.slippageBps = 100;
    if (field === 'input') h.pending.amountInCodec = '2000000000000000000';
    if (field === 'route') h.quote.quote.route.reverse();
    if (field === 'pool-time') h.pool.state = { ...h.pool.state, timestampMs: h.execution.timestampMs - 6000 };
    if (field === 'pool-pair') h.pool.pair.targetAssetId = XOR;
    expect(() => prepare(h)).toThrow();
  });

  it('allows exactly 1% impact, rejects one output atom below that boundary, and never resizes', () => {
    const h = fixture();
    h.quote.quote.amountWithoutImpactCodec = '1000000000000000000';
    h.quote.quote.amountOutCodec = '990000000000000000';
    h.quote.envelope.minimumCodec = '985050000000000000';
    expect(prepare(h).kind).toBe('ready');
    h.quote.quote.amountOutCodec = '989999999999999999';
    h.quote.envelope.minimumCodec = '985049999999999999';
    const result = prepare(h);
    expect(result.kind).toBe('impact-limit');
    expect('fill' in result).toBe(false);
    expect(h.pending.amountInCodec).toBe('2500000000000000000');
  });

  it('retains explicit unavailable quotes and pools instead of constructing a zero-price fill', () => {
    const h = fixture();
    const unavailable = { kind: 'historical-quote-unavailable', request: h.quote.request, context: h.quote.context };
    const run = (pool: unknown) =>
      prepareHistoricalGoalFill(h.pending, h.plan, h.previous, h.execution, unavailable, pool);
    expect(run(h.pool).kind).toBe('quote-unavailable');
    expect(run({ ...h.pool, status: 'absent', accounts: null, reserves: null, marks: null }).kind).toBe(
      'pool-unavailable'
    );
    expect(run({ ...h.pool, status: 'missing-reserves', reserves: null, marks: null }).kind).toBe('pool-unavailable');
    expect(
      run({
        ...h.pool,
        status: 'zero-reserves',
        reserves: { kusdCodec: '0', xorCodec: h.pool.reserves.xorCodec },
        marks: null,
      }).kind
    ).toBe('pool-unavailable');
  });

  it('rejects ready projections relabelled unavailable and contradictory pool states', () => {
    const h = fixture();
    h.quote.kind = 'historical-quote-unavailable';
    expect(() => prepare(h)).toThrow();
    for (const status of ['absent', 'missing-reserves', 'zero-reserves']) {
      const other = fixture();
      other.pool.status = status;
      expect(() => prepare(other)).toThrow();
    }
    const other = fixture();
    other.pool.marks.xorPerKusd.numeratorCodec = '1';
    expect(() => prepare(other)).toThrow();
  });

  it('does not invoke accessor-backed amounts or route members', () => {
    const getter = vi.fn();
    const h = fixture();
    Object.defineProperty(h.quote.quote, 'amountOutCodec', { enumerable: true, get: getter });
    expect(() => prepare(h)).toThrow();
    const other = fixture();
    Object.defineProperty(other.quote.quote.route, '0', { enumerable: true, get: getter });
    expect(() => prepare(other)).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });

  it('integrates with exact ledger admission and leaves the fee reserve protected', () => {
    const h = fixture(),
      result = prepare(h);
    if (result.kind !== 'ready') throw new Error('fixture');
    const bot = executionBot();
    bot.mode = 'paper';
    bot.assetIn = { address: KUSD, symbol: 'KUSD', decimals: 18 };
    bot.assetOut = { address: XOR, symbol: 'XOR', decimals: 18 };
    bot.strategy.amount = '2.5';
    bot.policy.feeAsset = bot.assetOut;
    bot.policy.slippagePercent = '0.5';
    bot.policy.maxPriceImpactPercent = '1';
    bot.policy.maxTradeCodec = { [KUSD]: '2500000000000000000', [XOR]: String(10n * UNIT) };
    bot.policy.sessionDurationMs = 86_400_000;
    bot.portfolio = {
      initial: { [KUSD]: String(10n * UNIT), [XOR]: String(UNIT) },
      holdings: { [KUSD]: String(10n * UNIT), [XOR]: String(UNIT) },
      feesPaidCodec: '0',
      trades: 0,
    };
    bot.goal = {
      title: 'Grow XOR',
      targetReturnPercent: '5',
      maxLossPercent: '5',
      durationMs: 86_400_000,
      valuationAsset: 'output',
      lossMetric: 'drawdown',
    };
    const opening = createHistoricalGoalLedger(bot, h.plan.episode, {
      ...result.mark,
      timestampMs: START,
      blockHash: h.plan.signal.successor.hash,
    });
    const success = applyHistoricalGoalFill(opening, result.fill, result.mark, 'minimum-output-success');
    expect(success.rejection).toBeUndefined();
    expect(success.state.bot.portfolio.holdings[KUSD]).toBe('7500000000000000000');
    expect(success.state.bot.portfolio.holdings[XOR]).toBe('3487400000000000000');
    expect(success.state.bot.portfolio.feesPaidCodec).toBe(FEE);
    const failure = applyHistoricalGoalFill(opening, result.fill, result.mark, 'fee-only-failure');
    expect(failure.state.bot.portfolio.holdings[KUSD]).toBe(String(10n * UNIT));
    expect(failure.state.bot.portfolio.holdings[XOR]).toBe(String(UNIT - BigInt(FEE)));
    expect(opening.bot.portfolio.trades).toBe(0);
  });
});
