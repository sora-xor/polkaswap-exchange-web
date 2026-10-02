/** Join already verified archive-reader evidence into a hypothetical fill; no wallet or network operation. */
import { isExactInputQuoteWithinImpactLimit } from '../../src/features/bot-trading/quote-impact';
import {
  historicalMinimumCodec,
  assertHistoricalFeeDetailsMatchesQueryInfo,
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from './historical-execution-codec';
import {
  verifyHistoricalExecutionClock,
  type HistoricalClockBlock,
  type HistoricalExecutionClockPlan,
} from './historical-execution-clock';
import type { HistoricalGoalMark } from './historical-goal-ledger';
import type { PaperFill } from '../../src/features/bot-trading/engine';

/** Exact proposal units are frozen when the signal occurs; execution cannot resize them. */
export interface HistoricalGoalPendingInput {
  assetIn: string;
  assetOut: string;
  amountInCodec: string;
  expectedDenominator: string;
}

const fail = (): never => {
  throw new Error('Inconsistent historical goal quote evidence');
};
/** Inspect only own data properties before consuming a reader's normalized projection. */
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
    return fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Reflect.ownKeys(descriptors).some(
      (key) => typeof key !== 'string' || !descriptors[key].enumerable || !('value' in descriptors[key])
    )
  )
    return fail();
  return Object.fromEntries(Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]));
}
/** A normalized chain balance is a canonical u128 string, never a JS number or a natural token amount. */
function amount(value: unknown, positive = true): string {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,38})$/.test(value)) return fail();
  const parsed = BigInt(value);
  if (parsed > (1n << 128n) - 1n || (positive && !parsed)) return fail();
  return value;
}
function requireValue(value: unknown): void {
  if (!value) fail();
}

/**
 * Bind a causal clock, frozen exact input, amount-specific quote, fee estimate and same-state reserves.
 * The upstream readers remain responsible for RPC/finality/metadata provenance; this join does not
 * authenticate arbitrary JSON. Its output is a development minimum-output scenario, never live authority.
 */
