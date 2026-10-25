/** Pure public execution-evidence contracts. No wallet, browser, network, or application state is reachable here. */
import { createHash } from 'node:crypto';

export const EXECUTION_EVIDENCE_ENDPOINT = 'wss://ws.mof.sora.org';
export const EXECUTION_EVIDENCE_GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
export const EXECUTION_EVIDENCE_KUSD = '0x02000c0000000000000000000000000000000000000000000000000000000000';
export const EXECUTION_EVIDENCE_XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';
export const EXECUTION_EVIDENCE_INPUT_CODEC = '5000000000000000000';
export const EXECUTION_EVIDENCE_SLIPPAGE_BPS = 50;

export interface ExecutionRuntimeVersion {
  specVersion: number;
  transactionVersion: number;
}
export interface ExecutionContext extends ExecutionRuntimeVersion {
  endpoint: string;
  genesisHash: string;
  blockHash: string;
  blockNumber: number;
  finalizedAt: number;
  denominator: string;
  /** Exact metadata format requested from the runtime, matching the SDK's encoding metadata. */
  metadataFormatVersion: number;
  metadataReadMethod: 'Metadata_metadata_at_version';
  metadataHashAlgorithm: 'sha256';
  metadataHash: string;
  dexId: 0;
  allowedSourceTypes: ['XYKPool'];
  filterMode: 'AllowSelected';
  /** Stable public pool identity, preserved from the pinned exact-pair properties. */
  poolIdentity: string;
}
export interface ExecutionRouteFee {
  assetAddress: string;
  amountCodec: string;
}
export interface ExecutionFeeEvidence {
  partialFeeCodec: string;
  baseFeeCodec: string;
  lenFeeCodec: string;
  adjustedWeightFeeCodec: string;
  tipCodec: string;
  encodedLength: number;
  callHex: string;
  envelopeHashAlgorithm: 'sha256';
  envelopeHash: string;
  blockHash: string;
  runtimeVersion: ExecutionRuntimeVersion;
  rawQueryInfo: unknown;
  rawFeeDetails: unknown;
}
export interface ExecutionRawQuote {
  blockHash: string;
  assetIn: string;
  assetOut: string;
  assetInDecimals: 18;
  assetOutDecimals: 18;
  amountInCodec: string;
  amountOutCodec: string;
  amountWithoutImpactCodec: string;
  route: string[];
  routeFees: ExecutionRouteFee[];
  /** Unmodified unwrapped RPC value.toJSON(); normalized amounts, route and fee map must agree. */
  rawQuoteJson: unknown;
  fee: ExecutionFeeEvidence;
}
export interface ExecutionQuote extends ExecutionRawQuote {
  slippageBps: 50;
  minimumCodec: string;
  /** Exact signed percentage fraction: (impact-free output − output) × 100 / impact-free output. */
  priceImpact: { numerator: string; denominator: string };
}
export type ExecutionReverseLot =
  | { kind: 'same-block-buy-minimum' }
  | { kind: 'fixed-frozen-lot'; amountCodec: string; frozenAt: number; lotId: string };
/** Wall-clock intervals around each quote adapter request, including its fee queries; never fill timestamps. */
export interface ExecutionQuoteTiming {
  buy: { startedAt: number; finishedAt: number };
  sell: { startedAt: number; finishedAt: number };
}
export interface ExecutionSnapshot {
  schemaVersion: 1;
  purpose: 'development';
  slotAt: number;
  requestStartedAt: number;
  requestFinishedAt: number;
  context: ExecutionContext;
  buy: ExecutionQuote;
  sell: ExecutionQuote;
  reverseLot: ExecutionReverseLot;
  /** Absent only on legacy observations; these intervals do not establish inclusion or individual market-response freshness. */
  quoteTiming?: ExecutionQuoteTiming;
}

