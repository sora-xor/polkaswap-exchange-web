import {
  assertGoalRuntimeCatalog,
  type GoalRuntimeCatalog,
} from '../../src/features/bot-trading/execution-codecs/runtime-catalog';
import {
  isGoalCatalogTargetExecutionModel,
  readGoalTargetExecutionModel,
} from '../../src/features/bot-trading/goal-target-model';
/** Filesystem composition of the durable study journal and read-only causal archive evaluator. */
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import {
  goalQualificationDigest as digest,
  GOAL_QUALIFICATION_PROTOCOL,
  GOAL_QUALIFICATION_PROTOCOL_V2,
  GOAL_QUALIFICATION_PROTOCOL_V3,
  goalQualificationEvidenceProtocol,
  type GoalQualificationEvaluator,
  type GoalQualificationPlan,
  type GoalQualificationRegistration,
  type GoalQualificationEvaluationRequest,
} from '../../src/features/bot-trading/goal-qualification';
import type { GoalQualificationClockBlock } from '../../src/features/bot-trading/goal-qualification-clock';
import {
  createGoalEpisodeEvaluator,
  createGoalEpisodeEvaluatorV2,
  createGoalEpisodeEvaluatorV3,
} from '../../src/features/bot-trading/goal-episode-evaluator';
import {
  createGoalQualificationArchiveSource,
  createGoalQualificationArchiveSourceV2,
  createGoalQualificationArchiveSourceV3,
  snapshotGoalArchiveTargetBinary,
  type GoalQualificationArchiveManifest,
} from './goal-qualification-archive-reader';
import {
  openGoalQualificationStudyStore,
  openGoalQualificationStudyStoreV2,
  openGoalQualificationStudyStoreV3,
  openGoalQualificationStudyContinuationV2,
  type GoalStudyEvidenceSink,
  type GoalStudyAcquisitionContinuation,
} from './goal-qualification-study-store';

const MAX_BYTES = 32 * 1024 * 1024;
const HASH = /^0x[0-9a-f]{64}$/;
const SHA = /^[0-9a-f]{64}$/;

/** Trusted program context, supplied only after this exact episode's durable access and metadata checks. */
export interface GoalEpisodeMarketFetchContext {
  request: Readonly<GoalQualificationEvaluationRequest>;
  sink: GoalStudyEvidenceSink;
  /** Owned episode lifetime; aborts on evaluator disposal, factory timeout or episode completion/failure. */
  signal: AbortSignal;
}
/** Prepare a metadata replay transport; live acquisition starts only when its returned fetch is called. */
export type GoalEpisodeMarketFetchFactory = (
  context: Readonly<GoalEpisodeMarketFetchContext>
) => typeof fetch | Promise<typeof fetch>;
/** Ordinary history/quote/fee and canonical market read lanes owned by one episode. */
export interface GoalEpisodeFetch {
  fetch: typeof fetch;
  marketFetch: typeof fetch;
}
/** Install both owned acquisition lanes after durable access; never a serialized plan dependency. */
export type GoalEpisodeFetchFactory = (
  context: Readonly<GoalEpisodeMarketFetchContext>
) => GoalEpisodeFetch | Promise<GoalEpisodeFetch>;

