/** Offline bounded-fee receipt join. No network, wallet, signing or strategy-selection capability. */
import { createHash } from 'node:crypto';
import {
  createHistoricalExecutionCodec,
  assertHistoricalFeeDetailsMatchesQueryInfo,
  HISTORICAL_EXECUTION_XOR as XOR,
  type HistoricalExecutionIdentity,
  type HistoricalSwapRequest,
} from './historical-execution-codec';
import { createHistoricalGoalFeeCodec } from './historical-goal-fee-codec';
import type { prepareHistoricalGoalFill } from './historical-goal-quote';
import { isExactInputQuoteWithinImpactLimit } from '../../src/features/bot-trading/quote-impact';

type Prepared = ReturnType<typeof prepareHistoricalGoalFill>;
type BoundEnvelope = ReturnType<ReturnType<typeof createHistoricalGoalFeeCodec>['buildBoundSwapEnvelope']>;

/** Already verified archive-reader projection supplies the original output, state and codec binding. */
export interface HistoricalGoalBoundFeeSource {
  identity: HistoricalExecutionIdentity;
  blockNumber: number;
  request: HistoricalSwapRequest;
  quoteEvidence: unknown;
}

/** A projection of retained raw RPC evidence, whose transport/finality attestation remains upstream. */
export interface HistoricalGoalBoundFeeReceipt {
  version: 1;
  kind: 'historical-goal-bound-fee-receipt';
  envelope: BoundEnvelope;
  feeAssetAddress: string;
  queries: {
    info: {
      method: 'state_call';
      params: readonly [string, string, string];
      resultHex: string;
    };
    details: {
      method: 'state_call';
      params: readonly [string, string, string];
      resultHex: string;
    };
  };
}

const fail = (): never => {
  throw new Error('Inconsistent historical goal bounded-fee evidence');
};
function requireValue(value: unknown): asserts value {
  if (!value) fail();
}

/** Copy bounded own data, rejecting accessors, classes, cycles, sparse arrays and executable properties. */
function copyData<T>(value: T): T {
  let nodes = 0;
  let characters = 0;
  const active = new Set<object>();
  const copy = (input: unknown, depth: number): unknown => {
    if (++nodes > 20000 || depth > 24) return fail();
    if (typeof input === 'string') {
      characters += input.length;
      if (input.length > 4_194_306 || characters > 8_388_608) return fail();
      return input;
    }
    if (input === null || typeof input === 'boolean') return input;
    if (typeof input === 'number') return Number.isSafeInteger(input) ? input : fail();
    if (!input || typeof input !== 'object' || active.has(input)) return fail();
    active.add(input);
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== 'string' || !('value' in descriptors[key]))) return fail();
    let result: unknown;
    if (Array.isArray(input)) {
      if (Object.getPrototypeOf(input) !== Array.prototype || input.length > 4096 || keys.length !== input.length + 1)
        return fail();
      result = Array.from({ length: input.length }, (_, index) => {
        if (!descriptors[index]?.enumerable) return fail();
        return copy(descriptors[index].value, depth + 1);
      });
    } else {
      if (![Object.prototype, null].includes(Object.getPrototypeOf(input))) return fail();
      if (keys.some((key) => !descriptors[key as string].enumerable)) return fail();
      result = Object.fromEntries(keys.map((key) => [key, copy(descriptors[key as string].value, depth + 1)]));
    }
    active.delete(input);
    return result;
  };
  return copy(value, 0) as T;
}