const HASH = /^0x[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const DECIMAL = /^(0|[1-9]\d*)$/;
const fail = (): never => {
  throw new Error('Invalid execution evidence');
};

/** Canonical JSON rejects non-data values and preserves exact strings while sorting object keys. */
export function canonicalEvidenceJson(value: unknown): string {
  const ancestors = new Set<object>();
  const visit = (item: unknown): unknown => {
    if (item === null || typeof item === 'boolean' || typeof item === 'string') return item;
    if (typeof item === 'number') return Number.isSafeInteger(item) ? item : fail();
    if (!item || typeof item !== 'object' || ancestors.has(item)) return fail();
    const prototype = Object.getPrototypeOf(item);
    if (!Array.isArray(item) && prototype !== Object.prototype && prototype !== null) return fail();
    ancestors.add(item);
    let result: unknown;
    if (Array.isArray(item)) {
      if (Reflect.ownKeys(item).length !== item.length + 1) return fail();
      const entries: unknown[] = [];
      for (let index = 0; index < item.length; index++) {
        const descriptor = Object.getOwnPropertyDescriptor(item, String(index));
        if (!descriptor?.enumerable || !('value' in descriptor)) return fail();
        entries.push(visit(descriptor.value));
      }
      result = entries;
    } else {
      const target: Record<string, unknown> = Object.create(null);
      const keys = Reflect.ownKeys(item);
      if (keys.some((key) => typeof key !== 'string')) return fail();
      for (const key of (keys as string[]).sort()) {
        const descriptor = Object.getOwnPropertyDescriptor(item, key)!;
        if (!descriptor.enumerable || !('value' in descriptor)) return fail();
        target[key] = visit(descriptor.value);
      }
      result = target;
    }
    ancestors.delete(item);
    return result;
  };
  return JSON.stringify(visit(value));
}

/** SHA-256 of canonical UTF-8 JSON, returned as 64 lowercase hexadecimal characters. */
export function hashEvidence(value: unknown): string {
  return createHash('sha256').update(canonicalEvidenceJson(value)).digest('hex');
}

function amount(value: unknown, positive = false): bigint {
  if (typeof value !== 'string' || value.length > 120 || !DECIMAL.test(value)) return fail();
  const parsed = BigInt(value);
  if (positive && parsed === 0n) return fail();
  return parsed;
}

/** Floor an exact output to the declared 0.5% slippage minimum without floating-point token math. */
export function floorMinimum(amountCodec: string, slippageBps = EXECUTION_EVIDENCE_SLIPPAGE_BPS): string {
  if (slippageBps !== EXECUTION_EVIDENCE_SLIPPAGE_BPS) return fail();
  return ((amount(amountCodec, true) * 9950n) / 10000n).toString();
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  return value as Record<string, unknown>;
}

function integer(value: unknown, minimum = 0): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) fail();
}

function runtime(value: ExecutionRuntimeVersion): void {
  object(value);
  integer(value.specVersion, 1);
  integer(value.transactionVersion);
}

/** Decode the SDK's raw JSON balances, which may be SCALE hex or safe small JSON integers. */
function rawAmount(value: unknown): string {
  if (typeof value === 'number') {
    integer(value);
    return String(value);
  }
  if (typeof value !== 'string' || value.length > 122) return fail();
  if (DECIMAL.test(value) || /^0x[0-9a-fA-F]+$/.test(value)) return BigInt(value).toString();
  return fail();
}

function rawAsset(value: unknown): string {
  const address = typeof value === 'string' ? value : object(value).code;
  if (typeof address !== 'string' || !HASH.test(address)) return fail();
  return address;
}