export interface GoalQualificationArchiveEvaluatorOptions {
  directory: string;
  plan: GoalQualificationPlan;
  manifest: GoalQualificationArchiveManifest;
  /** Trusted operational paths; neither partition is opened until its durable request access marker exists. */
  metadataPaths: { training: string; validation: string };
  /** Caller-verified executed-source manifest hash, fixed before training and equal to the plan's evaluator hash. */
  sourceSha256: string;
  fetch?: typeof fetch;
  /** Used only by canonical pool/mark reads; quote, bounded fee and history use ordinary fetch. */
  marketFetch?: typeof fetch;
  /** Trusted executable dependency, mutually exclusive with marketFetch; never accepted from plan JSON. */
  episodeMarketFetch?: GoalEpisodeMarketFetchFactory;
  /** Trusted two-lane factory; mutually exclusive with marketFetch and episodeMarketFetch. */
  episodeFetch?: GoalEpisodeFetchFactory;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** V3 only, pinned public runtime bytes; snapshotted before store access. */
  targetCompressedBytes?: Uint8Array;
  /** Explicit owned decoder catalog for catalog-model V3 studies only. */
  catalog?: GoalRuntimeCatalog;
  /** V3 only: lower aggregate raw wrapper file-byte ceiling, including final newlines; at most 512 MiB. */
  maximumRawEvidenceBytesPerEpisode?: number;
}
export interface GoalQualificationArchiveEvaluator extends GoalQualificationEvaluator {
  /** Revoke new work immediately, abort owned read waits and finish the journal's durable cleanup. */
  dispose(): Promise<void>;
}
function check(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(`Goal archive evaluator: ${reason}`);
}
function fields(value: object, names: readonly string[]): void {
  const keys = Reflect.ownKeys(value);
  check(keys.length === names.length && names.every((name) => Object.hasOwn(value, name)), 'fields');
}
/** The shared digest rejects executable/non-data structures; then copy descriptors without invoking user code. */
function snapshot<T>(input: T): T {
  digest(input);
  const copy = (value: unknown): unknown => {
    if (!value || typeof value !== 'object') return value;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Array.isArray(value))
      return Object.freeze(Array.from({ length: value.length }, (_, index) => copy(descriptors[index].value)));
    return Object.freeze(
      Object.fromEntries(Object.keys(descriptors).map((key) => [key, copy(descriptors[key].value)]))
    );
  };
  return copy(input) as T;
}

/** Bound factory readiness and ignore late resolution; uncooperative work is fenced, not claimed stopped. */
function readyMarketFetch(
  factory: GoalEpisodeMarketFetchFactory,
  context: Readonly<GoalEpisodeMarketFetchContext>,
  timeoutMs: number
): Promise<typeof fetch> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (value?: typeof fetch, error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      context.signal.removeEventListener('abort', abort);
      if (error) reject(error);
      else resolve(value!);
    };
    const abort = () => finish(undefined, new Error('Goal archive evaluator: disposed-or-aborted'));
    const timer = setTimeout(
      () => finish(undefined, new Error('Goal archive evaluator: episode-market-fetch-timeout')),
      timeoutMs
    );
    context.signal.addEventListener('abort', abort, { once: true });
    if (context.signal.aborted) abort();
    void Promise.resolve()
      .then(() => {
        check(!context.signal.aborted, 'disposed-or-aborted');
        return factory(context);
      })
      .then(
        (value) => {
          if (context.signal.aborted) return abort();
          if (typeof value !== 'function')
            return finish(undefined, new Error('Goal archive evaluator: episode-market-fetch-result'));
          finish(value);
        },
        () => finish(undefined, new Error('Goal archive evaluator: episode-market-fetch-failed'))
      );
  });
}

/** Snapshot both functions without invoking accessors, and fence late factory work using the episode lifetime. */
function readyEpisodeFetch(
  factory: GoalEpisodeFetchFactory,
  context: Readonly<GoalEpisodeMarketFetchContext>,
  timeoutMs: number
): Promise<Readonly<GoalEpisodeFetch>> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (value?: Readonly<GoalEpisodeFetch>, error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      context.signal.removeEventListener('abort', abort);
      if (error) reject(error);
      else resolve(value!);
    };
    const abort = () => finish(undefined, new Error('Goal archive evaluator: disposed-or-aborted'));
    const timer = setTimeout(
      () => finish(undefined, new Error('Goal archive evaluator: episode-fetch-timeout')),
      timeoutMs
    );
    const received = (value: unknown) => {
      if (settled) return;
      if (context.signal.aborted) return abort();
      try {
        check(
          value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype,
          'episode-fetch-result'
        );
        const own = Object.getOwnPropertyDescriptors(value);
        check(
          Reflect.ownKeys(own).length === 2 &&
            ['fetch', 'marketFetch'].every(
              (key) => own[key]?.enumerable && 'value' in own[key] && typeof own[key].value === 'function'
            ),
          'episode-fetch-result'
        );
        finish(Object.freeze({ fetch: own.fetch.value, marketFetch: own.marketFetch.value }));
      } catch {
        finish(undefined, new Error('Goal archive evaluator: episode-fetch-result'));
      }
    };
    const failed = () => finish(undefined, new Error('Goal archive evaluator: episode-fetch-failed'));
    context.signal.addEventListener('abort', abort, { once: true });
    if (context.signal.aborted) abort();
    queueMicrotask(() => {
      if (settled) return;
      if (context.signal.aborted) return abort();
      try {
        const result = factory(context);
        // Only genuine promises are awaited; a result object's `then` accessor is never executed.
        if (result instanceof Promise) void result.then(received, failed);
        else received(result);
      } catch {
        failed();
      }
    });
  });
}