/** Inspect shallow descriptors before reading a source projection; unused raw RPC bodies need not be copied. */
function record(value: unknown, keys?: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) return fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const own = Reflect.ownKeys(descriptors);
  if (own.some((key) => typeof key !== 'string' || !descriptors[key].enumerable || !('value' in descriptors[key])))
    return fail();
  if (keys && (own.length !== keys.length || keys.some((key) => !Object.hasOwn(descriptors, key)))) return fail();
  return Object.fromEntries(own.map((key) => [key, descriptors[key as string].value]));
}
function amount(value: unknown, positive = true): string {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,38})$/.test(value)) return fail();
  const parsed = BigInt(value);
  if (parsed > (1n << 128n) - 1n || (positive && parsed === 0n)) return fail();
  return value;
}
function hash(value: unknown): string {
  if (typeof value !== 'string' || !/^0x[0-9a-f]{64}$/.test(value)) return fail();
  return value;
}
function positiveTime(value: unknown): void {
  requireValue(Number.isSafeInteger(value) && (value as number) > 0);
}
/** Canonicalize only a detached data snapshot, never a caller object with toJSON/getter behavior. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
const same = (left: unknown, right: unknown) => canonical(copyData(left)) === canonical(copyData(right));
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Preserve only recognized join outcomes with their exact output shape, including rejected opportunities. */
function preparedCopy(input: unknown): Prepared {
  const copied = copyData(input);
  const prepared = record(copied);
  const common = ['kind', 'clock', 'observedFill'];
  if (prepared.kind === 'ready') {
    record(prepared, [...common, 'fill', 'mark', 'scenario', 'feeEnvelopePolicy', 'transactionSubmitted']);
    requireValue(prepared.scenario === 'minimum-output-success' && prepared.transactionSubmitted === false);
    requireValue(prepared.feeEnvelopePolicy === 'nonce-zero-tip-zero-immortal-estimate');
    const fill = record(prepared.fill, [
      'inputAsset',
      'inputCodec',
      'outputAsset',
      'outputCodec',
      'feeAsset',
      'feeCodec',
    ]);
    hash(fill.inputAsset);
    hash(fill.outputAsset);
    requireValue(fill.feeAsset === XOR && fill.inputAsset !== fill.outputAsset);
    for (const key of ['inputCodec', 'outputCodec', 'feeCodec']) amount(fill[key]);
  } else if (prepared.kind === 'pool-unavailable') {
    record(prepared, [...common, 'poolStatus']);
    requireValue(['absent', 'missing-reserves', 'zero-reserves'].includes(prepared.poolStatus as string));
  } else if (prepared.kind === 'quote-unavailable' || prepared.kind === 'impact-limit') {
    record(prepared, [...common, 'mark']);
  } else return fail();
  requireValue(prepared.observedFill === false);
  const clock = record(prepared.clock, ['kind', 'executionAtMs', 'lagMs', 'observedFill']);
  requireValue(clock.kind === 'hypothetical-archived-quote-state' && clock.observedFill === false);
  positiveTime(clock.executionAtMs);
  requireValue(Number.isSafeInteger(clock.lagMs) && (clock.lagMs as number) >= 0);
  if (prepared.kind !== 'pool-unavailable') {
    const mark = record(prepared.mark, ['timestampMs', 'blockHash', 'kusdReserveCodec', 'xorReserveCodec']);
    requireValue(mark.timestampMs === clock.executionAtMs);
    hash(mark.blockHash);
    amount(mark.kusdReserveCodec);
    amount(mark.xorReserveCodec);
  }
  return copied as Prepared;
}

/** Validate and detach the shared original quote binding before any bounded-fee reader starts RPC work. */
export function prepareHistoricalGoalBoundFeeSource(sourceInput: unknown) {
  const source = record(sourceInput, ['identity', 'blockNumber', 'request', 'quoteEvidence']);
  const identity = copyData(source.identity);
  const request = record(copyData(source.request), ['assetIn', 'assetOut', 'amountInCodec', 'quotedAmountOutCodec']);
  const feeCodec = createHistoricalGoalFeeCodec(identity);
  const codec = createHistoricalExecutionCodec(identity);
  const bound = feeCodec.buildBoundSwapEnvelope(request, { blockNumber: source.blockNumber });
  const originalEnvelope = codec.buildSwapEnvelope(request);
  const evidence = record(source.quoteEvidence);
  requireValue(evidence.kind === 'hypothetical-historical-execution-estimate');
  requireValue(evidence.observedFill === false && evidence.transactionSubmitted === false);
  const originalRequest = record(evidence.request);
  const context = record(evidence.context);
  const state = record(context.state);
  const quote = record(evidence.quote);
  requireValue(context.genesisHash === bound.genesisHash && same(context.codecBinding, codec.binding));
  for (const value of [originalRequest.block, context.block]) {
    const block = record(value, ['hash', 'height']);
    requireValue(block.hash === bound.blockHash && block.height === source.blockNumber);
  }
  positiveTime(state.timestampMs);
  hash(context.parentHash);
  const denominator = amount(state.denominator);
  requireValue(originalRequest.expectedDenominator === denominator && context.expectedDenominator === denominator);
  requireValue(
    originalRequest.assetIn === request.assetIn &&
      originalRequest.assetOut === request.assetOut &&
      originalRequest.amountInCodec === request.amountInCodec &&
      quote.amountOutCodec === request.quotedAmountOutCodec
  );
  requireValue(
    quote.dexId === 0 &&
      quote.liquiditySource === 'XYKPool' &&
      quote.slippageBps === 50 &&
      quote.feeAssetAddress === XOR
  );
  requireValue(same(quote.route, [request.assetIn, request.assetOut]));
  amount(quote.poolFeeCodec, false);
  requireValue(BigInt(amount(quote.amountWithoutImpactCodec)) >= BigInt(amount(quote.amountOutCodec)));
  requireValue(same(evidence.envelope, originalEnvelope));
  const oldFees = record(evidence.fees);
  const oldInfo = record(oldFees.info);
  const oldDetails = record(oldFees.details);
  requireValue(oldFees.assetId === XOR);
  const decodedOldFee = assertHistoricalFeeDetailsMatchesQueryInfo(
    oldDetails.encodedHex,
    amount(oldInfo.partialFeeCodec),
    '0'
  );
  requireValue(same(oldDetails, decodedOldFee));
  return freeze({
    identity: identity as HistoricalExecutionIdentity,
    request: {
      assetIn: bound.assetIn,
      assetOut: bound.assetOut,
      amountInCodec: bound.amountInCodec,
      quotedAmountOutCodec: amount(request.quotedAmountOutCodec),
    },
    blockNumber: source.blockNumber as number,
    binding: codec.binding,
    bound,
    originalEnvelope,
    state: { timestampMs: state.timestampMs as number, denominator },
    quote: {
      amountOutCodec: amount(quote.amountOutCodec),
      amountWithoutImpactCodec: amount(quote.amountWithoutImpactCodec),
    },
    originalFeeCodec: decodedOldFee.finalFee,
  });
}

