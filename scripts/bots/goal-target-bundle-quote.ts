/** Fixed Node-only V3 artifact joins and actual target-worker replay. No network, signing or admission. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import {
  assertGoalBundleVerifiedMarketState,
  assertGoalBundleVerifiedCatalogMarketState,
  getGoalBundleVerifiedMarketCatalog,
  type GoalBundleVerifiedMarketState,
} from '../../src/features/bot-trading/goal-bundle-market';
import type { GoalBundleQuoteBinding } from '../../src/features/bot-trading/goal-bundle-quote';
import type { GoalEpisodeQuoteResult } from '../../src/features/bot-trading/goal-episode-evaluator';
import { goalRawEvidenceDigest, readGoalRawEnvelope } from '../../src/features/bot-trading/goal-raw-envelope';
import {
  readGoalTargetExecutionModel,
  goalTargetSourceRuntimeProfiles,
  isGoalCatalogTargetExecutionModel,
  type GoalTargetExecutionModel,
} from '../../src/features/bot-trading/goal-target-model';
import { createHistoricalExecutionPoolCodec } from '../../src/features/bot-trading/execution-codecs/pool';
import { createCatalogHistoricalExecutionPoolCodec } from '../../src/features/bot-trading/execution-codecs/catalog-pool';
import { lookupGoalRuntimeCatalogEntry } from '../../src/features/bot-trading/execution-codecs/runtime-catalog';
import { HISTORICAL_EXECUTION_KUSD as KUSD, HISTORICAL_EXECUTION_XOR as XOR } from './historical-execution-codec';
import { replayGoalTargetRuntimeEstimate, replayGoalCatalogTargetRuntimeEstimate } from './goal-target-runtime-replay';
import type { GoalTargetStateReceipt } from './goal-target-runtime-state';

export interface GoalTargetBundleQuoteBinding extends Omit<GoalBundleQuoteBinding, 'fee'> {
  readonly fee?: GoalBundleQuoteBinding['fee'];
  readonly executionModel: GoalTargetExecutionModel;
  readonly budget: { readonly maxTradeKusdCodec: string; readonly maxTradeXorCodec: string };
  readonly sourceState: Readonly<GoalBundleVerifiedMarketState>;
}
export interface GoalTargetBundleQuoteBytes {
  readonly quoteBytes: Uint8Array;
  readonly contextBytes: Uint8Array;
  readonly feeBytes?: Uint8Array;
  /** Every original individually retained target RPC wrapper, in its original sequence. */
  readonly rpc: readonly { readonly name: string; readonly valueSha256: string; readonly bytes: Uint8Array }[];
}
export interface GoalTargetBundleQuoteOptions {
  readonly compressedBytes: Uint8Array;
  readonly signal?: AbortSignal;
  /** One budget for all parsing, joins, pin checks and actual worker execution, at most 30 seconds. */
  readonly timeoutMs?: number;
}
export interface GoalTargetBundleQuoteVerification {
  readonly result: Readonly<GoalEpisodeQuoteResult>;
  /** Physical original RPC responses, counted once despite their duplicate embedded representation. */
  readonly counts: { readonly httpRequests: number; readonly responseBytes: number };
}
type Data = Record<string, unknown>;
const SHA = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const check: (value: unknown, reason: string) => asserts value = (value, reason) => {
  if (!value) throw Error(`goal-target-bundle-quote:${reason}`);
};
const sha = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
function own(value: unknown, required: readonly string[], optional: readonly string[] = []): Data {
  check(value && Object.getPrototypeOf(value) === Object.prototype, 'object');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  check(
    Reflect.ownKeys(descriptors).every((key) => typeof key === 'string' && [...required, ...optional].includes(key)),
    'fields'
  );
  check(
    required.every((key) => Object.hasOwn(descriptors, key)),
    'fields'
  );
  check(
    Object.values(descriptors).every((d) => d.enumerable && 'value' in d),
    'own-data'
  );
  return Object.fromEntries(Object.entries(descriptors).map(([key, d]) => [key, d.value]));
}
function same(left: unknown, right: unknown, reason: string): void {
  check(goalRawEvidenceDigest(left) === goalRawEvidenceDigest(right), reason);
}
function amount(value: unknown): string {
  check(typeof value === 'string' && /^[1-9]\d{0,38}$/.test(value) && BigInt(value) < 1n << 128n, 'amount');
  return value;
}
function positive(value: unknown): number {
  check(typeof value === 'number' && Number.isSafeInteger(value) && value > 0, 'integer');
  return value;
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
/** Intrinsic byte copies reject shared memory and avoid caller getters/iteration across the worker await. */
function bytes(value: unknown, limit: number): Uint8Array {
  check(value instanceof Uint8Array, 'bytes');
  const prototype = Object.getPrototypeOf(Uint8Array.prototype);
  const length = Object.getOwnPropertyDescriptor(prototype, 'byteLength')!.get!.call(value) as number;
  const buffer = Object.getOwnPropertyDescriptor(prototype, 'buffer')!.get!.call(value) as ArrayBuffer;
  check(length > 0 && length <= limit && !(buffer instanceof SharedArrayBuffer), 'bytes');
  const copy = new Uint8Array(length);
  Uint8Array.prototype.set.call(copy, value);
  return copy;
}

/**
 * Rebuild the exact V3 archive quote/fee/context projection using authenticated historical source bytes.
 * Original acquisition times stay in raw receipts; only the independently supplied modeled clock controls
 * causal decisions. Economic impact and declared fee-cap acceptance remain the unchanged evaluator's job.
 */
export async function verifyGoalTargetBundleQuote(
  rawBinding: GoalTargetBundleQuoteBinding,
  rawBytes: GoalTargetBundleQuoteBytes,
  rawOptions: GoalTargetBundleQuoteOptions
): Promise<GoalTargetBundleQuoteVerification> {
  const options = own(rawOptions, ['compressedBytes'], ['signal', 'timeoutMs']);
  check(options.signal === undefined || options.signal instanceof AbortSignal, 'signal');
  const signal = options.signal as AbortSignal | undefined;
  const timeoutMs = options.timeoutMs ?? 20000;
  check(Number.isSafeInteger(timeoutMs) && (timeoutMs as number) >= 1 && (timeoutMs as number) <= 30000, 'timeout');
  const deadline = performance.now() + (timeoutMs as number);
  let assertSourceCurrent = () => undefined as void;
  const current = () => {
    check(!signal?.aborted, 'aborted');
    check(performance.now() < deadline, 'timeout');
    assertSourceCurrent();
  };
  current();
  const raw = own(
    rawBinding,
    [
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
      'context',
      'executionModel',
      'budget',
      'sourceState',
    ],
    ['fee']
  );
  assertGoalBundleVerifiedMarketState(raw.sourceState);
  const source = raw.sourceState;
  assertSourceCurrent = () => assertGoalBundleVerifiedMarketState(source);
  const { sourceState: _sourceState, ...data } = raw;
  goalRawEvidenceDigest(data);
  const expected = JSON.parse(JSON.stringify(data)) as Omit<GoalTargetBundleQuoteBinding, 'sourceState'>;
  const model = readGoalTargetExecutionModel(expected.executionModel);
  const catalogMode = isGoalCatalogTargetExecutionModel(model);
  const catalog = catalogMode ? getGoalBundleVerifiedMarketCatalog(source) : undefined;
  check(catalogMode === 'catalogBinding' in source, 'source-model-kind');
  if (catalogMode) {
    assertGoalBundleVerifiedCatalogMarketState(source);
    check(catalog && catalog.catalogSha256 === model.catalogSha256, 'source-catalog');
    const entry = lookupGoalRuntimeCatalogEntry(catalog, source.runtimeProfile.codeHash);
    check(
      entry.role === 'historical-source' && source.sourceMetadataHex === entry.metadataHex,
      'source-catalog-profile'
    );
    same(
      source.catalogBinding,
      { catalogSha256: catalog.catalogSha256, profileSha256: goalRawEvidenceDigest(entry.profile) },
      'source-catalog-binding'
    );
    same(
      source.blockProfile,
      {
        height: source.sourceBlock.height,
        hash: source.sourceBlock.hash,
        codeHash: entry.profile.codeHash,
        profileSha256: source.catalogBinding.profileSha256,
        profile: entry.profile,
      },
      'source-block-profile'
    );
  }
  const executionModelSha256 = goalRawEvidenceDigest(model);
  const compressedBytes = bytes(options.compressedBytes, 4 * 1024 * 1024);
  check(sha(compressedBytes) === model.targetCompressedSha256, 'binary-pin');
  for (const [field, path] of [
    ['hostSha256', './goal-target-runtime-host.cjs'],
    ['stateCodecSha256', './goal-target-runtime-state.ts'],
    ['quoteCodecSha256', './goal-target-runtime-quote.ts'],
  ] as const)
    check(sha(readFileSync(new URL(path, import.meta.url))) === model.implementation[field], 'implementation-pin');
  if (catalogMode)
    check(
      sha(
        readFileSync(new URL('../../src/features/bot-trading/execution-codecs/runtime-catalog.ts', import.meta.url))
      ) === model.implementation.catalogCodecSha256,
      'catalog-implementation-pin'
    );
  check(typeof expected.requestSha256 === 'string' && SHA.test(expected.requestSha256), 'request');
  positive(expected.checkId);
  check(expected.checkId <= 999999999, 'check');
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
    source.requestSha256 === expected.requestSha256 && source.sourceManifestSha256 === valuation.sourceManifestSha256,
    'source-identity'
  );
  check(
    source.genesisHash === valuation.genesisHash &&
      typeof valuation.evidenceSha256 === 'string' &&
      SHA.test(valuation.evidenceSha256),
    'valuation'
  );
  same(source.sourceBlock, valuation.block, 'source-block');
  same(source.sourceMark, valuation.mark, 'source-mark');
  same(source.finalizedSource, expected.finalizedSource, 'source-finality');
  same(source.runtimeProfile, valuation.runtimeProfile, 'source-profile');
  check(
    goalTargetSourceRuntimeProfiles(model).some(
      (profile) => goalRawEvidenceDigest(profile) === goalRawEvidenceDigest(source.runtimeProfile)
    ),
    'model-source'
  );
  own(valuation.mark, [
    'timestampMs',
    'blockHash',
    'kusdReserveCodec',
    'xorReserveCodec',
    'blockNumber',
    'denominator',
  ]);
  check(
    valuation.mark.timestampMs === source.sourceBlock.timestampMs &&
      valuation.mark.blockHash === source.sourceBlock.hash &&
      valuation.mark.blockNumber === source.sourceBlock.height &&
      valuation.mark.denominator === source.denominator,
    'mark'
  );
  amount(valuation.mark.kusdReserveCodec);
  amount(valuation.mark.xorReserveCodec);
  positive(valuation.captureStartedAtMs);
  positive(valuation.receivedAtMs);
  check(
    source.sourceBlock.timestampMs <= valuation.captureStartedAtMs &&
      valuation.captureStartedAtMs <= valuation.receivedAtMs &&
      expected.decisionAtMs === valuation.receivedAtMs,
    'decision'
  );
  positive(expected.cutoffAtMs);
  check(
    Number.isSafeInteger(expected.quoteAndFeeReadMs) &&
      expected.quoteAndFeeReadMs >= 0 &&
      expected.quoteAndFeeReadMs <= 60000 &&
      expected.timingKind === 'fixed-pinned-capture-delays-v1',
    'timing'
  );
  const receivedAtMs = expected.decisionAtMs + expected.quoteAndFeeReadMs;
  check(
    Number.isSafeInteger(receivedAtMs) &&
      receivedAtMs <= expected.cutoffAtMs &&
      receivedAtMs - source.sourceBlock.timestampMs <= 60000,
    'timing'
  );
  own(expected.finalizedSource, ['hash', 'height', 'receiptSha256']);
  check(
    typeof expected.finalizedSource.hash === 'string' &&
      HASH.test(expected.finalizedSource.hash) &&
      typeof expected.finalizedSource.receiptSha256 === 'string' &&
      SHA.test(expected.finalizedSource.receiptSha256),
    'finalized-source'
  );
  positive(expected.finalizedSource.height);
  check(
    expected.finalizedSource.height >= source.sourceBlock.height &&
      (expected.finalizedSource.height !== source.sourceBlock.height ||
        expected.finalizedSource.hash === source.sourceBlock.hash),
    'finalized-source'
  );
  const pending = expected.pending;
  own(pending, ['assetIn', 'assetOut', 'amountInCodec', 'expectedDenominator']);
  check(
    (pending.assetIn === KUSD && pending.assetOut === XOR) || (pending.assetIn === XOR && pending.assetOut === KUSD),
    'pair'
  );
  check(pending.expectedDenominator === source.denominator, 'denominator');
  own(expected.budget, ['maxTradeKusdCodec', 'maxTradeXorCodec']);
  amount(expected.budget.maxTradeKusdCodec);
  amount(expected.budget.maxTradeXorCodec);
  check(
    BigInt(amount(pending.amountInCodec)) <=
      BigInt(pending.assetIn === KUSD ? expected.budget.maxTradeKusdCodec : expected.budget.maxTradeXorCodec),
    'input-budget'
  );
  check(
    typeof expected.feePolicyId === 'string' &&
      typeof expected.feePolicySha256 === 'string' &&
      SHA.test(expected.feePolicySha256),
    'fee-policy'
  );
  for (const part of ['quote', 'context', 'fee'] as const) {
    const pin = expected[part];
    if (part === 'fee' && pin === undefined) continue;
    own(pin, ['name', 'valueSha256']);
    check(
      pin!.name === `${part === 'context' ? 'quote-context' : part}-${expected.checkId}.json` &&
        SHA.test(pin!.valueSha256),
      'artifact-name'
    );
  }
  const inputs = own(rawBytes, ['quoteBytes', 'contextBytes', 'rpc'], ['feeBytes']);
  let inputBytes = 0;
  const copy = (value: unknown) => {
    const result = bytes(value, 32 * 1024 * 1024);
    inputBytes += result.byteLength;
    check(inputBytes <= 64 * 1024 * 1024, 'artifact-byte-limit');
    return result;
  };
  const quote = readGoalRawEnvelope(copy(inputs.quoteBytes), {
    ...expected.quote,
    requestSha256: expected.requestSha256,
  });
  const context = readGoalRawEnvelope(copy(inputs.contextBytes), {
    ...expected.context,
    requestSha256: expected.requestSha256,
  });
  check((expected.fee === undefined) === !Object.hasOwn(inputs, 'feeBytes'), 'fee-presence');
  const fee = expected.fee
    ? readGoalRawEnvelope(copy(inputs.feeBytes), { ...expected.fee, requestSha256: expected.requestSha256 })
    : undefined;
  own(quote, ['protocol', 'executionModelSha256', 'sourceRawSha256', 'sourcePropertiesHex', 'receipts', 'estimate']);
  check(
    quote.protocol === 'target-runtime-archive-quote-v1' &&
      quote.executionModelSha256 === executionModelSha256 &&
      quote.sourceRawSha256 === source.sourceRawSha256 &&
      quote.sourcePropertiesHex === source.sourcePropertiesHex,
    'source-join'
  );
  check(Array.isArray(inputs.rpc) && inputs.rpc.length > 0 && inputs.rpc.length <= 269, 'rpc-count');
  const descriptors = Object.getOwnPropertyDescriptors(inputs.rpc);
  check(Reflect.ownKeys(descriptors).length === inputs.rpc.length + 1, 'rpc-fields');
  check(Array.isArray(quote.receipts) && quote.receipts.length === inputs.rpc.length, 'rpc-count');
  const receipts: GoalTargetStateReceipt[] = [];
  let responseBytes = 0;
  for (let index = 0; index < inputs.rpc.length; index++) {
    const entry = descriptors[index];
    check(entry?.enumerable && 'value' in entry, 'rpc-own-data');
    const pin = own(entry.value, ['name', 'valueSha256', 'bytes']);
    check(
      pin.name === `target-rpc-${expected.checkId}-${index + 1}.json` &&
        typeof pin.valueSha256 === 'string' &&
        SHA.test(pin.valueSha256),
      'rpc-name'
    );
    const receipt = readGoalRawEnvelope(copy(pin.bytes), {
      name: pin.name,
      valueSha256: pin.valueSha256,
      requestSha256: expected.requestSha256,
    });
    same(receipt, quote.receipts[index], 'rpc-join');
    own(receipt, [
      'id',
      'method',
      'params',
      'requestBody',
      'requestedAt',
      'completedAt',
      'httpStatus',
      'responseBody',
      'responseSha256',
    ]);
    check(receipt.id === index + 1 && typeof receipt.responseBody === 'string', 'rpc-sequence');
    const size = Buffer.byteLength(receipt.responseBody);
    responseBytes += size;
    check(size <= 256 * 1024 && responseBytes <= 8 * 1024 * 1024, 'rpc-byte-limit');
    // Store wrappers sort keys. Restore the transport's fixed envelope order for its original
    // JSON.stringify receipt digest; no raw body, timestamp, value or request sequence changes.
    receipts.push({
      id: receipt.id,
      method: receipt.method,
      params: receipt.params,
      requestBody: receipt.requestBody,
      requestedAt: receipt.requestedAt,
      completedAt: receipt.completedAt,
      httpStatus: receipt.httpStatus,
      responseBody: receipt.responseBody,
      responseSha256: receipt.responseSha256,
    } as GoalTargetStateReceipt);
  }
  const sourceCodec = catalog
    ? createCatalogHistoricalExecutionPoolCodec({
        catalog,
        sourceCodeHash: source.runtimeProfile.codeHash,
        blockHash: source.sourceBlock.hash,
      })
    : createHistoricalExecutionPoolCodec({
        genesisHash: source.genesisHash,
        blockHash: source.sourceBlock.hash,
        metadataHex: source.sourceMetadataHex,
        runtimeVersion: {
          specVersion: source.runtimeProfile.specVersion,
          transactionVersion: source.runtimeProfile.transactionVersion,
        },
      });
  const properties = receipts.filter(
    (r) => r.method === 'state_getStorage' && r.params[0] === sourceCodec.storageKeys().properties
  );
  check(
    properties.length === 1 && JSON.parse(properties[0].responseBody).result === source.sourcePropertiesHex,
    'properties-join'
  );
  const saved = quote.estimate as Record<string, unknown>;
  check(saved && typeof saved === 'object', 'estimate');
  same(
    saved.request,
    {
      assetIn: pending.assetIn,
      assetOut: pending.assetOut,
      amountInCodec: pending.amountInCodec,
      dexId: 0,
      source: 'XYKPool',
      filter: 'AllowSelected',
      slippageBasisPoints: 50,
    },
    'pending-join'
  );
  const available = saved.kind === 'hypothetical-target-runtime-execution-estimate';
  check(available || saved.kind === 'target-runtime-route-unavailable', 'estimate-kind');
  check(available === !!fee, 'fee-presence');
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
      ...(expected.fee ? { feeEvidenceSha256: expected.fee.valueSha256 } : {}),
      executionModelSha256,
      receivedAtMs,
      timingKind: expected.timingKind,
    },
    'context-join'
  );
  current();
  const remaining = Math.floor(deadline - performance.now());
  check(remaining >= 1, 'timeout');
  const replayInput = {
    compressedBytes,
    sourceBlock: { hash: source.sourceBlock.hash, height: source.sourceBlock.height },
    sourceMetadataHex: source.sourceMetadataHex,
    receipts,
    estimate: saved,
    signal,
    timeoutMs: remaining,
  };
  const estimate = catalog
    ? await replayGoalCatalogTargetRuntimeEstimate({
        ...replayInput,
        catalog,
        sourceCodeHash: source.runtimeProfile.codeHash,
      })
    : await replayGoalTargetRuntimeEstimate(replayInput);
  current();
  const common = {
    context: { ...pinnedContext, evidenceSha256: expected.context.valueSha256 },
    receivedAtMs,
    pending,
    quoteEvidenceSha256: expected.quote.valueSha256,
    executionRuntimeProfile: model.targetRuntimeProfile,
    executionModelSha256,
    dexId: 0 as const,
    liquiditySource: 'XYKPool' as const,
    filter: 'AllowSelected' as const,
    slippageBasisPoints: 50 as const,
    observedFill: false as const,
    transactionSubmitted: false as const,
    feeAdequacyVerified: false as const,
  };
  let result: GoalEpisodeQuoteResult;
  if (estimate.kind === 'target-runtime-route-unavailable')
    result = { ...common, kind: 'target-runtime-route-unavailable' };
  else {
    check(expected.fee && fee, 'fee-presence');
    same(
      fee,
      {
        protocol: 'target-runtime-archive-fee-v1',
        quoteEvidenceSha256: expected.quote.valueSha256,
        fees: estimate.fees,
        envelope: estimate.envelope,
        apis: estimate.apis.slice(1),
      },
      'fee-join'
    );
    check(
      estimate.envelope.bound.policy.id === expected.feePolicyId &&
        estimate.envelope.bound.policySha256 === expected.feePolicySha256,
      'fee-policy'
    );
    result = {
      ...common,
      quotedOutputCodec: estimate.quote.amountOutCodec,
      withoutImpactCodec: estimate.quote.amountWithoutImpactCodec,
      minimumOutputCodec: estimate.quote.minimumCodec,
      feeCodec: estimate.fees.feeCodec,
      queryInfoFeeCodec: estimate.fees.info.partialFeeCodec,
      queryDetailsFeeCodec: estimate.fees.details.finalFee,
      feeAsset: XOR,
      feePolicyId: estimate.envelope.bound.policy.id,
      feePolicySha256: estimate.envelope.bound.policySha256,
      feeEvidenceSha256: expected.fee.valueSha256,
    };
  }
  current();
  return freeze({ result, counts: { httpRequests: receipts.length, responseBytes } });
}