function validateRawQuote(quote: ExecutionRawQuote): void {
  object(quote);
  if (!HASH.test(quote.blockHash) || quote.assetInDecimals !== 18 || quote.assetOutDecimals !== 18) fail();
  if (
    !(
      (quote.assetIn === EXECUTION_EVIDENCE_KUSD && quote.assetOut === EXECUTION_EVIDENCE_XOR) ||
      (quote.assetIn === EXECUTION_EVIDENCE_XOR && quote.assetOut === EXECUTION_EVIDENCE_KUSD)
    )
  )
    fail();
  amount(quote.amountInCodec, true);
  amount(quote.amountOutCodec, true);
  amount(quote.amountWithoutImpactCodec, true);
  if (
    !Array.isArray(quote.route) ||
    quote.route.length !== 2 ||
    quote.route[0] !== quote.assetIn ||
    quote.route[1] !== quote.assetOut
  )
    fail();
  if (!Array.isArray(quote.routeFees) || quote.routeFees.length > 1) fail();
  for (const fee of quote.routeFees) {
    if (fee.assetAddress !== EXECUTION_EVIDENCE_XOR) fail();
    amount(fee.amountCodec);
  }
  const raw = object(quote.rawQuoteJson);
  if (
    rawAmount(raw.amount) !== quote.amountOutCodec ||
    rawAmount(raw.amountWithoutImpact) !== quote.amountWithoutImpactCodec
  )
    fail();
  if (
    !Array.isArray(raw.route) ||
    raw.route.length !== quote.route.length ||
    raw.route.some((asset, index) => rawAsset(asset) !== quote.route[index])
  )
    fail();
  const rawFees = object(raw.fee);
  if (Object.keys(rawFees).length !== quote.routeFees.length) fail();
  for (const fee of quote.routeFees) if (rawAmount(rawFees[fee.assetAddress]) !== fee.amountCodec) fail();
}

function validateFee(fee: ExecutionFeeEvidence): void {
  object(fee);
  const total = amount(fee.partialFeeCodec, true);
  const base = amount(fee.baseFeeCodec);
  const length = amount(fee.lenFeeCodec);
  const weight = amount(fee.adjustedWeightFeeCodec);
  const tip = amount(fee.tipCodec);
  if (total !== base + length + weight + tip || !HASH.test(fee.blockHash)) fail();
  integer(fee.encodedLength, 1);
  if (
    fee.encodedLength > 1_000_000 ||
    typeof fee.callHex !== 'string' ||
    !/^0x(?:[0-9a-f]{2})+$/.test(fee.callHex) ||
    (fee.callHex.length - 2) / 2 >= fee.encodedLength ||
    fee.envelopeHashAlgorithm !== 'sha256' ||
    !SHA256.test(fee.envelopeHash)
  )
    fail();
  runtime(fee.runtimeVersion);
  const info = object(fee.rawQueryInfo);
  const details = object(fee.rawFeeDetails);
  const inclusion = object(details.inclusionFee);
  if (
    rawAmount(info.partialFee) !== fee.partialFeeCodec ||
    rawAmount(inclusion.baseFee) !== fee.baseFeeCodec ||
    rawAmount(inclusion.lenFee) !== fee.lenFeeCodec ||
    rawAmount(inclusion.adjustedWeightFee) !== fee.adjustedWeightFeeCodec ||
    rawAmount(details.tip) !== fee.tipCodec
  )
    fail();
}

/** Validate retained raw amounts and derive the conservative minimum and exact impact fraction. */
export function normalizeExecutionQuote(raw: ExecutionRawQuote): ExecutionQuote {
  const detached = JSON.parse(canonicalEvidenceJson(raw)) as ExecutionRawQuote;
  validateRawQuote(detached);
  validateFee(detached.fee);
  if (detached.blockHash !== detached.fee.blockHash) fail();
  const minimumCodec = floorMinimum(detached.amountOutCodec);
  amount(minimumCodec, true);
  return {
    ...detached,
    slippageBps: 50,
    minimumCodec,
    priceImpact: {
      numerator: ((amount(detached.amountWithoutImpactCodec) - amount(detached.amountOutCodec)) * 100n).toString(),
      denominator: detached.amountWithoutImpactCodec,
    },
  };
}

/** Validate and detach a declared reverse lot before a collector can request any quote. */
export function validateExecutionReverseLot(value: ExecutionReverseLot, slotAt: number): ExecutionReverseLot {
  const lot = JSON.parse(canonicalEvidenceJson(value)) as ExecutionReverseLot;
  integer(slotAt, 1);
  if (lot?.kind === 'same-block-buy-minimum') return lot;
  if (lot?.kind !== 'fixed-frozen-lot') fail();
  amount(lot.amountCodec, true);
  integer(lot.frozenAt, 1);
  if (lot.frozenAt > slotAt || typeof lot.lotId !== 'string' || !lot.lotId.trim() || lot.lotId.length > 256) fail();
  return lot;
}