/** Leaf symlinks, special files, growth, truncated/invalid UTF-8 and changed file identities are rejected. */
async function readBlocks(path: string, assertCurrent: () => void) {
  assertCurrent();
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    assertCurrent();
    const before = await handle.stat({ bigint: true });
    check(before.isFile() && before.size > 0n && before.size <= BigInt(MAX_BYTES), 'metadata-file-size');
    const chunks: Buffer[] = [];
    let bytes = 0;
    for (;;) {
      assertCurrent();
      const buffer = Buffer.alloc(64 * 1024);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      assertCurrent();
      if (!bytesRead) break;
      bytes += bytesRead;
      check(bytes <= MAX_BYTES, 'metadata-file-size');
      chunks.push(buffer.subarray(0, bytesRead));
    }
    const after = await handle.stat({ bigint: true });
    assertCurrent();
    check(
      after.isFile() &&
        BigInt(bytes) === before.size &&
        ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'].every(
          (key) => before[key as keyof typeof before] === after[key as keyof typeof after]
        ),
      'metadata-file-changed'
    );
    const body = Buffer.concat(chunks);
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(body));
    check(Array.isArray(value) && value.length >= 3 && value.length <= 100_000, 'metadata-block-count');
    const blocks: readonly GoalQualificationClockBlock[] = Object.freeze(
      value.map((row: unknown) => {
        check(row && typeof row === 'object' && !Array.isArray(row), 'metadata-block');
        fields(row, ['height', 'hash', 'parentHash', 'timestampMs']);
        const block = row as GoalQualificationClockBlock;
        check(
          Number.isSafeInteger(block.height) &&
            block.height > 0 &&
            block.height <= 0xffffffff &&
            Number.isSafeInteger(block.timestampMs) &&
            block.timestampMs >= 0 &&
            typeof block.hash === 'string' &&
            HASH.test(block.hash) &&
            typeof block.parentHash === 'string' &&
            HASH.test(block.parentHash),
          'metadata-block'
        );
        // Preserve JSON field order: the archive manifest binds SHA-256(JSON.stringify(blocks)).
        return Object.freeze(block);
      })
    );
    assertCurrent();
    return Object.freeze({
      blocks,
      bytes,
      fileSha256: createHash('sha256').update(body).digest('hex'),
      blocksSha256: createHash('sha256').update(JSON.stringify(blocks)).digest('hex'),
    });
  } finally {
    await handle.close();
  }
}

/**
 * Install the real store/source/replay composition. Source code and filesystem authority must be
 * frozen and verified upstream. This Node-only evaluator never grants browser or signing authority.
 */