export function prepareHistoricalGoalFill(
  input: HistoricalGoalPendingInput,
  plan: HistoricalExecutionClockPlan,
  previous: HistoricalClockBlock,
  execution: HistoricalClockBlock,
  quoteEvidence: unknown,
  poolEvidence: unknown
) {
  const pending = record(input);
  requireValue(Object.keys(pending).length === 4);
  const amountInCodec = amount(pending.amountInCodec);
  const denominator = amount(pending.expectedDenominator);
  requireValue(
    (pending.assetIn === KUSD && pending.assetOut === XOR) || (pending.assetIn === XOR && pending.assetOut === KUSD)
  );
  const clock = verifyHistoricalExecutionClock(plan, previous, execution);
  const evidence = record(quoteEvidence);
  requireValue(
    ['hypothetical-historical-execution-estimate', 'historical-quote-unavailable'].includes(evidence.kind as string)
  );
  if (evidence.kind === 'historical-quote-unavailable')
    requireValue(
      ['quote', 'envelope', 'fees', 'observedFill', 'transactionSubmitted'].every(
        (key) => !Object.hasOwn(evidence, key)
      )
    );
  const request = record(evidence.request);
  const requestedBlock = record(request.block);
  const context = record(evidence.context);
  const block = record(context.block);
  const state = record(context.state);
  for (const candidate of [requestedBlock, block])
    requireValue(candidate.hash === execution.hash && candidate.height === execution.height);
  requireValue(context.genesisHash === GENESIS && context.parentHash === previous.hash);
  requireValue(
    request.assetIn === pending.assetIn &&
      request.assetOut === pending.assetOut &&
      request.amountInCodec === amountInCodec
  );
  requireValue(
    request.expectedDenominator === denominator &&
      context.expectedDenominator === denominator &&
      state.denominator === denominator
  );
  requireValue(state.timestampMs === execution.timestampMs);
  const pool = record(poolEvidence);
  const poolState = record(pool.state);
  const binding = record(pool.binding);
  const quoteBinding = record(context.codecBinding);
  requireValue(binding.genesisHash === GENESIS && binding.blockHash === execution.hash);
  requireValue(quoteBinding.genesisHash === GENESIS && quoteBinding.blockHash === execution.hash);
  requireValue(typeof binding.metadataSha256 === 'string' && /^[0-9a-f]{64}$/.test(binding.metadataSha256));
  requireValue(
    binding.metadataSha256 === quoteBinding.metadataSha256 &&
      binding.metadataVersion === 14 &&
      quoteBinding.metadataVersion === 14
  );
  const runtime = record(binding.runtimeVersion),
    quoteRuntime = record(quoteBinding.runtimeVersion);
  requireValue(
    [130, 131].includes(runtime.specVersion as number) && runtime.specVersion === runtime.transactionVersion
  );
  requireValue(
    runtime.specVersion === quoteRuntime.specVersion && runtime.transactionVersion === quoteRuntime.transactionVersion
  );
  requireValue(poolState.timestampMs === execution.timestampMs && poolState.denominator === denominator);
  requireValue(
    pool.observedFill === false && pool.transactionSubmitted === false && pool.basis === 'direct-pool-reserve-ratio'
  );
  const pair = record(pool.pair);
  requireValue(
    pair.baseAssetId === XOR && pair.targetAssetId === KUSD && pair.baseDecimals === 18 && pair.targetDecimals === 18
  );
  requireValue(['present', 'absent', 'missing-reserves', 'zero-reserves'].includes(pool.status as string));
  if (pool.status === 'absent') {
    requireValue(pool.accounts === null && pool.reserves === null && pool.marks === null);
    return Object.freeze({
      kind: 'pool-unavailable' as const,
      poolStatus: pool.status,
      clock,
      observedFill: false as const,
    });
  }
  const accounts = record(pool.accounts);
  requireValue(
    ['reservesAccountId', 'feesAccountId'].every(
      (key) => typeof accounts[key] === 'string' && /^0x[0-9a-f]{64}$/.test(accounts[key] as string)
    )
  );
  if (pool.status === 'missing-reserves') {
    requireValue(pool.reserves === null && pool.marks === null);
    return Object.freeze({
      kind: 'pool-unavailable' as const,
      poolStatus: pool.status,
      clock,
      observedFill: false as const,
    });
  }
  const reserves = record(pool.reserves);
  const kusdReserve = amount(reserves.kusdCodec, false),
    xorReserve = amount(reserves.xorCodec, false);
  if (pool.status === 'zero-reserves') {
    requireValue((kusdReserve === '0' || xorReserve === '0') && pool.marks === null);
    return Object.freeze({
      kind: 'pool-unavailable' as const,
      poolStatus: pool.status,
      clock,
      observedFill: false as const,
    });
  }
  const marks = record(pool.marks),
    xorPerKusd = record(marks.xorPerKusd),
    kusdPerXor = record(marks.kusdPerXor);
  requireValue(
    xorPerKusd.numeratorCodec === xorReserve &&
      xorPerKusd.denominatorCodec === kusdReserve &&
      kusdPerXor.numeratorCodec === kusdReserve &&
      kusdPerXor.denominatorCodec === xorReserve
  );
  const mark: Readonly<HistoricalGoalMark> = Object.freeze({
    timestampMs: execution.timestampMs,
    blockHash: execution.hash,
    kusdReserveCodec: amount(reserves.kusdCodec),
    xorReserveCodec: amount(reserves.xorCodec),
  });
  if (evidence.kind === 'historical-quote-unavailable')
    return Object.freeze({ kind: 'quote-unavailable' as const, mark, clock, observedFill: false as const });
  requireValue(evidence.observedFill === false && evidence.transactionSubmitted === false);
  const quote = record(evidence.quote);
  const out = amount(quote.amountOutCodec),
    without = amount(quote.amountWithoutImpactCodec);
  amount(quote.poolFeeCodec, false);
  requireValue(
    quote.dexId === 0 &&
      quote.liquiditySource === 'XYKPool' &&
      quote.slippageBps === 50 &&
      quote.feeAssetAddress === XOR
  );
  const route = quote.route;
  requireValue(Array.isArray(route) && route.length === 2 && Reflect.ownKeys(route).length === 3);
  for (const [index, asset] of [pending.assetIn, pending.assetOut].entries()) {
    const descriptor = Object.getOwnPropertyDescriptor(route, index);
    requireValue(descriptor?.enumerable && 'value' in descriptor && descriptor.value === asset);
  }
  const envelope = record(evidence.envelope);
  const minimum = historicalMinimumCodec(out);
  requireValue(
    envelope.genesisHash === GENESIS &&
      envelope.blockHash === execution.hash &&
      envelope.metadataSha256 === quoteBinding.metadataSha256 &&
      envelope.metadataVersion === quoteBinding.metadataVersion
  );
  const envelopeRuntime = record(envelope.runtimeVersion);
  requireValue(
    envelopeRuntime.specVersion === quoteRuntime.specVersion &&
      envelopeRuntime.transactionVersion === quoteRuntime.transactionVersion
  );
  requireValue(
    envelope.assetIn === pending.assetIn &&
      envelope.assetOut === pending.assetOut &&
      envelope.amountInCodec === amountInCodec
  );
  requireValue(envelope.minimumCodec === minimum && envelope.feeAssetAddress === XOR);
  const estimation = record(envelope.estimation);
  requireValue(
    estimation.signature === 'fake-placeholder-only' &&
      estimation.nonce === '0' &&
      estimation.tip === '0' &&
      estimation.era === 'immortal' &&
      estimation.feeExtension === 'ChargeTransactionPayment'
  );
  const fees = record(evidence.fees),
    info = record(fees.info),
    details = record(fees.details);
  requireValue(fees.assetId === XOR);
  const decoded = assertHistoricalFeeDetailsMatchesQueryInfo(details.encodedHex, amount(info.partialFeeCodec), '0');
  requireValue(
    details.finalFee === decoded.finalFee &&
      details.tip === '0' &&
      details.inclusionFeeTotal === decoded.inclusionFeeTotal
  );
  if (!isExactInputQuoteWithinImpactLimit(out, without, '1'))
    return Object.freeze({ kind: 'impact-limit' as const, mark, clock, observedFill: false as const });
  const fill: Readonly<PaperFill> = Object.freeze({
    inputAsset: pending.assetIn as string,
    outputAsset: pending.assetOut as string,
    inputCodec: amountInCodec,
    outputCodec: minimum,
    feeAsset: XOR,
    feeCodec: decoded.finalFee,
  });
  return Object.freeze({
    kind: 'ready' as const,
    fill,
    mark,
    clock,
    scenario: 'minimum-output-success' as const,
    feeEnvelopePolicy: 'nonce-zero-tip-zero-immortal-estimate' as const,
    observedFill: false as const,
    transactionSubmitted: false as const,
  });
}