/**
 * Replace only a ready minimum-output fill's native fee with a redecoded bound-envelope estimate.
 * Quotes/pool/finality/transport are verified upstream; arbitrary matching JSON is not authentication.
 * Non-ready joins return detached unchanged evidence without inspecting the supplied source or receipt.
 */
export function applyHistoricalGoalBoundFee(preparedInput: unknown, sourceInput: unknown, receiptInput: unknown) {
  const prepared = preparedCopy(preparedInput);
  if (prepared.kind !== 'ready') return freeze(prepared);
  const source = prepareHistoricalGoalBoundFeeSource(sourceInput);
  const { bound, request } = source;
  const codec = createHistoricalExecutionCodec(source.identity);
  requireValue(
    isExactInputQuoteWithinImpactLimit(source.quote.amountOutCodec, source.quote.amountWithoutImpactCodec, '1')
  );
  requireValue(
    prepared.mark.blockHash === bound.blockHash && source.state.timestampMs === prepared.clock.executionAtMs
  );
  requireValue(
    same(prepared.fill, {
      inputAsset: bound.assetIn,
      inputCodec: bound.amountInCodec,
      outputAsset: bound.assetOut,
      outputCodec: bound.minimumCodec,
      feeAsset: XOR,
      feeCodec: source.originalFeeCodec,
    })
  );

  const receipt = record(copyData(receiptInput), ['version', 'kind', 'envelope', 'feeAssetAddress', 'queries']);
  requireValue(
    receipt.version === 1 && receipt.kind === 'historical-goal-bound-fee-receipt' && receipt.feeAssetAddress === XOR
  );
  requireValue(same(receipt.envelope, bound));
  const queries = record(receipt.queries, ['info', 'details']);
  const results = ['info', 'details'].map((key, index) => {
    const query = record(queries[key], ['method', 'params', 'resultHex']);
    requireValue(query.method === 'state_call');
    requireValue(
      same(query.params, [
        index === 0 ? 'TransactionPaymentApi_query_info' : 'TransactionPaymentApi_query_fee_details',
        bound.feeQueryDataHex,
        bound.blockHash,
      ])
    );
    return query.resultHex;
  });
  const info = codec.decodeQueryInfo(results[0]);
  const details = assertHistoricalFeeDetailsMatchesQueryInfo(results[1], info.partialFeeCodec, '0');
  const evidenceForDigest = {
    version: 1,
    binding: codec.binding,
    blockNumber: source.blockNumber,
    request,
    prepared,
    receipt,
  };
  const feeEvidenceDigest = createHash('sha256')
    .update(canonical(copyData(evidenceForDigest)), 'utf8')
    .digest('hex');
  return freeze({
    ...prepared,
    fill: { ...prepared.fill, feeCodec: details.finalFee },
    feeEnvelopePolicy: bound.policy.id,
    feePolicy: bound.policy,
    feePolicySha256: bound.policySha256,
    feeEvidenceDigest,
    feeEvidenceHashEncoding: 'sha256-canonical-json-utf8' as const,
    feeAdequacyVerified: false as const,
  });
}