export function openGoalQualificationArchiveEvaluator(
  options: GoalQualificationArchiveEvaluatorOptions
): Promise<GoalQualificationArchiveEvaluator> {
  return openArchiveEvaluator(options, 1);
}
/** Explicit v2 composition; v1 remains unable to install a v2 plan/source. */
export function openGoalQualificationArchiveEvaluatorV2(
  options: GoalQualificationArchiveEvaluatorOptions
): Promise<GoalQualificationArchiveEvaluator> {
  return openArchiveEvaluator(options, 2);
}
/** Explicit source130/target131 composition; v1/v2 keep their original acquisition and execution rules. */
export function openGoalQualificationArchiveEvaluatorV3(
  options: GoalQualificationArchiveEvaluatorOptions
): Promise<GoalQualificationArchiveEvaluator> {
  return openArchiveEvaluator(options, 3);
}
/** Explicit source-bound continuation requiring owned dual-lane replay; the store validates its proof. */
export function openGoalQualificationArchiveContinuationV2(
  options: GoalQualificationArchiveEvaluatorOptions,
  continuation: GoalStudyAcquisitionContinuation
): Promise<GoalQualificationArchiveEvaluator> {
  return openArchiveEvaluator(options, 2, { continuation });
}
async function openArchiveEvaluator(
  options: GoalQualificationArchiveEvaluatorOptions,
  version: 1 | 2 | 3,
  installation?: { continuation: GoalStudyAcquisitionContinuation }
): Promise<GoalQualificationArchiveEvaluator> {
  check(options && Object.getPrototypeOf(options) === Object.prototype, 'options');
  const descriptors = Object.getOwnPropertyDescriptors(options);
  const required = ['directory', 'plan', 'manifest', 'metadataPaths', 'sourceSha256'];
  const allowed = [
    ...required,
    'fetch',
    'marketFetch',
    'episodeMarketFetch',
    'episodeFetch',
    'signal',
    'timeoutMs',
    ...(version === 3 ? ['targetCompressedBytes', 'catalog', 'maximumRawEvidenceBytesPerEpisode'] : []),
  ];
  check(
    required.every((key) => Object.hasOwn(descriptors, key)) &&
      Reflect.ownKeys(descriptors).every(
        (key) =>
          typeof key === 'string' && allowed.includes(key) && descriptors[key].enumerable && 'value' in descriptors[key]
      ),
    'option-fields'
  );
  const data = snapshot({
    directory: descriptors.directory.value as string,
    plan: descriptors.plan.value as GoalQualificationPlan,
    manifest: descriptors.manifest.value as GoalQualificationArchiveManifest,
    metadataPaths: descriptors.metadataPaths.value as GoalQualificationArchiveEvaluatorOptions['metadataPaths'],
    sourceSha256: descriptors.sourceSha256.value as string,
  });
  const upstream = (
    descriptors.fetch?.value === undefined ? globalThis.fetch : descriptors.fetch.value
  ) as typeof fetch;
  const marketUpstream = (
    descriptors.marketFetch?.value === undefined ? upstream : descriptors.marketFetch.value
  ) as typeof fetch;
  const episodeMarketFetch = descriptors.episodeMarketFetch?.value as GoalEpisodeMarketFetchFactory | undefined;
  const episodeFetch = descriptors.episodeFetch?.value as GoalEpisodeFetchFactory | undefined;
  const signal = descriptors.signal?.value as AbortSignal | undefined;
  const timeoutMs = descriptors.timeoutMs?.value === undefined ? 20_000 : descriptors.timeoutMs.value;
  const hasEvidenceLimit = Object.hasOwn(descriptors, 'maximumRawEvidenceBytesPerEpisode');
  const maximumRawEvidenceBytesPerEpisode = descriptors.maximumRawEvidenceBytesPerEpisode?.value as number | undefined;
  if (hasEvidenceLimit)
    check(
      Number.isSafeInteger(maximumRawEvidenceBytesPerEpisode) &&
        maximumRawEvidenceBytesPerEpisode! > 0 &&
        maximumRawEvidenceBytesPerEpisode! <= 512 * 1024 * 1024,
      'raw-byte-limit-option'
    );
  const targetCompressedBytes =
    version === 3 ? snapshotGoalArchiveTargetBinary(descriptors.targetCompressedBytes?.value) : undefined;
  const catalog = descriptors.catalog?.value;
  const catalogMode =
    version === 3 &&
    data.plan.executionModel !== undefined &&
    isGoalCatalogTargetExecutionModel(data.plan.executionModel);
  if (catalogMode) {
    const model = readGoalTargetExecutionModel(data.plan.executionModel);
    assertGoalRuntimeCatalog(catalog);
    check(isGoalCatalogTargetExecutionModel(model) && catalog.catalogSha256 === model.catalogSha256, 'catalog-model');
  } else check(catalog === undefined, 'catalog-model');
  // Reject an impossible source/model composition before reserving any one-shot study access.
  for (const partition of Object.values(data.manifest.partitions))
    check(
      catalogMode === ('kind' in partition.source && partition.source.kind === 'catalog-source-v1'),
      'metadata-source-model'
    );
  fields(data.metadataPaths, ['training', 'validation']);
  check(
    [data.directory, data.metadataPaths.training, data.metadataPaths.validation].every(
      (path) => typeof path === 'string' && path.length <= 4096 && !path.includes('\0') && isAbsolute(path)
    ),
    'absolute-paths'
  );
  check(
    typeof data.sourceSha256 === 'string' &&
      SHA.test(data.sourceSha256) &&
      data.sourceSha256 === data.plan.source.evaluatorSha256 &&
      digest(data.manifest) === data.plan.source.manifestSha256 &&
      data.manifest.sourceId === data.plan.source.sourceId &&
      data.manifest.partitions.training.identitySha256 === data.plan.training.identitySha256 &&
      data.manifest.partitions.validation.identitySha256 === data.plan.validation.identitySha256,
    'source-binding'
  );
  check(typeof upstream === 'function', 'fetch');
  check(typeof marketUpstream === 'function', 'market-fetch');
  check(episodeMarketFetch === undefined || typeof episodeMarketFetch === 'function', 'episode-market-fetch');
  check(
    episodeMarketFetch === undefined || descriptors.marketFetch?.value === undefined,
    'mutually-exclusive-market-fetch'
  );
  check(episodeFetch === undefined || typeof episodeFetch === 'function', 'episode-fetch');
  check(!installation || episodeFetch !== undefined, 'continuation-episode-fetch-required');
  check(
    episodeFetch === undefined || (descriptors.marketFetch?.value === undefined && episodeMarketFetch === undefined),
    'mutually-exclusive-episode-fetch'
  );
  check(signal === undefined || signal instanceof AbortSignal, 'signal');
  check(Number.isSafeInteger(timeoutMs) && timeoutMs >= 1000 && timeoutMs <= 30_000, 'timeout');
  check(
    data.plan.protocol ===
      (version === 3
        ? GOAL_QUALIFICATION_PROTOCOL_V3
        : version === 2
          ? GOAL_QUALIFICATION_PROTOCOL_V2
          : GOAL_QUALIFICATION_PROTOCOL),
    'plan-version'
  );
  const planSha256 = digest(data.plan);
  const lifetime = new AbortController();
  const abort = () => lifetime.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const assertCurrent = () => check(!lifetime.signal.aborted, 'disposed-or-aborted');
  let store: Awaited<ReturnType<typeof openGoalQualificationStudyStore>>;
  try {
    assertCurrent();
    const storeOptions = {
      directory: data.directory,
      sourceSha256: data.sourceSha256,
      ...(hasEvidenceLimit ? { maximumRawEvidenceBytesPerEpisode } : {}),
    };
    store = await (installation
      ? openGoalQualificationStudyContinuationV2(storeOptions, installation.continuation)
      : (version === 3
          ? openGoalQualificationStudyStoreV3
          : version === 2
            ? openGoalQualificationStudyStoreV2
            : openGoalQualificationStudyStore)(storeOptions));
  } catch (error) {
    signal?.removeEventListener('abort', abort);
    throw error;
  }
  if (lifetime.signal.aborted) {
    signal?.removeEventListener('abort', abort);
    await store.dispose();
    assertCurrent();
  }
  let registration: Readonly<GoalQualificationRegistration> | undefined;
  let disposal: Promise<void> | undefined;
  return Object.freeze({
    protocol: goalQualificationEvidenceProtocol(data.plan.protocol),
    sourceSha256: data.sourceSha256,
    async register(plan, restored) {
      assertCurrent();
      const ownPlan = snapshot(plan);
      check(digest(ownPlan) === planSha256, 'different-plan');
      const result = await store.register(ownPlan, restored);
      assertCurrent();
      registration = result;
      return result;
    },
    async sealSelection(input, restored) {
      assertCurrent();
      const own = snapshot(input);
      check(
        registration &&
          own.registrationSha256 === registration.registrationSha256 &&
          own.validationIdentitySha256 === data.plan.validation.identitySha256 &&
          data.plan.candidates.some((candidate) => digest(candidate) === own.candidateSha256),
        'selection-binding'
      );
      const result = await store.sealSelection(own, restored);
      assertCurrent();
      return result;
    },
    async evaluate(request, selection) {
      assertCurrent();
      const ownRequest = snapshot(request);
      const ownSelection = selection === undefined ? undefined : snapshot(selection);
      check(registration && ownRequest.planSha256 === planSha256, 'registration-required');
      const boundRegistration = registration;
      const result = await store.evaluate(ownRequest, ownSelection, async (ownedRequest, sink) => {
        assertCurrent();
        // This load is intentionally inside the durable producer; completed traces never reach it.
        const loaded = await readBlocks(data.metadataPaths[ownedRequest.phase], assertCurrent);
        assertCurrent();
        check(loaded.blocksSha256 === data.manifest.partitions[ownedRequest.phase].blocksSha256, 'metadata-hash');
        await sink.retainEvidence('composition-metadata', {
          kind: 'goal-archive-partition-file-v1',
          phase: ownedRequest.phase,
          partitionIdentitySha256: ownedRequest.partitionIdentitySha256,
          fileSha256: loaded.fileSha256,
          blocksSha256: loaded.blocksSha256,
          bytes: loaded.bytes,
          blockCount: loaded.blocks.length,
        });
        assertCurrent();
        const episodeLifetime = new AbortController();
        const abortEpisode = () => episodeLifetime.abort();
        lifetime.signal.addEventListener('abort', abortEpisode, { once: true });
        if (lifetime.signal.aborted) abortEpisode();
        try {
          const context = Object.freeze({ request: ownedRequest, sink, signal: episodeLifetime.signal });
          const lanes = episodeFetch ? await readyEpisodeFetch(episodeFetch, context, timeoutMs) : undefined;
          const marketFetch = lanes
            ? lanes.marketFetch
            : episodeMarketFetch
              ? await readyMarketFetch(episodeMarketFetch, context, timeoutMs)
              : marketUpstream;
          assertCurrent();
          const source = (
            version === 3
              ? createGoalQualificationArchiveSourceV3
              : version === 2
                ? createGoalQualificationArchiveSourceV2
                : createGoalQualificationArchiveSource
          )(
            {
              plan: data.plan,
              manifest: data.manifest,
              registration: boundRegistration,
              request: ownedRequest,
              blocks: loaded.blocks,
            },
            {
              sink,
              fetch: lanes?.fetch ?? upstream,
              marketFetch,
              signal: episodeLifetime.signal,
              timeoutMs,
              ...(targetCompressedBytes ? { targetCompressedBytes } : {}),
              ...(catalog ? { catalog } : {}),
            }
          );
          const evidence = await (
            version === 3
              ? createGoalEpisodeEvaluatorV3
              : version === 2
                ? createGoalEpisodeEvaluatorV2
                : createGoalEpisodeEvaluator
          )({
            plan: data.plan,
            source,
          }).evaluate(ownedRequest, ownSelection);
          assertCurrent();
          return evidence;
        } finally {
          lifetime.signal.removeEventListener('abort', abortEpisode);
          abortEpisode();
        }
      });
      assertCurrent();
      return result;
    },
    dispose() {
      if (!disposal) {
        abort();
        signal?.removeEventListener('abort', abort);
        disposal = store.dispose();
      }
      return disposal;
    },
  } satisfies GoalQualificationArchiveEvaluator);
}
