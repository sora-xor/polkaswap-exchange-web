/** Read-only archive adapter for the causal evaluator. Historical receipt times are explicitly modeled. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  goalQualificationDigest,
  GOAL_QUALIFICATION_PROTOCOL,
  GOAL_QUALIFICATION_PROTOCOL_V2,
  GOAL_QUALIFICATION_PROTOCOL_V3,
  readGoalQualificationBinding,
  type GoalQualificationPlan,
  type GoalQualificationRegistration,
  type GoalQualificationEvaluationRequest,
  type GoalQualificationSelection,
  type GoalQualificationRuntimeProfile,
  type GoalQualificationEpisodeEvidence,
} from '../../src/features/bot-trading/goal-qualification';
import {
  GOAL_TARGET_COMPRESSED_SHA256,
  readGoalTargetExecutionModel,
  goalTargetSourceRuntimeProfiles,
  isGoalCatalogTargetExecutionModel,
} from '../../src/features/bot-trading/goal-target-model';
import {
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
  GOAL_EXACT_POLICY,
} from '../../src/features/bot-trading/goal-exact-ledger';
import type { GoalQualificationClockBlock } from '../../src/features/bot-trading/goal-qualification-clock';
import {
  createGoalEpisodeEvaluator,
  createGoalEpisodeEvaluatorV2,
  type GoalEpisodeEvidenceSource,
  type GoalEpisodeEvidenceSourceV1,
  type GoalEpisodeMarkEvidence,
} from '../../src/features/bot-trading/goal-episode-evaluator';
import {
  goalClockCheckCutoff,
  GoalEpisodeDeadlineCancellation,
  type GoalEpisodeDeadlineReceipt,
  type GoalEpisodeClockCheck as GoalQualificationClockCheck,
} from '../../src/features/bot-trading/goal-qualification-clock-v2';
import { buildGoalQualificationClockV2 } from './goal-qualification-clock-builder-v2';
import { buildGoalQualificationClock } from './goal-qualification-clock-builder';
import {
  createHistoricalGoalMarketReader,
  createCatalogHistoricalGoalMarketReader,
  HistoricalGoalMarketReadError,
} from './historical-goal-market-reader';
import type {
  HistoricalBlockReaderSource,
  CatalogHistoricalBlockReaderSource,
  HistoricalBlockReaderOptions,
} from './historical-execution-block-reader';
import {
  assertGoalRuntimeCatalog,
  lookupGoalRuntimeCatalogEntry,
  type GoalRuntimeCatalog,
} from '../../src/features/bot-trading/execution-codecs/runtime-catalog';
import { readHistoricalExecutionQuote, HistoricalExecutionReadError } from './historical-execution-reader';
import { readHistoricalGoalBoundFee, HistoricalGoalBoundFeeReadError } from './historical-goal-bound-fee-reader';
import { prepareHistoricalGoalBoundFeeSource } from './historical-goal-bound-fee';
import { readGoalQualificationHistory, GoalQualificationHistoryReadError } from './goal-qualification-history-reader';
import { createHistoricalExecutionPoolCodec } from './historical-execution-pool-codec';
import {
  createGoalTargetRuntimeArchiveQuote,
  createGoalCatalogTargetRuntimeArchiveQuote,
} from './goal-target-runtime-archive-quote';
import { GoalTargetRuntimeQuoteError } from './goal-target-runtime-quote';

const HOUR = 3_600_000,
  DAY = 24 * HOUR;
const SHA = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const jsonSha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const same = (a: unknown, b: unknown) => goalQualificationDigest(a) === goalQualificationDigest(b);
/** Raw journal encoding mirrors the store; large metadata strings remain complete. */
function canonical(value: unknown): string {
  return Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
          .join(',')}}`
      : JSON.stringify(value);
}

/** These delays must be sealed with the source before training, never chosen from returns. */
export interface GoalArchiveCaptureModel {
  kind: 'fixed-pinned-capture-delays-v1';
  historyReadMs: number;
  indexerPublicationDelayMs: number;
  markReadMs: number;
  quoteAndFeeReadMs: number;
}
/** Complete metadata partition hashes use SHA-256 of the retained JSON array in canonical height order. */
export interface GoalArchivePartition {
  identitySha256: string;
  blocksSha256: string;
  receiptSha256: string;
  source: HistoricalBlockReaderSource | CatalogHistoricalBlockReaderSource;
}
/** Source identity covers operational exposure disclosures, modeled timing, raw metadata and hard read budgets. */
export interface GoalQualificationArchiveManifest {
  protocol:
    | 'goal-qualification-archive-source-v1'
    | 'goal-qualification-archive-source-v2'
    | 'goal-qualification-archive-source-v3';
  sourceId: string;
  genesisHash: string;
  denominator: string;
  warmupHours: 200;
  captureModel: GoalArchiveCaptureModel;
  partitions: { training: GoalArchivePartition; validation: GoalArchivePartition };
  accessAuditSha256: string;
  operationalIngestionSha256: readonly string[];
  maximumHttpRequests: number;
  maximumResponseBytes: number;
}
/** Must durably retain exact own-data bytes before resolving. A digest-only sink is not sufficient. */
export interface GoalArchiveEvidenceSink {
  retainEvidence(name: string, value: unknown): Promise<{ sha256: string; bytes: number }>;
}
export interface GoalQualificationArchiveInput {
  plan: GoalQualificationPlan;
  registration: GoalQualificationRegistration;
  request: GoalQualificationEvaluationRequest;
  manifest: GoalQualificationArchiveManifest;
  /** Already raw-verified canonical metadata for this request's partition, without any market values. */
  blocks: readonly GoalQualificationClockBlock[];
}
export interface GoalQualificationArchiveOptions extends HistoricalBlockReaderOptions {
  sink: GoalArchiveEvidenceSink;
  /** Optional verified metadata replay/live storage lane, used exclusively by the historical market reader. */
  marketFetch?: typeof fetch;
  /** V3 only. Pinned public runtime bytes, copied before any asynchronous work. */
  targetCompressedBytes?: Uint8Array;
  /** Required only by the explicit mixed-source execution model; never taken from plan JSON. */
  catalog?: GoalRuntimeCatalog;
}

/** Copy the pinned public binary with intrinsic access; no caller iterators, shared memory or file paths. */
export function snapshotGoalArchiveTargetBinary(value: unknown): Uint8Array {
  check(value instanceof Uint8Array, 'target-binary');
  const prototype = Object.getPrototypeOf(Uint8Array.prototype);
  const length = Object.getOwnPropertyDescriptor(prototype, 'byteLength')!.get!.call(value) as number;
  const buffer = Object.getOwnPropertyDescriptor(prototype, 'buffer')!.get!.call(value) as ArrayBuffer;
  check(length > 0 && length <= 4 * 1024 * 1024 && !(buffer instanceof SharedArrayBuffer), 'target-binary');
  const result = new Uint8Array(length);
  Uint8Array.prototype.set.call(result, value);
  check(createHash('sha256').update(result).digest('hex') === GOAL_TARGET_COMPRESSED_SHA256, 'target-binary-pin');
  return result;
}
/** Durable engineering access, explicitly acknowledging that the data was already exposed. */
export interface GoalArchiveEngineeringReceipt {
  kind: 'already-exposed-engineering-run-v1';
  planSha256: string;
  requestSha256: string;
  manifestSha256: string;
  exposureAuditSha256: string;
  /** Fixed engineering parameters recorded before this run, never an unopened-data attestation. */
  protocolRecordedBeforeRunSha256: string;
}
export interface GoalArchiveDevelopmentInput extends Omit<GoalQualificationArchiveInput, 'registration'> {
  engineeringReceipt: GoalArchiveEngineeringReceipt;
}
/** The nested trace uses shared accounting schema; this result is not a qualification or evaluator. */
export interface GoalArchiveEngineeringResult {
  kind: 'goal-archive-engineering-result-v1';
  qualificationEligible: false;
  exposure: 'already-exposed';
  engineeringReceipt: Readonly<GoalArchiveEngineeringReceipt>;
  trace: Readonly<GoalQualificationEpisodeEvidence>;
  traceSha256: string;
}
type ArchiveAccess =
  | { kind: 'qualification'; registration: GoalQualificationRegistration }
  | { kind: 'engineering'; engineeringReceipt: GoalArchiveEngineeringReceipt };

/** No underlying transport exception or market value is printed in this error. */
export class GoalQualificationArchiveReadError extends Error {
  constructor(
    readonly stage: string,
    readonly reason: string
  ) {
    super(`Goal archive evidence unavailable: ${stage} (${reason})`);
    this.name = 'GoalQualificationArchiveReadError';
  }
}
function check(value: unknown, reason = 'invalid-evidence'): asserts value {
  if (!value) throw new GoalQualificationArchiveReadError('input', reason);
}
function exactFields(value: object, expected: readonly string[]): void {
  check(
    Reflect.ownKeys(value).length === expected.length && expected.every((key) => Object.hasOwn(value, key)),
    'input-fields'
  );
}
/** Detach descriptors before any await; reject executable input, cycles, oversized and sparse data. */
function copy<T>(input: T): T {
  let nodes = 0,
    chars = 0;
  const active = new Set<object>();
  const visit = (value: unknown, depth: number): unknown => {
    check(++nodes <= 1_000_000 && depth <= 32);
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      chars += value.length;
      check(chars <= 64 * 1024 * 1024);
      return value;
    }
    if (typeof value === 'number') {
      check(Number.isSafeInteger(value));
      return value;
    }
    check(value && typeof value === 'object' && !active.has(value));
    active.add(value);
    const fields = Object.getOwnPropertyDescriptors(value),
      keys = Reflect.ownKeys(fields);
    check(keys.every((key) => typeof key === 'string' && 'value' in fields[key]));
    let result: unknown;
    if (Array.isArray(value)) {
      check(
        Object.getPrototypeOf(value) === Array.prototype && value.length <= 100_000 && keys.length === value.length + 1
      );
      result = Object.freeze(
        Array.from({ length: value.length }, (_, i) => {
          check(fields[i]?.enumerable && 'value' in fields[i]);
          return visit(fields[i].value, depth + 1);
        })
      );
    } else {
      check([Object.prototype, null].includes(Object.getPrototypeOf(value)) && keys.length <= 128);
      result = Object.freeze(
        Object.fromEntries(
          keys.map((key) => {
            check(typeof key === 'string' && fields[key].enumerable);
            return [key, visit(fields[key].value, depth + 1)];
          })
        )
      );
    }
    active.delete(value);
    return result;
  };
  return visit(input, 0) as T;
}

/**
 * One request-scoped source. Call it only inside the study store's durable access corridor.
 * The source selects every state from the sealed callback/capture model, then uses the actual
 * canonical pool/quote/fee readers. No signer, observed historical fill, retry or alternate state.
 */
export function createGoalQualificationArchiveSource(
  input: GoalQualificationArchiveInput,
  options: GoalQualificationArchiveOptions
): GoalEpisodeEvidenceSourceV1 {
  const own = copy(input);
  exactFields(own, ['plan', 'registration', 'request', 'manifest', 'blocks']);
  const { registration, ...common } = own;
  return createArchiveSource(common, { kind: 'qualification', registration }, options) as GoalEpisodeEvidenceSourceV1;
}

/**
 * Already-exposed engineering data only. The caller must durably record the access/engineering
 * protocol first and provide a write-once raw sink. This entry never creates study registration.
 */
export function createGoalArchiveDevelopmentSource(
  input: GoalArchiveDevelopmentInput,
  options: GoalQualificationArchiveOptions
): GoalEpisodeEvidenceSourceV1 {
  const own = copy(input);
  exactFields(own, ['plan', 'engineeringReceipt', 'request', 'manifest', 'blocks']);
  const { engineeringReceipt, ...common } = own;
  return createArchiveSource(
    common,
    { kind: 'engineering', engineeringReceipt },
    options
  ) as GoalEpisodeEvidenceSourceV1;
}

/** Run the shared causal loop without registration/sealing/qualification; the caller retains the final result. */
export async function evaluateGoalArchiveEngineeringEpisode(
  input: GoalArchiveDevelopmentInput,
  options: GoalQualificationArchiveOptions
): Promise<Readonly<GoalArchiveEngineeringResult>> {
  const own = copy(input);
  const source = createGoalArchiveDevelopmentSource(own, options);
  const trace = await createGoalEpisodeEvaluator({ plan: own.plan, source }).evaluate(own.request);
  return copy({
    kind: 'goal-archive-engineering-result-v1',
    qualificationEligible: false,
    exposure: 'already-exposed',
    engineeringReceipt: own.engineeringReceipt,
    trace,
    traceSha256: goalQualificationDigest(trace),
  });
}

/** Explicit v2 qualification source; v1 constructors remain strict. */
export function createGoalQualificationArchiveSourceV2(
  input: GoalQualificationArchiveInput,
  options: GoalQualificationArchiveOptions
): GoalEpisodeEvidenceSource {
  const own = copy(input);
  exactFields(own, ['plan', 'registration', 'request', 'manifest', 'blocks']);
  const { registration, ...common } = own;
  return createArchiveSource(common, { kind: 'qualification', registration }, options, 2);
}
/** Explicit counterfactual target-runtime source; historical state identities remain unchanged. */
export function createGoalQualificationArchiveSourceV3(
  input: GoalQualificationArchiveInput,
  options: GoalQualificationArchiveOptions
): GoalEpisodeEvidenceSource {
  const own = copy(input);
  exactFields(own, ['plan', 'registration', 'request', 'manifest', 'blocks']);
  const { registration, ...common } = own;
  return createArchiveSource(common, { kind: 'qualification', registration }, options, 3);
}
/** Explicit exposed v2 source, without registration or qualification authority. */
export function createGoalArchiveDevelopmentSourceV2(
  input: GoalArchiveDevelopmentInput,
  options: GoalQualificationArchiveOptions
): GoalEpisodeEvidenceSource {
  const own = copy(input);
  exactFields(own, ['plan', 'engineeringReceipt', 'request', 'manifest', 'blocks']);
  const { engineeringReceipt, ...common } = own;
  return createArchiveSource(common, { kind: 'engineering', engineeringReceipt }, options, 2);
}
/** Execute v2 exposed engineering; the retained wrapper remains qualification-ineligible. */
export async function evaluateGoalArchiveEngineeringEpisodeV2(
  input: GoalArchiveDevelopmentInput,
  options: GoalQualificationArchiveOptions
): Promise<Readonly<GoalArchiveEngineeringResult>> {
  const own = copy(input);
  const trace = await createGoalEpisodeEvaluatorV2({
    plan: own.plan,
    source: createGoalArchiveDevelopmentSourceV2(own, options),
  }).evaluate(own.request);
  return copy({
    kind: 'goal-archive-engineering-result-v1',
    qualificationEligible: false,
    exposure: 'already-exposed',
    engineeringReceipt: own.engineeringReceipt,
    trace,
    traceSha256: goalQualificationDigest(trace),
  });
}
/** Both public entries use this exact state selection, transport, raw retention and quote/fee pipeline. */
function createArchiveSource(
  input: Omit<GoalQualificationArchiveInput, 'registration'>,
  access: ArchiveAccess,
  options: GoalQualificationArchiveOptions,
  version: 1 | 2 | 3 = 1
): GoalEpisodeEvidenceSource {
  const { plan, request, manifest, blocks } = input;
  const v2 = version >= 2,
    v3 = version === 3;
  check(
    plan.protocol ===
      (v3 ? GOAL_QUALIFICATION_PROTOCOL_V3 : v2 ? GOAL_QUALIFICATION_PROTOCOL_V2 : GOAL_QUALIFICATION_PROTOCOL)
  );
  const executionModel = v3 ? readGoalTargetExecutionModel(plan.executionModel) : undefined;
  if (executionModel)
    check(same(plan.runtimeProfiles, goalTargetSourceRuntimeProfiles(executionModel)), 'source-runtime');
  else check(!Object.hasOwn(plan, 'executionModel'), 'unexpected-execution-model');
  const catalogModel = executionModel && isGoalCatalogTargetExecutionModel(executionModel) ? executionModel : undefined;
  const binding = readGoalQualificationBinding(request.candidate);
  const phase = request.phase;
  check(phase === 'training' || phase === 'validation');
  const partition = manifest.partitions[phase];
  check(
    !!catalogModel === ('kind' in partition.source && partition.source.kind === 'catalog-source-v1'),
    'metadata-source-model'
  );
  check(
    manifest.protocol === `goal-qualification-archive-source-v${version}` &&
      manifest.genesisHash === GOAL_EXACT_POLICY.genesisHash
  );
  check(
    manifest.warmupHours === 200 &&
      manifest.denominator === binding.denominator &&
      binding.genesisHash === manifest.genesisHash
  );
  check(manifest.sourceId === plan.source.sourceId && goalQualificationDigest(manifest) === plan.source.manifestSha256);
  check(
    SHA.test(manifest.accessAuditSha256) &&
      manifest.operationalIngestionSha256.length <= 32 &&
      manifest.operationalIngestionSha256.every((sha) => SHA.test(sha))
  );
  check(
    SHA.test(partition.receiptSha256) && SHA.test(partition.blocksSha256) && jsonSha(blocks) === partition.blocksSha256
  );
  check(
    partition.identitySha256 === plan[phase].identitySha256 &&
      partition.identitySha256 === request.partitionIdentitySha256
  );
  check(request.planSha256 === goalQualificationDigest(plan));
  if (access.kind === 'qualification') {
    const { registration } = access;
    check(registration.planSha256 === request.planSha256);
    check(registration.kind === 'preregistered-unopened-validation' && SHA.test(registration.registrationSha256));
    check(
      registration.trainingIdentitySha256 === plan.training.identitySha256 &&
        registration.validationIdentitySha256 === plan.validation.identitySha256
    );
  } else {
    const receipt = access.engineeringReceipt;
    exactFields(receipt, [
      'kind',
      'planSha256',
      'requestSha256',
      'manifestSha256',
      'exposureAuditSha256',
      'protocolRecordedBeforeRunSha256',
    ]);
    check(
      phase === 'training' &&
        receipt.kind === 'already-exposed-engineering-run-v1' &&
        receipt.planSha256 === request.planSha256 &&
        receipt.requestSha256 === goalQualificationDigest(request) &&
        receipt.manifestSha256 === plan.source.manifestSha256 &&
        receipt.exposureAuditSha256 === manifest.accessAuditSha256 &&
        typeof receipt.protocolRecordedBeforeRunSha256 === 'string' &&
        SHA.test(receipt.protocolRecordedBeforeRunSha256),
      'engineering-access-binding'
    );
  }
  check(
    request.candidateSha256 === goalQualificationDigest(binding) &&
      plan.candidates.some((candidate) => same(candidate, binding))
  );
  check(
    Number.isSafeInteger(request.episodeIndex) &&
      request.episodeIndex >= 0 &&
      request.episodeIndex < (phase === 'training' ? 4 : 2)
  );
  check(
    request.startAtMs === plan[phase].startAtMs + request.episodeIndex * DAY &&
      request.endAtMs === request.startAtMs + DAY
  );
  check(plan.arrivalModel.kind === 'modeled-finalized-callbacks');
  const arrivalModel = plan.arrivalModel,
    timing = manifest.captureModel;
  check(timing.kind === 'fixed-pinned-capture-delays-v1');
  for (const n of [timing.historyReadMs, timing.indexerPublicationDelayMs, timing.markReadMs, timing.quoteAndFeeReadMs])
    check(Number.isSafeInteger(n) && n >= 0 && n <= 60_000);
  check(
    timing.markReadMs > 0 && timing.markReadMs < 5000 && timing.quoteAndFeeReadMs > 0 && timing.quoteAndFeeReadMs < 5000
  );
  check(timing.historyReadMs + timing.markReadMs + timing.quoteAndFeeReadMs <= arrivalModel.checkDurationMs);
  check(
    Number.isSafeInteger(manifest.maximumHttpRequests) &&
      manifest.maximumHttpRequests > 0 &&
      manifest.maximumHttpRequests <= 10_000
  );
  check(
    Number.isSafeInteger(manifest.maximumResponseBytes) &&
      manifest.maximumResponseBytes > 0 &&
      manifest.maximumResponseBytes <= 256 * 1024 * 1024
  );
  check(blocks.length >= 3 && blocks.length <= 100_000);
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i],
      previous = blocks[i - 1];
    check(
      Number.isSafeInteger(b.height) &&
        b.height > 0 &&
        HASH.test(b.hash) &&
        HASH.test(b.parentHash) &&
        b.hash !== b.parentHash
    );
    check(
      Number.isSafeInteger(b.timestampMs) && b.timestampMs >= 0 && b.height <= partition.source.finalizedSource.height
    );
    if (previous)
      check(b.height === previous.height + 1 && b.parentHash === previous.hash && b.timestampMs > previous.timestampMs);
  }
  /** Complete partition coverage makes this the true immediate predecessor, never a sampled approximation. */
  const asof = (atMs: number) => {
    let low = 0,
      high = blocks.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (blocks[mid].timestampMs <= atMs) low = mid + 1;
      else high = mid;
    }
    check(low > 0 && low < blocks.length, 'missing-metadata-coverage');
    return { index: low - 1, block: blocks[low - 1], successor: blocks[low] };
  };
  const callbackDelay = arrivalModel.finalityDelayMs + arrivalModel.callbackDelayMs;
  const first = asof(request.startAtMs - callbackDelay - 1).index;
  const last = asof(request.endAtMs - callbackDelay - 1).index + 1;
  const clock = (v2 ? buildGoalQualificationClockV2 : buildGoalQualificationClock)({
    episode: { startAtMs: request.startAtMs, endAtMs: request.endAtMs },
    model: arrivalModel,
    source: {
      sourceId: manifest.sourceId,
      genesisHash: manifest.genesisHash,
      manifestSha256: plan.source.manifestSha256,
      preregistrationSha256:
        access.kind === 'qualification'
          ? access.registration.registrationSha256
          : access.engineeringReceipt.protocolRecordedBeforeRunSha256,
    },
    blocks: blocks.slice(first, last + 1),
  });
  const settings = Object.getOwnPropertyDescriptors(options);
  check(
    Reflect.ownKeys(settings).every(
      (key) =>
        typeof key === 'string' &&
        [
          'sink',
          'fetch',
          'marketFetch',
          'signal',
          'timeoutMs',
          ...(v3 ? ['targetCompressedBytes'] : []),
          ...(catalogModel ? ['catalog'] : []),
        ].includes(key) &&
        settings[key].enumerable &&
        'value' in settings[key]
    )
  );
  const targetBinary = v3 ? snapshotGoalArchiveTargetBinary(settings.targetCompressedBytes?.value) : undefined;
  const catalog = catalogModel ? settings.catalog?.value : undefined;
  if (catalogModel) {
    assertGoalRuntimeCatalog(catalog);
    check(catalog.catalogSha256 === catalogModel.catalogSha256, 'catalog-model-pin');
    check(
      createHash('sha256')
        .update(
          readFileSync(new URL('../../src/features/bot-trading/execution-codecs/runtime-catalog.ts', import.meta.url))
        )
        .digest('hex') === catalogModel.implementation.catalogCodecSha256,
      'catalog-codec-pin'
    );
  }

  if (executionModel) {
    // The full executed graph remains preregistered upstream. These explicit pins bind model-critical code.
    for (const [field, path] of [
      ['hostSha256', './goal-target-runtime-host.cjs'],
      ['stateCodecSha256', './goal-target-runtime-state.ts'],
      ['quoteCodecSha256', './goal-target-runtime-quote.ts'],
    ] as const)
      check(
        createHash('sha256')
          .update(readFileSync(new URL(path, import.meta.url)))
          .digest('hex') === executionModel.implementation[field],
        'target-implementation-pin'
      );
  }
  const sink = settings.sink?.value as GoalArchiveEvidenceSink;
  check(sink && typeof sink.retainEvidence === 'function');
  const upstream = (settings.fetch?.value === undefined ? globalThis.fetch : settings.fetch.value) as typeof fetch;
  const marketUpstream = (
    settings.marketFetch?.value === undefined ? upstream : settings.marketFetch.value
  ) as typeof fetch;
  const signal = settings.signal?.value as AbortSignal | undefined;
  const timeoutMs = settings.timeoutMs?.value === undefined ? 20_000 : settings.timeoutMs.value;
  check(
    typeof upstream === 'function' &&
      typeof marketUpstream === 'function' &&
      (signal === undefined || signal instanceof AbortSignal)
  );
  check(Number.isSafeInteger(timeoutMs) && timeoutMs >= 1000 && timeoutMs <= 30_000);
  let requests = 0,
    responseBytes = 0,
    active = false,
    opened = false,
    closed = false;
  let stopped: GoalQualificationArchiveReadError | undefined;
  let deadlineCancellation: GoalEpisodeDeadlineReceipt | undefined;
  const transportFor =
    (fetcher: typeof fetch, marketOnly: boolean): typeof fetch =>
    async (url, init) => {
      const requestSignal = init?.signal;
      const current = () => check(!stopped && !signal?.aborted && !requestSignal?.aborted, 'aborted');
      current();
      check(
        String(url) === 'https://mof2.sora.org/' || (!marketOnly && String(url) === 'https://pi.soramitsu.io/graphql')
      );
      check(++requests <= manifest.maximumHttpRequests, 'request-budget');
      const response = await fetcher(url, init);
      try {
        current();
      } catch (error) {
        // An uncooperative transport can resolve after its caller has stopped waiting.
        void response.body?.cancel().catch(() => undefined);
        throw error;
      }
      check(response.body, 'missing-response-body');
      const stream = response.body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            current();
            responseBytes += chunk.byteLength;
            check(responseBytes <= manifest.maximumResponseBytes, 'response-budget');
            controller.enqueue(chunk);
          },
        })
      );
      // Keep redirect/URL evidence for the underlying reader's strict origin checks.
      return new Proxy(response, {
        get(target, key) {
          if (key === 'body') return stream;
          const value = Reflect.get(target, key, target);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
    };
  const readOptions = Object.freeze({ fetch: transportFor(upstream, false), signal, timeoutMs });
  const marketReadOptions = Object.freeze({ fetch: transportFor(marketUpstream, true), signal, timeoutMs });
  const retain = async (name: string, data: unknown) => {
    const detached = copy(data),
      encoded = canonical(detached),
      expected = createHash('sha256').update(encoded).digest('hex');
    const result = await sink.retainEvidence(name, detached);
    check(result.sha256 === expected && result.bytes === Buffer.byteLength(encoded), 'receipt-persistence');
    return result.sha256;
  };
  const requestDigest = goalQualificationDigest(request);
  let targetSession: Awaited<ReturnType<typeof createGoalTargetRuntimeArchiveQuote>> | undefined;
  const exactRequest = (value: GoalQualificationEvaluationRequest) =>
    check(goalQualificationDigest(value) === requestDigest, 'request-changed');
  const invoke = async <T>(
    stage: string,
    value: GoalQualificationEvaluationRequest,
    action: () => Promise<T>
  ): Promise<T> => {
    if (stopped) throw stopped;
    check(!active && !closed && (!deadlineCancellation || stage === 'terminal'), 'concurrent-or-closed');
    exactRequest(value);
    check(stage === 'open' ? !opened : opened, 'not-open');
    active = true;
    try {
      check(!signal?.aborted, 'aborted');
      return await action();
    } catch (error) {
      if (error instanceof GoalEpisodeDeadlineCancellation) {
        deadlineCancellation = error.receipt;
        throw error;
      }
      stopped = new GoalQualificationArchiveReadError(
        stage,
        error instanceof GoalQualificationArchiveReadError ? error.reason : 'missing-or-inconsistent-evidence'
      );
      const diagnostic =
        error instanceof HistoricalGoalMarketReadError ||
        error instanceof HistoricalExecutionReadError ||
        error instanceof HistoricalGoalBoundFeeReadError ||
        error instanceof GoalQualificationHistoryReadError
          ? error.diagnostic
          : error instanceof GoalTargetRuntimeQuoteError
            ? { stage: error.stage, reason: error.reason, receipts: error.receipts }
            : null;
      await retain('failure.json', { stage, reason: stopped.reason, diagnostic, requests, responseBytes }).catch(
        () => undefined
      );
      await targetSession?.dispose();
      throw stopped;
    } finally {
      active = false;
    }
  };
  const cancelStage = async (
    stage: GoalEpisodeDeadlineReceipt['stage'],
    scheduled: GoalQualificationClockCheck,
    startedAtMs: number,
    plannedReceivedAtMs: number
  ) => {
    if (!v2 || plannedReceivedAtMs < request.endAtMs) return;
    check(
      'cancelledAtMs' in scheduled && scheduled.id === clock.checks.length && startedAtMs < request.endAtMs,
      'invalid-deadline-cancellation'
    );
    const body = { checkId: scheduled.id, stage, startedAtMs, plannedReceivedAtMs, cancelledAtMs: request.endAtMs };
    const evidenceSha256 = await retain('deadline-cancelled-stage.json', {
      ...body,
      completed: false,
      transactionSubmitted: false,
    });
    throw new GoalEpisodeDeadlineCancellation({ ...body, evidenceSha256 });
  };
  type LegacyMarket = Awaited<ReturnType<typeof createHistoricalGoalMarketReader>>;
  type CatalogMarket = Awaited<ReturnType<typeof createCatalogHistoricalGoalMarketReader>>;
  type Market = LegacyMarket | CatalogMarket;
  let market: Market | undefined,
    shard = 0,
    markCount = 0,
    blockOffset = 0,
    storageOffset = 0;
  let schemaSha256 = '';
  let sourceMetadataHex = '',
    propertiesKey = '';
  const cache = new Map<
    number,
    {
      block: GoalQualificationClockBlock;
      mark: GoalEpisodeMarkEvidence['mark'];
      runtimeProfile: GoalQualificationRuntimeProfile;
      rawSha256: string;
      targetSource?: { sourceMetadataHex: string; sourcePropertiesHex: string; sourceCodeHash?: string };
    }
  >();
  const readMark = async (
    selected: GoalQualificationClockBlock,
    name: string,
    captureStartedAtMs: number,
    receivedAtMs: number,
    ageAtMs = receivedAtMs
  ) => {
    check(selected.timestampMs <= captureStartedAtMs && ageAtMs - selected.timestampMs <= 60_000, 'stale-state');
    let known = cache.get(selected.height);
    if (!known) {
      if (!market || markCount === 64) {
        if (catalogModel) {
          assertGoalRuntimeCatalog(catalog);
          market = await createCatalogHistoricalGoalMarketReader(
            {
              source: partition.source as CatalogHistoricalBlockReaderSource,
              expectedDenominator: binding.denominator,
            },
            { ...marketReadOptions, catalog }
          );
          check(
            market.context.genesisHash === manifest.genesisHash &&
              market.context.catalogSha256 === catalog.catalogSha256,
            'runtime-catalog'
          );
          check(
            same(
              market.context.profiles.map(({ profile }) => ({
                specVersion: profile.specVersion,
                transactionVersion: profile.transactionVersion,
                metadataSha256: profile.metadataSha256,
                codeHash: profile.codeHash,
              })),
              plan.runtimeProfiles
            ),
            'runtime-profiles'
          );
        } else {
          market = await createHistoricalGoalMarketReader(
            { source: partition.source as HistoricalBlockReaderSource, expectedDenominator: binding.denominator },
            marketReadOptions
          );
          const schema = market.context.schema;
          const profile = {
            specVersion: schema.runtimeVersion.specVersion,
            transactionVersion: schema.runtimeVersion.transactionVersion,
            metadataSha256: schema.metadataSha256,
            codeHash: schema.codeHash,
          };
          check(
            market.context.genesisHash === manifest.genesisHash && plan.runtimeProfiles.some((p) => same(p, profile)),
            'runtime-profile'
          );
          if (v3) {
            const metadata = market.evidence().blockEvidence.filter((row) => row.method === 'state_getMetadata');
            check(metadata.length === 1 && metadata[0].responseBody, 'target-source-metadata');
            const result: unknown = JSON.parse(metadata[0].responseBody).result;
            check(typeof result === 'string' && /^0x(?:[0-9a-fA-F]{2})+$/.test(result), 'target-source-metadata');
            check(
              createHash('sha256')
                .update(Buffer.from(result.slice(2), 'hex'))
                .digest('hex') === schema.metadataSha256,
              'target-source-metadata'
            );
            sourceMetadataHex = result;
            propertiesKey = createHistoricalExecutionPoolCodec({
              genesisHash: manifest.genesisHash,
              blockHash: market.context.schemaAnchor.hash,
              metadataHex: result,
              runtimeVersion: { specVersion: 130, transactionVersion: 130 },
            }).storageKeys().properties;
          }
        }
        schemaSha256 = await retain(`market-schema-${++shard}.json`, {
          context: market.context,
          evidence: market.evidence(),
        });
        markCount = 0;
        blockOffset = market.evidence().blockEvidence.length;
        storageOffset = 0;
      }
      const value = await market.readMark(selected.height);
      markCount++;
      const raw = market.evidence();
      let runtimeProfile: GoalQualificationRuntimeProfile;
      if (catalogModel) {
        assertGoalRuntimeCatalog(catalog);
        const mark = value as Awaited<ReturnType<CatalogMarket['readMark']>>;
        runtimeProfile = mark.runtimeProfile;
        const entry = lookupGoalRuntimeCatalogEntry(catalog, runtimeProfile.codeHash);
        check(
          entry.role === 'historical-source' &&
            plan.runtimeProfiles.some((profile) => same(profile, runtimeProfile)) &&
            mark.catalogBinding.catalogSha256 === catalog.catalogSha256,
          'mark-runtime-profile'
        );
        sourceMetadataHex = entry.metadataHex;
        propertiesKey = entry.storage.properties.keyHex;
      } else {
        const schema = (market as LegacyMarket).context.schema;
        runtimeProfile = {
          specVersion: schema.runtimeVersion.specVersion as 130 | 131,
          transactionVersion: schema.runtimeVersion.transactionVersion as 130 | 131,
          metadataSha256: schema.metadataSha256,
          codeHash: schema.codeHash,
        };
      }

      const rawSha256 = await retain(`market-state-${selected.height}.json`, {
        schemaSha256,
        value,
        blockEvidence: raw.blockEvidence.slice(blockOffset),
        storageEvidence: raw.storageEvidence.slice(storageOffset),
        ...(catalogModel
          ? {
              blockProfiles: (raw as ReturnType<CatalogMarket['evidence']>).blockProfiles.filter(
                (profile) => profile.hash === selected.hash && profile.height === selected.height
              ),
            }
          : {}),
      });
      blockOffset = raw.blockEvidence.length;
      storageOffset = raw.storageEvidence.length;
      check(same(value.block, selected) && value.mark && value.poolEvidence.status === 'present', 'missing-pool-mark');
      let targetSource: { sourceMetadataHex: string; sourcePropertiesHex: string; sourceCodeHash?: string } | undefined;
      if (v3) {
        const rows = raw.storageEvidence.filter((row) => row.blockHash === selected.hash);
        check(rows.length === 1 && rows[0].responseBody, 'target-source-properties');
        const result = JSON.parse(rows[0].responseBody).result;
        check(
          Array.isArray(result) &&
            result.length === 1 &&
            result[0].block === selected.hash &&
            Array.isArray(result[0].changes),
          'target-source-properties'
        );
        const matches = result[0].changes.filter(
          (entry: unknown) => Array.isArray(entry) && entry[0] === propertiesKey
        );
        check(
          matches.length === 1 &&
            matches[0].length === 2 &&
            typeof matches[0][1] === 'string' &&
            /^0x[0-9a-f]{128}$/.test(matches[0][1]),
          'target-source-properties'
        );
        const sourcePropertiesHex = matches[0][1] as string;
        check(
          sourcePropertiesHex ===
            `${value.poolEvidence.accounts.reservesAccountId}${value.poolEvidence.accounts.feesAccountId.slice(2)}`,
          'target-pool-account-binding'
        );
        targetSource = {
          sourceMetadataHex,
          sourcePropertiesHex,
          ...(catalogModel ? { sourceCodeHash: runtimeProfile.codeHash } : {}),
        };
      }
      known = {
        block: selected,
        mark: { ...value.mark, blockNumber: selected.height, denominator: binding.denominator },
        runtimeProfile,
        rawSha256,
        ...(targetSource ? { targetSource } : {}),
      };
      cache.set(selected.height, known);
    }
    const projection = {
      sourceManifestSha256: plan.source.manifestSha256,
      genesisHash: manifest.genesisHash,
      block: known.block,
      mark: known.mark,
      runtimeProfile: known.runtimeProfile,
      captureStartedAtMs,
      receivedAtMs,
    };
    const evidenceSha256 = await retain(name, { ...projection, rawSha256: known.rawSha256, timingKind: timing.kind });
    return copy({ ...projection, evidenceSha256 });
  };
  const suppliedCheck = (value: GoalQualificationClockCheck) => {
    const detached = copy(value),
      expected = clock.checks[detached.id - 1];
    check(expected && same(detached, expected), 'check-changed');
    return expected;
  };
  const histories = new Map<number, number>();
  const valuations = new Map<number, GoalEpisodeMarkEvidence>();
  const quotes = new Set<number>();
  let lastValuation = 0;
  const source: GoalEpisodeEvidenceSource = {
    open: (value, suppliedSelection) =>
      invoke('open', value, async () => {
        const selection = suppliedSelection === undefined ? undefined : copy(suppliedSelection);
        if (access.kind === 'engineering') check(selection === undefined, 'engineering-selection-forbidden');
        else if (phase === 'validation')
          check(
            selection &&
              selection.kind === 'selection-sealed-before-validation' &&
              selection.registrationSha256 === access.registration.registrationSha256 &&
              selection.candidateSha256 === request.candidateSha256 &&
              selection.validationIdentitySha256 === request.partitionIdentitySha256 &&
              SHA.test(selection.sealSha256),
            'validation-not-sealed'
          );
        else check(selection === undefined, 'unexpected-selection');
        await retain('source.json', {
          manifest,
          request,
          ...(access.kind === 'qualification'
            ? { registration: access.registration, selection: selection ?? null }
            : {
                kind: 'already-exposed-engineering-source-v1',
                qualificationEligible: false,
                exposure: 'already-exposed',
                engineeringReceipt: access.engineeringReceipt,
              }),
          metadataReceiptSha256: partition.receiptSha256,
          blocksSha256: partition.blocksSha256,
          clock,
          observedHistoricalArrivals: false,
          observedFill: false,
          transactionSubmitted: false,
        });
        const captureStartedAtMs = request.startAtMs - timing.markReadMs;
        const opening = await readMark(
          asof(captureStartedAtMs - arrivalModel.finalityDelayMs).block,
          'opening.json',
          captureStartedAtMs,
          request.startAtMs
        );
        opened = true;
        return copy({ dataSha256: plan.source.manifestSha256, clock: clock.trace, opening });
      }),
    history: (value, raw) =>
      invoke('history', value, async () => {
        const item = copy(raw),
          checkAt = suppliedCheck(item.check);
        check(checkAt.id === lastValuation + 1 && !histories.has(checkAt.id), 'history-order');
        check(item.completedAtMs === Math.floor(checkAt.checkedAtMs / HOUR) * HOUR, 'signal-hour');
        if (v2) {
          const successor = asof(item.completedAtMs - 1).successor;
          const notBeforeMs =
            Math.floor(successor.timestampMs / 1000) * 1000 +
            999 +
            arrivalModel.finalityDelayMs +
            timing.indexerPublicationDelayMs;
          if (checkAt.checkedAtMs < notBeforeMs) {
            const pending = {
              kind: 'awaiting-history' as const,
              completedAtMs: item.completedAtMs,
              checkedAtMs: checkAt.checkedAtMs,
              notBeforeMs,
            };
            const evidenceSha256 = await retain(`history-pending-${checkAt.id}.json`, {
              ...pending,
              successor,
              marketValuesRead: false,
            });
            return copy({ ...pending, evidenceSha256 });
          }
          await cancelStage('history', checkAt, checkAt.checkedAtMs, checkAt.checkedAtMs + timing.historyReadMs);
        }

        const history = await readGoalQualificationHistory(
          {
            startAtMs: item.completedAtMs - (manifest.warmupHours + 1) * HOUR,
            endAtMs: item.completedAtMs,
            genesisHash: manifest.genesisHash,
            denominator: binding.denominator,
          },
          readOptions
        );
        const evidenceSha256 = await retain(`history-${checkAt.id}.json`, history);
        const latestSuccessorUpperBound = Math.max(
          ...history.history.boundaries.map((b) => b.successor.timestampSeconds * 1000 + 999)
        );
        const availableAtMs = Math.max(
          checkAt.checkedAtMs + timing.historyReadMs,
          latestSuccessorUpperBound + arrivalModel.finalityDelayMs + timing.indexerPublicationDelayMs
        );
        check(
          (v2 ? availableAtMs : availableAtMs + timing.markReadMs + timing.quoteAndFeeReadMs) <=
            goalClockCheckCutoff(checkAt),
          'history-unavailable-within-check'
        );
        histories.set(checkAt.id, availableAtMs);
        return copy({ history: history.history, availableAtMs, evidenceSha256 });
      }),
    valuation: (value, raw) =>
      invoke('valuation', value, async () => {
        const item = copy(raw),
          checkAt = suppliedCheck(item.check);
        check(checkAt.id === lastValuation + 1, 'valuation-order');
        const captureStartedAtMs = histories.get(checkAt.id) ?? checkAt.checkedAtMs;
        check(item.notBeforeMs === captureStartedAtMs, 'capture-clock-changed');
        const receivedAtMs = captureStartedAtMs + timing.markReadMs;
        await cancelStage('valuation', checkAt, captureStartedAtMs, receivedAtMs);
        check(receivedAtMs <= goalClockCheckCutoff(checkAt), 'capture-crossed-check');
        const selected = asof(captureStartedAtMs - arrivalModel.finalityDelayMs).block;
        check(
          selected.height >= checkAt.arrival.block.height &&
            (selected.height !== checkAt.arrival.block.height || selected.hash === checkAt.arrival.block.hash),
          'state-before-callback'
        );
        const context = await readMark(selected, `valuation-${checkAt.id}.json`, captureStartedAtMs, receivedAtMs);
        valuations.set(checkAt.id, context);
        lastValuation = checkAt.id;
        return context;
      }),
    quote: (value, raw) =>
      invoke('quote', value, async () => {
        const item = copy(raw),
          checkAt = suppliedCheck(item.check),
          context = valuations.get(checkAt.id);
        check(
          context && checkAt.id === lastValuation && same(context, item.valuation) && !quotes.has(checkAt.id),
          'quote-order-or-state'
        );
        check(
          Number.isSafeInteger(item.signalIndex) &&
            item.signalIndex >= 0 &&
            item.signalIndex < 24 &&
            item.decisionAtMs === context.receivedAtMs,
          'decision-changed'
        );
        check(
          Math.floor(item.decisionAtMs / HOUR) * HOUR === request.startAtMs + item.signalIndex * HOUR,
          'signal-hour'
        );
        check(histories.has(checkAt.id), 'quote-without-history');
        const pending = item.pending;
        check(
          pending.expectedDenominator === binding.denominator &&
            ((pending.assetIn === KUSD && pending.assetOut === XOR) ||
              (pending.assetIn === XOR && pending.assetOut === KUSD))
        );
        check(
          /^[1-9]\d{0,38}$/.test(pending.amountInCodec) &&
            BigInt(pending.amountInCodec) <=
              BigInt(pending.assetIn === KUSD ? binding.maxTradeKusdCodec : binding.maxTradeXorCodec),
          'input-changed'
        );
        const receivedAtMs = item.decisionAtMs + timing.quoteAndFeeReadMs;
        await cancelStage('quote', checkAt, item.decisionAtMs, receivedAtMs);
        check(
          receivedAtMs <= goalClockCheckCutoff(checkAt) && receivedAtMs - context.mark.timestampMs <= 60_000,
          'quote-crossed-check'
        );
        quotes.add(checkAt.id);
        if (executionModel) {
          const known = cache.get(context.block.height);
          check(known?.targetSource && targetBinary, 'target-state-not-authenticated');
          if (!targetSession)
            targetSession = catalogModel
              ? await createGoalCatalogTargetRuntimeArchiveQuote({
                  catalog: catalog as GoalRuntimeCatalog,
                  compressedBytes: targetBinary,
                  signal,
                  timeoutMs,
                })
              : await createGoalTargetRuntimeArchiveQuote({ compressedBytes: targetBinary, signal, timeoutMs });
          const acquired = await targetSession.quote(
            {
              sourceBlock: { hash: context.block.hash, height: context.block.height },
              ...known.targetSource,
              assetIn: pending.assetIn,
              assetOut: pending.assetOut,
              amountInCodec: pending.amountInCodec,
              fetch: readOptions.fetch,
              retain: async (receipt) => {
                await retain(`target-rpc-${checkAt.id}-${receipt.id}.json`, receipt);
              },
            },
            { signal, timeoutMs }
          );
          const { estimate } = acquired;
          const executionModelSha256 = goalQualificationDigest(executionModel);
          const quoteEvidenceSha256 = await retain(`quote-${checkAt.id}.json`, {
            protocol: 'target-runtime-archive-quote-v1',
            executionModelSha256,
            sourceRawSha256: known.rawSha256,
            sourcePropertiesHex: known.targetSource.sourcePropertiesHex,
            receipts: acquired.receipts,
            estimate,
          });
          const feeEvidenceSha256 =
            estimate.kind === 'hypothetical-target-runtime-execution-estimate'
              ? await retain(`fee-${checkAt.id}.json`, {
                  protocol: 'target-runtime-archive-fee-v1',
                  quoteEvidenceSha256,
                  fees: estimate.fees,
                  envelope: estimate.envelope,
                  apis: estimate.apis.slice(1),
                })
              : undefined;
          const pinnedContext = { ...context, captureStartedAtMs: item.decisionAtMs, receivedAtMs: item.decisionAtMs };
          const pinnedEvidenceSha256 = await retain(`quote-context-${checkAt.id}.json`, {
            context: pinnedContext,
            pending,
            valuationEvidenceSha256: context.evidenceSha256,
            quoteEvidenceSha256,
            ...(feeEvidenceSha256 ? { feeEvidenceSha256 } : {}),
            executionModelSha256,
            receivedAtMs,
            timingKind: timing.kind,
          });
          const common = {
            context: { ...pinnedContext, evidenceSha256: pinnedEvidenceSha256 },
            receivedAtMs,
            pending,
            quoteEvidenceSha256,
            executionRuntimeProfile: executionModel.targetRuntimeProfile,
            executionModelSha256,
            dexId: 0 as const,
            liquiditySource: 'XYKPool' as const,
            filter: 'AllowSelected' as const,
            slippageBasisPoints: 50 as const,
            observedFill: false as const,
            transactionSubmitted: false as const,
            feeAdequacyVerified: false as const,
          };
          if (estimate.kind === 'target-runtime-route-unavailable')
            return copy({ ...common, kind: 'target-runtime-route-unavailable' as const });
          check(feeEvidenceSha256, 'target-fee-evidence');
          return copy({
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
            feeEvidenceSha256,
          });
        }
        const original = await readHistoricalExecutionQuote(
          {
            block: { height: context.block.height, hash: context.block.hash },
            finalizedSource: partition.source.finalizedSource,
            ...pending,
          },
          readOptions
        );
        const quoteEvidenceSha256 = await retain(`quote-${checkAt.id}.json`, original);
        check(original.kind === 'hypothetical-historical-execution-estimate', 'quote-unavailable');
        check(
          original.context.parentHash === context.block.parentHash &&
            original.context.state.timestampMs === context.mark.timestampMs &&
            original.context.codecBinding.metadataSha256 === context.runtimeProfile.metadataSha256 &&
            original.context.codecBinding.runtimeVersion.specVersion === context.runtimeProfile.specVersion &&
            original.context.codecBinding.runtimeVersion.transactionVersion ===
              context.runtimeProfile.transactionVersion,
          'quote-state-changed'
        );
        const metadata = original.rpcEvidence.filter(
          (row) => row.method === 'state_getMetadata' && same(row.params, [context.block.hash])
        );
        check(metadata.length === 1 && metadata[0].responseBody);
        const metadataHex = JSON.parse(metadata[0].responseBody).result as string;
        const feeSource = {
          identity: {
            genesisHash: manifest.genesisHash,
            blockHash: context.block.hash,
            metadataHex,
            runtimeVersion: {
              specVersion: context.runtimeProfile.specVersion,
              transactionVersion: context.runtimeProfile.transactionVersion,
            },
          },
          blockNumber: context.block.height,
          request: {
            assetIn: pending.assetIn,
            assetOut: pending.assetOut,
            amountInCodec: pending.amountInCodec,
            quotedAmountOutCodec: original.quote.amountOutCodec,
          },
          quoteEvidence: original,
        };
        const prepared = prepareHistoricalGoalBoundFeeSource(feeSource);
        const fee = await readHistoricalGoalBoundFee(feeSource, readOptions);
        const feeEvidenceSha256 = await retain(`fee-${checkAt.id}.json`, fee);
        check(
          same(fee.receipt.envelope, prepared.bound) && fee.info.partialFeeCodec === fee.details.finalFee,
          'fee-binding'
        );
        const pinnedContext = { ...context, captureStartedAtMs: item.decisionAtMs, receivedAtMs: item.decisionAtMs };
        const pinnedEvidenceSha256 = await retain(`quote-context-${checkAt.id}.json`, {
          context: pinnedContext,
          pending,
          valuationEvidenceSha256: context.evidenceSha256,
          quoteEvidenceSha256,
          feeEvidenceSha256,
          receivedAtMs,
          timingKind: timing.kind,
        });
        return copy({
          context: { ...pinnedContext, evidenceSha256: pinnedEvidenceSha256 },
          receivedAtMs,
          pending,
          quotedOutputCodec: prepared.quote.amountOutCodec,
          withoutImpactCodec: prepared.quote.amountWithoutImpactCodec,
          minimumOutputCodec: prepared.bound.minimumCodec,
          feeCodec: fee.info.partialFeeCodec,
          queryInfoFeeCodec: fee.info.partialFeeCodec,
          queryDetailsFeeCodec: fee.details.finalFee,
          feeAsset: XOR,
          feePolicyId: prepared.bound.policy.id,
          feePolicySha256: prepared.bound.policySha256,
          quoteEvidenceSha256,
          feeEvidenceSha256,
          dexId: 0,
          liquiditySource: 'XYKPool',
          filter: 'AllowSelected',
          slippageBasisPoints: 50,
          observedFill: false,
          transactionSubmitted: false,
          feeAdequacyVerified: false,
        });
      }),
    terminal: (value) =>
      invoke('terminal', value, async () => {
        check(
          lastValuation ===
            clock.checks.length - (deadlineCancellation && deadlineCancellation.stage !== 'quote' ? 1 : 0),
          'incomplete-valuations'
        );
        const selected = asof(request.endAtMs);
        check(request.endAtMs - selected.block.timestampMs <= 60_000, 'stale-terminal');
        const captureStartedAtMs = request.endAtMs + arrivalModel.finalityDelayMs;
        // Retrospective terminal proof; the exact deadline remains the accounting time.
        const context = await readMark(
          selected.block,
          'terminal.json',
          captureStartedAtMs,
          captureStartedAtMs + timing.markReadMs,
          request.endAtMs
        );
        await retain('complete-source.json', {
          requestSha256: requestDigest,
          requests,
          responseBytes,
          marks: cache.size,
          quotes: quotes.size,
          terminalSuccessor: selected.successor,
          observedHistoricalArrivals: false,
          observedFill: false,
          transactionSubmitted: false,
        });
        await targetSession?.dispose();
        closed = true;
        return copy({ context, successor: selected.successor });
      }),
  };
  return Object.freeze(source);
}