/** Verify both quote directions, raw derivations, one finalized runtime, timing, source and declared lot. */
export function validateExecutionSnapshot(value: ExecutionSnapshot): ExecutionSnapshot {
  const snapshot = JSON.parse(canonicalEvidenceJson(value)) as ExecutionSnapshot;
  if (snapshot.schemaVersion !== 1 || snapshot.purpose !== 'development') fail();
  for (const stamp of [snapshot.slotAt, snapshot.requestStartedAt, snapshot.requestFinishedAt]) integer(stamp, 1);
  if (
    snapshot.slotAt > snapshot.requestStartedAt ||
    snapshot.requestStartedAt > snapshot.requestFinishedAt ||
    snapshot.requestFinishedAt - snapshot.requestStartedAt > 25000
  )
    fail();
  if (snapshot.quoteTiming !== undefined) {
    const timing = object(snapshot.quoteTiming);
    const buy = object(timing.buy);
    const sell = object(timing.sell);
    for (const direction of [buy, sell]) {
      integer(direction.startedAt, 1);
      integer(direction.finishedAt, 1);
      if (
        (direction.startedAt as number) < snapshot.requestStartedAt ||
        (direction.finishedAt as number) < (direction.startedAt as number) ||
        (direction.finishedAt as number) > snapshot.requestFinishedAt
      )
        fail();
    }
    if ((buy.finishedAt as number) > (sell.startedAt as number)) fail();
  }
  const context = snapshot.context;
  if (
    !context ||
    context.endpoint !== EXECUTION_EVIDENCE_ENDPOINT ||
    context.genesisHash !== EXECUTION_EVIDENCE_GENESIS ||
    !HASH.test(context.blockHash) ||
    ![14, 15, 16].includes(context.metadataFormatVersion) ||
    context.metadataReadMethod !== 'Metadata_metadata_at_version' ||
    context.metadataHashAlgorithm !== 'sha256' ||
    !SHA256.test(context.metadataHash) ||
    context.dexId !== 0 ||
    context.filterMode !== 'AllowSelected' ||
    canonicalEvidenceJson(context.allowedSourceTypes) !== '["XYKPool"]' ||
    typeof context.poolIdentity !== 'string' ||
    !context.poolIdentity.trim() ||
    context.poolIdentity.length > 2048
  )
    fail();
  runtime(context);
  integer(context.blockNumber, 1);
  integer(context.finalizedAt, 1);
  amount(context.denominator, true);
  if (
    snapshot.requestFinishedAt - context.finalizedAt > 300000 ||
    context.finalizedAt - snapshot.requestFinishedAt > 30000
  )
    fail();
  for (const quote of [snapshot.buy, snapshot.sell]) {
    const normalized = normalizeExecutionQuote(quote);
    if (
      quote.slippageBps !== 50 ||
      quote.minimumCodec !== normalized.minimumCodec ||
      canonicalEvidenceJson(quote.priceImpact) !== canonicalEvidenceJson(normalized.priceImpact) ||
      quote.blockHash !== context.blockHash ||
      quote.fee.blockHash !== context.blockHash ||
      quote.fee.runtimeVersion.specVersion !== context.specVersion ||
      quote.fee.runtimeVersion.transactionVersion !== context.transactionVersion
    )
      fail();
  }
  if (
    snapshot.buy.assetIn !== EXECUTION_EVIDENCE_KUSD ||
    snapshot.sell.assetIn !== EXECUTION_EVIDENCE_XOR ||
    snapshot.buy.amountInCodec !== EXECUTION_EVIDENCE_INPUT_CODEC
  )
    fail();
  const lot = validateExecutionReverseLot(snapshot.reverseLot, snapshot.slotAt);
  if (lot.kind === 'same-block-buy-minimum') {
    if (snapshot.sell.amountInCodec !== snapshot.buy.minimumCodec) fail();
  } else if (snapshot.sell.amountInCodec !== lot.amountCodec) fail();
  return snapshot;
}
