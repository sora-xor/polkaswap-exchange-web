/** Original v2 quote and bounded-fee replay. Pure byte verification, never quote acquisition or signing. */
import {
  createHistoricalExecutionCodec,
  assertHistoricalFeeDetailsMatchesQueryInfo,
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from './execution-codecs/execution';
import { createHistoricalGoalFeeCodec } from './execution-codecs/fee';
import { readGoalArchivedHeader } from './goal-bundle-market';
import { readGoalRawEnvelope, goalRawBytesSha256, goalRawEvidenceDigest } from './goal-raw-envelope';
import { isExactInputQuoteWithinImpactLimit } from './quote-impact';
import type {
  GoalEpisodeMarkEvidence,
  GoalEpisodePendingInput,
  GoalEpisodeQuoteEvidence,
} from './goal-episode-evaluator';

const ENDPOINT = 'https://mof2.sora.org/';
const HASH = /^0x[0-9a-f]{64}$/;
const SHA = /^[0-9a-f]{64}$/;
const HEX = /^0x(?:[0-9a-fA-F]{2})+$/;
type Data = Readonly<Record<string, unknown>>;

/** Caller-owned source/clock identities; matching JSON does not grant causal or qualification authority. */
export interface GoalBundleQuoteBinding {
  requestSha256: string;
  checkId: number;
  finalizedSource: { hash: string; height: number; receiptSha256: string };
  /** Independently reverified valuation at this exact block, including its code hash. */
  valuation: Readonly<GoalEpisodeMarkEvidence>;
  pending: Readonly<GoalEpisodePendingInput>;
  decisionAtMs: number;
  quoteAndFeeReadMs: number;
  cutoffAtMs: number;
  timingKind: 'fixed-pinned-capture-delays-v1';
  feePolicyId: string;
  feePolicySha256: string;
  quote: { name: string; valueSha256: string };
  fee: { name: string; valueSha256: string };
  context: { name: string; valueSha256: string };
}

/** Original wrappers from the byte-pinned bundle, not normalized quote certificates. */
export interface GoalBundleQuoteBytes {
  quoteBytes: Uint8Array;
  feeBytes: Uint8Array;
  contextBytes: Uint8Array;
}

function check(value: unknown, reason: string): asserts value {
  if (!value) throw Error(`goal-bundle-quote:${reason}`);
}
function own(value: unknown, keys?: readonly string[]): Data {
  check(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      [Object.prototype, null].includes(Object.getPrototypeOf(value)),
    'object'
  );
  const descriptors = Object.getOwnPropertyDescriptors(value);
  check(
    Reflect.ownKeys(descriptors).every(
      (key) => typeof key === 'string' && descriptors[key].enumerable && 'value' in descriptors[key]
    ),
    'own-data'
  );
  if (keys)
    check(
      Object.keys(descriptors).length === keys.length && keys.every((key) => Object.hasOwn(descriptors, key)),
      'fields'
    );
  return value as Data;
}
function same(left: unknown, right: unknown, reason: string): void {
  check(goalRawEvidenceDigest(left) === goalRawEvidenceDigest(right), reason);
}
function positive(value: unknown): number {
  check(typeof value === 'number' && Number.isSafeInteger(value) && value > 0, 'integer');
  return value;
}
function hash(value: unknown): string {
  check(typeof value === 'string' && HASH.test(value), 'hash');
  return value;
}
function amount(value: unknown, allowZero = false): string {
  check(
    typeof value === 'string' &&
      /^(?:0|[1-9]\d{0,38})$/.test(value) &&
      BigInt(value) < 1n << 128n &&
      (allowZero || BigInt(value) > 0n),
    'amount'
  );
  return value;
}
function rows(value: unknown, count: number): readonly unknown[] {
  check(Array.isArray(value) && value.length === count, 'rows');
  return value;
}
function iso(value: unknown): void {
  check(
    typeof value === 'string' &&
      /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString() === value,
    'acquisition-time'
  );
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/**
 * Rebuild the original quote, immortal fee estimate, conservative mortal64 fee estimate and context joins.
 * Valid high-impact quotes remain evidence: the existing evaluator, not this verifier, rejects their economics.
 * Upstream owns deadline cancellation, signal sizing and selected valuation; this function never retries or resizes.
 */
export function verifyGoalBundleQuote(
  rawBinding: GoalBundleQuoteBinding,
  bytes: GoalBundleQuoteBytes
): Readonly<GoalEpisodeQuoteEvidence> {
  goalRawEvidenceDigest(rawBinding);
  const expected: GoalBundleQuoteBinding = JSON.parse(JSON.stringify(rawBinding));
  own(expected, [
    'requestSha256',
    'checkId',
    'finalizedSource',
    'valuation',
    'pending',
    'decisionAtMs',
    'quoteAndFeeReadMs',
    'cutoffAtMs',
    'timingKind',
    'feePolicyId',
    'feePolicySha256',
    'quote',
    'fee',
    'context',
  ]);
  check(SHA.test(expected.requestSha256) && SHA.test(expected.feePolicySha256), 'binding');
  positive(expected.checkId);
  positive(expected.decisionAtMs);
  positive(expected.cutoffAtMs);
  check(
    Number.isSafeInteger(expected.quoteAndFeeReadMs) &&
      expected.quoteAndFeeReadMs >= 0 &&
      expected.quoteAndFeeReadMs <= 60000 &&
      expected.timingKind === 'fixed-pinned-capture-delays-v1',
    'timing'
  );
  const valuation = expected.valuation;
  own(valuation, [
    'sourceManifestSha256',
    'genesisHash',
    'block',
    'mark',
    'runtimeProfile',
    'captureStartedAtMs',
    'receivedAtMs',
    'evidenceSha256',
  ]);
  check(
    valuation.genesisHash === GENESIS && SHA.test(valuation.sourceManifestSha256) && SHA.test(valuation.evidenceSha256),
    'valuation'
  );
  const block = valuation.block,
    mark = valuation.mark,
    profile = valuation.runtimeProfile;
  own(block, ['hash', 'height', 'parentHash', 'timestampMs']);
  own(mark, ['timestampMs', 'blockHash', 'kusdReserveCodec', 'xorReserveCodec', 'blockNumber', 'denominator']);
  own(profile, ['specVersion', 'transactionVersion', 'metadataSha256', 'codeHash']);
  positive(block.height);
  positive(block.timestampMs);
  hash(block.hash);
  hash(block.parentHash);
  hash(profile.codeHash);
  amount(mark.kusdReserveCodec);
  amount(mark.xorReserveCodec);
  amount(mark.denominator);
  check(
    [130, 131].includes(profile.specVersion) &&
      profile.transactionVersion === profile.specVersion &&
      SHA.test(profile.metadataSha256) &&
      mark.timestampMs === block.timestampMs &&
      mark.blockHash === block.hash &&
      mark.blockNumber === block.height,
    'valuation'
  );
  positive(valuation.captureStartedAtMs);
  positive(valuation.receivedAtMs);
  check(
    block.timestampMs <= valuation.captureStartedAtMs &&
      valuation.captureStartedAtMs <= valuation.receivedAtMs &&
      expected.decisionAtMs === valuation.receivedAtMs,
    'decision'
  );
  const receivedAtMs = expected.decisionAtMs + expected.quoteAndFeeReadMs;
  check(
    Number.isSafeInteger(receivedAtMs) &&
      receivedAtMs <= expected.cutoffAtMs &&
      receivedAtMs - block.timestampMs <= 60000,
    'timing'
  );
  const source = expected.finalizedSource;
  own(source, ['hash', 'height', 'receiptSha256']);
  hash(source.hash);
  positive(source.height);
  check(
    SHA.test(source.receiptSha256) &&
      source.height >= block.height &&
      (source.height !== block.height || source.hash === block.hash),
    'source'
  );
  const pending = expected.pending;
  own(pending, ['assetIn', 'assetOut', 'amountInCodec', 'expectedDenominator']);
  check(
    (pending.assetIn === KUSD && pending.assetOut === XOR) || (pending.assetIn === XOR && pending.assetOut === KUSD),
    'pair'
  );
  amount(pending.amountInCodec);
  check(pending.expectedDenominator === mark.denominator, 'denominator');
  for (const part of ['quote', 'fee', 'context'] as const) {
    own(expected[part], ['name', 'valueSha256']);
    check(expected[part].name === `${part === 'context' ? 'quote-context' : part}-${expected.checkId}.json`, 'name');
  }
  const rawBytes = own(bytes, ['quoteBytes', 'feeBytes', 'contextBytes']);
  const read = (part: 'quote' | 'fee' | 'context') =>
    readGoalRawEnvelope(rawBytes[`${part}Bytes`] as Uint8Array, {
      ...expected[part],
      requestSha256: expected.requestSha256,
    });
  const original = read('quote'),
    fee = read('fee'),
    context = read('context');
  const originalRows = rows(original.rpcEvidence, 19),
    feeRows = rows(fee.rpcEvidence, 2);
  let originalBytes = 0;
  const rpc = (rowInput: unknown, id: number, method: string, params: readonly unknown[], bounded = false): unknown => {
    const row = own(rowInput, [
      'id',
      'method',
      'params',
      'requestedAt',
      'completedAt',
      'httpStatus',
      'responseBody',
      'responseSha256',
      ...(bounded ? ['responseComplete', 'responseBytes', 'retainedBytes'] : []),
    ]);
    check(row.id === id && row.method === method && row.httpStatus === 200, 'rpc-request');
    same(row.params, params, 'rpc-params');
    iso(row.requestedAt);
    iso(row.completedAt);
    check(typeof row.responseBody === 'string', 'rpc-body');
    const raw = new TextEncoder().encode(row.responseBody);
    check(
      raw.length > 0 && raw.length <= (bounded ? 65536 : 2097152) && goalRawBytesSha256(raw) === row.responseSha256,
      'rpc-body'
    );
    if (bounded)
      check(
        row.responseComplete === true && row.responseBytes === raw.length && row.retainedBytes === raw.length,
        'fee-completeness'
      );
    else {
      originalBytes += raw.length;
      check(originalBytes <= 8388608, 'rpc-total');
    }
    const body = own(JSON.parse(row.responseBody), bounded ? ['jsonrpc', 'id', 'result'] : undefined);
    check(
      body.jsonrpc === '2.0' && body.id === id && Object.hasOwn(body, 'result') && !Object.hasOwn(body, 'error'),
      'rpc-result'
    );
    return body.result;
  };
  const qr = (id: number, method: string, params: readonly unknown[]) => rpc(originalRows[id - 1], id, method, params);
  const headers = new Map<string, ReturnType<typeof readGoalArchivedHeader>>();
  const header = (blockHash: string, value: unknown) => {
    const observed = readGoalArchivedHeader(value);
    check(observed.parentHash !== blockHash, 'header');
    for (const [priorHash, prior] of headers) {
      check(
        priorHash === blockHash ? prior.identity === observed.identity : prior.height !== observed.height,
        'header'
      );
      if (prior.height + 1 === observed.height) check(observed.parentHash === priorHash, 'header');
      if (observed.height + 1 === prior.height) check(prior.parentHash === blockHash, 'header');
    }
    headers.set(blockHash, observed);
    return observed;
  };
  check(qr(1, 'chain_getBlockHash', [0]) === GENESIS, 'genesis');
  const finalizedHash = hash(qr(2, 'chain_getFinalizedHead', []));
  const finalized = header(finalizedHash, qr(3, 'chain_getHeader', [finalizedHash]));
  check(
    finalized.height >= source.height && (finalized.height !== source.height || finalizedHash === source.hash),
    'finality'
  );
  check(
    qr(4, 'chain_getBlockHash', [source.height]) === source.hash &&
      qr(5, 'chain_getBlockHash', [block.height]) === block.hash,
    'canonical'
  );
  const atHeader = header(block.hash, qr(6, 'chain_getHeader', [block.hash]));
  check(atHeader.height === block.height && atHeader.parentHash === block.parentHash, 'block');
  const parent = header(atHeader.parentHash, qr(7, 'chain_getHeader', [atHeader.parentHash]));
  check(parent.height + 1 === block.height, 'parent');
  const runtime = (value: unknown) => {
    const version = own(value);
    check(
      version.specName === 'sora-substrate' &&
        version.specVersion === profile.specVersion &&
        version.transactionVersion === profile.transactionVersion &&
        Array.isArray(version.apis) &&
        version.apis.length <= 256,
      'runtime'
    );
    for (const api of version.apis) {
      const entry = rows(api, 2);
      check(
        typeof entry[0] === 'string' &&
          /^0x[0-9a-f]{16}$/.test(entry[0]) &&
          typeof entry[1] === 'number' &&
          Number.isSafeInteger(entry[1]) &&
          entry[1] >= 0 &&
          entry[1] <= 0xffffffff,
        'runtime'
      );
    }
    return version;
  };
  const atRuntime = runtime(qr(8, 'state_getRuntimeVersion', [block.hash]));
  same(atRuntime, runtime(qr(9, 'state_getRuntimeVersion', [block.parentHash])), 'runtime-upgrade');
  const metadataHex = qr(10, 'state_getMetadata', [block.hash]),
    parentMetadata = qr(11, 'state_getMetadata', [block.parentHash]);
  check(
    typeof metadataHex === 'string' &&
      HEX.test(metadataHex) &&
      typeof parentMetadata === 'string' &&
      metadataHex.toLowerCase() === parentMetadata.toLowerCase(),
    'metadata-upgrade'
  );
  const identity = {
    genesisHash: GENESIS,
    blockHash: block.hash,
    metadataHex,
    runtimeVersion: { specVersion: profile.specVersion, transactionVersion: profile.transactionVersion },
  };
  const codec = createHistoricalExecutionCodec(identity);
  check(codec.binding.metadataSha256 === profile.metadataSha256, 'metadata-profile');
  const keys = codec.storageKeys(),
    labels = ['timestamp', 'denominator', 'kusd', 'xor', 'dex0'] as const;
  const storage = Object.fromEntries(
    labels.map((label, index) => {
      const result = qr(12 + index, 'state_getStorage', [keys[label], block.hash]);
      check(result === null || (typeof result === 'string' && HEX.test(result)), 'storage');
      return [label, result];
    })
  );
  const state = codec.decodeStorage(storage);
  check(state.timestampMs === block.timestampMs && state.denominator === pending.expectedDenominator, 'state');
  const request = { block: { hash: block.hash, height: block.height }, finalizedSource: source, ...pending };
  const originalContext = {
    endpoint: ENDPOINT,
    genesisHash: GENESIS,
    block: request.block,
    parentHash: block.parentHash,
    finalizedSource: source,
    finalityAttestation: { kind: 'rpc-canonical-finalized', hash: finalizedHash, height: finalized.height },
    expectedDenominator: pending.expectedDenominator,
    state,
    codecBinding: codec.binding,
    causalArrivalTimeKnown: false,
  };
  const rawQuote = qr(17, 'liquidityProxy_quote', [
    0,
    pending.assetIn,
    pending.assetOut,
    pending.amountInCodec,
    'WithDesiredInput',
    ['XYKPool'],
    'AllowSelected',
    block.hash,
  ]);
  const rawQuoteFields = own(rawQuote);
  const amountOutCodec = amount(rawQuoteFields.amount),
    amountWithoutImpactCodec = amount(rawQuoteFields.amount_without_impact);
  // Throws only on invalid impact inputs; a valid above-limit quote must remain available to the evaluator.
  isExactInputQuoteWithinImpactLimit(amountOutCodec, amountWithoutImpactCodec, '1');
  same(rawQuoteFields.route, [pending.assetIn, pending.assetOut], 'quote-route');
  const rawPoolFee = own(rawQuoteFields.fee, [XOR]),
    poolFeeCodec = amount(rawPoolFee[XOR], true);
  const normalized = {
    amountOutCodec,
    amountWithoutImpactCodec,
    poolFeeCodec,
    feeAssetAddress: XOR,
    route: [pending.assetIn, pending.assetOut],
  };
  const swapRequest = {
    assetIn: pending.assetIn,
    assetOut: pending.assetOut,
    amountInCodec: pending.amountInCodec,
    quotedAmountOutCodec: amountOutCodec,
  };
  const envelope = codec.buildSwapEnvelope(swapRequest);
  const oldInfoHex = qr(18, 'state_call', ['TransactionPaymentApi_query_info', envelope.feeQueryDataHex, block.hash]);
  const oldDetailsHex = qr(19, 'state_call', [
    'TransactionPaymentApi_query_fee_details',
    envelope.feeQueryDataHex,
    block.hash,
  ]);
  check(
    typeof oldInfoHex === 'string' &&
      HEX.test(oldInfoHex) &&
      typeof oldDetailsHex === 'string' &&
      HEX.test(oldDetailsHex),
    'fee-hex'
  );
  const oldInfo = codec.decodeQueryInfo(oldInfoHex);
  amount(oldInfo.partialFeeCodec);
  const oldDetails = assertHistoricalFeeDetailsMatchesQueryInfo(oldDetailsHex, oldInfo.partialFeeCodec, '0');
  same(
    original,
    {
      kind: 'hypothetical-historical-execution-estimate',
      context: originalContext,
      request,
      quote: { ...normalized, raw: rawQuote, dexId: 0, liquiditySource: 'XYKPool', slippageBps: 50 },
      envelope,
      fees: { assetId: XOR, info: oldInfo, details: oldDetails },
      rpcEvidence: originalRows,
      observedFill: false,
      transactionSubmitted: false,
    },
    'quote-projection'
  );

  const feeCodec = createHistoricalGoalFeeCodec(identity),
    bound = feeCodec.buildBoundSwapEnvelope(swapRequest, { blockNumber: block.height });
  check(bound.policy.id === expected.feePolicyId && bound.policySha256 === expected.feePolicySha256, 'fee-policy');
  const feeMethods = ['TransactionPaymentApi_query_info', 'TransactionPaymentApi_query_fee_details'] as const;
  const results = feeMethods.map((method, index) =>
    rpc(feeRows[index], index + 1, 'state_call', [method, bound.feeQueryDataHex, block.hash], true)
  );
  check(
    results.every((value) => typeof value === 'string' && HEX.test(value)),
    'bound-fee-hex'
  );
  const info = codec.decodeQueryInfo(results[0]),
    details = assertHistoricalFeeDetailsMatchesQueryInfo(results[1], info.partialFeeCodec, '0');
  const query = (index: number) => ({
    method: 'state_call',
    params: [feeMethods[index], bound.feeQueryDataHex, block.hash],
    resultHex: results[index],
  });
  same(
    fee,
    {
      receipt: {
        version: 1,
        kind: 'historical-goal-bound-fee-receipt',
        envelope: bound,
        feeAssetAddress: XOR,
        queries: { info: query(0), details: query(1) },
      },
      info,
      details,
      rpcEvidence: feeRows,
      sourceBinding: {
        ...codec.binding,
        blockNumber: block.height,
        request: swapRequest,
        state: { timestampMs: state.timestampMs, denominator: state.denominator },
        originalEnvelopeSha256: envelope.envelopeSha256,
      },
      endpoint: ENDPOINT,
      actualCanonicalFinalityVerifiedHere: false,
      feeAdequacyVerified: false,
      transactionSubmitted: false,
    },
    'fee-projection'
  );
  const pinnedContext = {
    ...valuation,
    captureStartedAtMs: expected.decisionAtMs,
    receivedAtMs: expected.decisionAtMs,
  };
  same(
    context,
    {
      context: pinnedContext,
      pending,
      valuationEvidenceSha256: valuation.evidenceSha256,
      quoteEvidenceSha256: expected.quote.valueSha256,
      feeEvidenceSha256: expected.fee.valueSha256,
      receivedAtMs,
      timingKind: expected.timingKind,
    },
    'context-join'
  );
  return freeze({
    context: { ...pinnedContext, evidenceSha256: expected.context.valueSha256 },
    receivedAtMs,
    pending,
    quotedOutputCodec: amountOutCodec,
    withoutImpactCodec: amountWithoutImpactCodec,
    minimumOutputCodec: bound.minimumCodec,
    feeCodec: info.partialFeeCodec,
    queryInfoFeeCodec: info.partialFeeCodec,
    queryDetailsFeeCodec: details.finalFee,
    feeAsset: XOR,
    feePolicyId: bound.policy.id,
    feePolicySha256: bound.policySha256,
    quoteEvidenceSha256: expected.quote.valueSha256,
    feeEvidenceSha256: expected.fee.valueSha256,
    dexId: 0,
    liquiditySource: 'XYKPool',
    filter: 'AllowSelected',
    slippageBasisPoints: 50,
    observedFill: false,
    transactionSubmitted: false,
    feeAdequacyVerified: false,
  });
}
