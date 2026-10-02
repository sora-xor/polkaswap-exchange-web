import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { TypeRegistry } from '@polkadot/types';
import { mkdtemp, readFile, readdir, rm, symlink, truncate, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  openGoalQualificationArchiveEvaluator,
  openGoalQualificationArchiveEvaluatorV2,
  openGoalQualificationArchiveEvaluatorV3,
  openGoalQualificationArchiveContinuationV2,
  type GoalQualificationArchiveEvaluator,
  type GoalQualificationArchiveEvaluatorOptions,
  type GoalEpisodeMarketFetchContext,
  type GoalEpisodeFetch,
} from '../../../../scripts/bots/goal-qualification-archive-evaluator';
import * as studyStore from '../../../../scripts/bots/goal-qualification-study-store';
import type { GoalQualificationArchiveManifest } from '../../../../scripts/bots/goal-qualification-archive-reader';
import {
  goalQualificationDigest as digest,
  GOAL_QUALIFICATION_PROTOCOL_V2,
  GOAL_QUALIFICATION_POLICY_V2,
  GOAL_QUALIFICATION_PROTOCOL_V3,
  GOAL_QUALIFICATION_POLICY_V3,
  goalQualificationPolicy,
  type GoalQualificationEvaluationRequest,
} from '@/features/bot-trading/goal-qualification';
import { syntheticQualificationPlan } from '../../features/bot-trading/goal-qualification-fixtures';
import { createHistoricalExecutionPoolCodec } from '../../../../scripts/bots/historical-execution-pool-codec';
import {
  GOAL_TARGET_MODEL_PROTOCOL,
  GOAL_TARGET_COST_PROTOCOL,
  GOAL_TARGET_MODEL_PROFILES,
  GOAL_TARGET_COMPRESSED_SHA256,
  GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
  GOAL_CATALOG_TARGET_SOURCE_PROFILES,
  goalTargetSourceRuntimeProfiles,
  readGoalTargetExecutionModel,
} from '@/features/bot-trading/goal-target-model';
import {
  createGoalRuntimeCatalog,
  type GoalRuntimeCatalog,
} from '@/features/bot-trading/execution-codecs/runtime-catalog';

// The actual composition, archive source, clock, signal engine, ledger and durable store run below.
// Only their lower read-only market/history transports use invented deterministic responses.
const doubles = vi.hoisted(() => ({
  market: vi.fn(),
  catalogMarket: vi.fn(),
  history: vi.fn(),
  quote: vi.fn(),
  fee: vi.fn(),
}));
vi.mock('../../../../scripts/bots/historical-goal-market-reader', () => ({
  createHistoricalGoalMarketReader: doubles.market,
  createCatalogHistoricalGoalMarketReader: doubles.catalogMarket,
  HistoricalGoalMarketReadError: class extends Error {},
}));
vi.mock('../../../../scripts/bots/goal-qualification-history-reader', () => ({
  readGoalQualificationHistory: doubles.history,
  GoalQualificationHistoryReadError: class extends Error {},
}));
vi.mock('../../../../scripts/bots/historical-execution-reader', () => ({
  readHistoricalExecutionQuote: doubles.quote,
  HistoricalExecutionReadError: class extends Error {},
}));
vi.mock('../../../../scripts/bots/historical-goal-bound-fee-reader', () => ({
  readHistoricalGoalBoundFee: doubles.fee,
  HistoricalGoalBoundFeeReadError: class extends Error {},
}));

const HOUR = 3600000,
  MINUTE = 60000,
  START = 201 * HOUR,
  BASE = 20000;
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const jsonSha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const directories: string[] = [];
const evaluators: GoalQualificationArchiveEvaluator[] = [];
const blockAt = (timestampMs: number) => {
  const height = BASE + (timestampMs - START) / MINUTE;
  return { height, hash: hash(height), parentHash: hash(height - 1), timestampMs };
};
async function setup() {
  const directory = await mkdtemp(join(tmpdir(), 'goal-archive-evaluator-'));
  directories.push(directory);
  const plan = syntheticQualificationPlan();
  plan.training = { ...plan.training, startAtMs: START, endAtMs: START + 116 * HOUR };
  plan.validation = { ...plan.validation, startAtMs: START + 118 * HOUR, endAtMs: START + 167 * HOUR };
  plan.candidates[0].strategy = {
    ...plan.candidates[0].strategy,
    kind: 'threshold',
    threshold: '999',
    direction: 'above',
  };
  delete plan.candidates[0].strategy.signalTiming;
  const blocks = Array.from({ length: 1443 }, (_, i) => blockAt(START + (i - 1) * MINUTE));
  const partition = {
    identitySha256: plan.training.identitySha256,
    blocksSha256: jsonSha(blocks),
    receiptSha256: 'a'.repeat(64),
    source: {
      finalizedSource: { height: 100000, hash: hash(100000), receiptSha256: 'b'.repeat(64) },
      schemaAnchor: { height: BASE - 1, hash: hash(BASE - 1) },
    },
  };
  const manifest: GoalQualificationArchiveManifest = {
    protocol: 'goal-qualification-archive-source-v1',
    sourceId: plan.source.sourceId,
    genesisHash: plan.candidates[0].genesisHash,
    denominator: '1',
    warmupHours: 200,
    captureModel: {
      kind: 'fixed-pinned-capture-delays-v1',
      historyReadMs: 1000,
      indexerPublicationDelayMs: 0,
      markReadMs: 100,
      quoteAndFeeReadMs: 100,
    },
    partitions: { training: partition, validation: { ...partition, identitySha256: plan.validation.identitySha256 } },
    accessAuditSha256: 'c'.repeat(64),
    operationalIngestionSha256: ['d'.repeat(64)],
    maximumHttpRequests: 10000,
    maximumResponseBytes: 268435456,
  };
  plan.source = { ...plan.source, manifestSha256: digest(manifest) };
  const paths = {
    training: join(directory, 'training.json'),
    validation: join(directory, 'validation-not-opened.json'),
  };
  const options = {
    directory: join(directory, 'store'),
    plan,
    manifest,
    metadataPaths: paths,
    sourceSha256: plan.source.evaluatorSha256,
    fetch: vi.fn<typeof fetch>(() => Promise.reject(new Error('No network in synthetic composition'))),
  };
  const request: GoalQualificationEvaluationRequest = {
    planSha256: digest(plan),
    candidate: plan.candidates[0],
    candidateSha256: digest(plan.candidates[0]),
    phase: 'training',
    partitionIdentitySha256: plan.training.identitySha256,
    startAtMs: START,
    endAtMs: START + 24 * HOUR,
    episodeIndex: 0,
  };
  const study = join(options.directory, 'studies', digest(plan));
  const open = async () => {
    const evaluator = await openGoalQualificationArchiveEvaluator(options);
    evaluators.push(evaluator);
    return evaluator;
  };
  const writeMetadata = () => writeFile(paths.training, `${JSON.stringify(blocks)}\n`);
  doubles.market.mockImplementation(async () => {
    const blockEvidence: unknown[] = [{ synthetic: true }],
      storageEvidence: unknown[] = [];
    return {
      context: {
        genesisHash: manifest.genesisHash,
        schema: {
          metadataSha256: plan.runtimeProfiles[0].metadataSha256,
          codeHash: plan.runtimeProfiles[0].codeHash,
          runtimeVersion: { specVersion: 130, transactionVersion: 130 },
        },
      },
      evidence: () => ({
        blockEvidence,
        storageEvidence,
        blockReads: storageEvidence.length,
        markReads: storageEvidence.length,
      }),
      readMark: async (height: number) => {
        const block = blockAt(START + (height - BASE) * MINUTE);
        blockEvidence.push({ height, syntheticHeader: true });
        storageEvidence.push({ height, syntheticStorage: true });
        return {
          block,
          poolEvidence: { status: 'present' },
          mark: {
            timestampMs: block.timestampMs,
            blockHash: block.hash,
            kusdReserveCodec: '100000000000000000000000',
            xorReserveCodec: '100000000000000000000000',
          },
        };
      },
    };
  });
  doubles.history.mockImplementation(async (range) => {
    const timestamps = Array.from({ length: 201 }, (_, i) => range.startAtMs + (i + 1) * HOUR);
    return {
      history: {
        history: {
          candles: timestamps.map((timestamp) => ({ timestamp, close: '1', feeClose: '1' })),
          missing: 0,
          denominationVerified: true,
          identity: { genesisHash: manifest.genesisHash, denominator: '1' },
        },
        boundaries: timestamps.map((timestamp) => ({
          kind: 'indexed-finalized-hour-boundary',
          completedAtMs: timestamp,
          genesisHash: manifest.genesisHash,
          denominator: '1',
          closing: {
            height: blockAt(timestamp - MINUTE).height,
            hash: blockAt(timestamp - MINUTE).hash,
            timestampSeconds: (timestamp - MINUTE) / 1000,
          },
          successor: {
            height: blockAt(timestamp).height,
            hash: blockAt(timestamp).hash,
            timestampSeconds: timestamp / 1000,
          },
          arrivalTimeKnown: false,
        })),
      },
      rpcEvidence: [{ syntheticHistory: true }],
    };
  });
  return { directory, plan, manifest, blocks, options, request, study, paths, open, writeMetadata };
}
beforeEach(() => vi.clearAllMocks());
afterEach(async () => {
  for (const evaluator of evaluators.splice(0)) await evaluator.dispose().catch(() => undefined);
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

describe('filesystem archive evaluator composition', () => {
  it('runs the real store/source/clock/signal/ledger composition and replays with metadata removed', async () => {
    const f = await setup();
    await f.writeMetadata();
    let context: Readonly<GoalEpisodeMarketFetchContext> | undefined;
    const factory = vi.fn(async (owned: Readonly<GoalEpisodeMarketFetchContext>) => {
      context = owned;
      expect(Object.isFrozen(owned)).toBe(true);
      expect(Object.isFrozen(owned.request.candidate)).toBe(true);
      expect(owned.request).toEqual(f.request);
      expect(owned.signal.aborted).toBe(false);
      const access = JSON.parse(await readFile(join(f.study, `access-${digest(f.request)}.json`), 'utf8'));
      expect(access.request).toEqual(f.request);
      expect(await readFile(join(f.study, `raw-${digest(f.request)}`, 'composition-metadata.json'), 'utf8')).toContain(
        f.manifest.partitions.training.blocksSha256
      );
      await owned.sink.retainEvidence('synthetic-cache-binding', { requestSha256: digest(owned.request) });
      return { fetch: f.options.fetch, marketFetch: f.options.fetch };
    });
    const evaluator = await openGoalQualificationArchiveEvaluator({ ...f.options, episodeFetch: factory });
    evaluators.push(evaluator);
    const registration = await evaluator.register(f.plan);
    expect(factory).not.toHaveBeenCalled();
    const market = doubles.market.getMockImplementation()!;
    doubles.market.mockImplementation(async (...args) => {
      const access = JSON.parse(await readFile(join(f.study, `access-${digest(f.request)}.json`), 'utf8'));
      expect(access.registrationSha256).toBe(registration.registrationSha256);
      return market(...args);
    });
    const result = await evaluator.evaluate(f.request);
    expect(result.events.filter((event) => event.kind === 'valuation')).toHaveLength(1440);
    expect(result.events.filter((event) => event.kind === 'minimum-output-fill')).toHaveLength(0);
    expect(result.signals).toHaveLength(24);
    expect(result.terminal.accountingAtMs).toBe(f.request.endAtMs);
    expect(result.dataSha256).toBe(f.plan.source.manifestSha256);
    expect(Object.isFrozen(result.events[0])).toBe(true);
    expect(doubles.history).toHaveBeenCalledTimes(24);
    expect(doubles.quote).not.toHaveBeenCalled();
    expect(doubles.fee).not.toHaveBeenCalled();
    expect(f.options.fetch).not.toHaveBeenCalled();
    const complete = JSON.parse(await readFile(join(f.study, `complete-${digest(f.request)}.json`), 'utf8'));
    expect(complete.rawEvidence.some((row: { name: string }) => row.name === 'composition-metadata')).toBe(true);
    expect(complete.rawEvidence.some((row: { name: string }) => row.name === 'synthetic-cache-binding')).toBe(true);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(context!.signal.aborted).toBe(true);
    const source = JSON.parse(await readFile(join(f.study, `raw-${digest(f.request)}`, 'source.json.json'), 'utf8'));
    expect(source.value.registration).toEqual(registration);
    await evaluator.dispose();
    await rm(f.paths.training);
    const reopened = await openGoalQualificationArchiveEvaluator({ ...f.options, episodeFetch: factory });
    evaluators.push(reopened);
    expect(await reopened.register(f.plan)).toEqual(registration);
    doubles.market.mockClear();
    doubles.history.mockClear();
    expect(await reopened.evaluate(f.request)).toEqual(result);
    expect(doubles.market).not.toHaveBeenCalled();
    expect(doubles.history).not.toHaveBeenCalled();
    expect(f.options.fetch).not.toHaveBeenCalled();
    expect(factory).toHaveBeenCalledTimes(1);
  }, 180000);

  it('does not open either metadata file during construction/registration or an unsealed validation request', async () => {
    const f = await setup(),
      evaluator = await f.open();
    await evaluator.register(f.plan);
    await expect(
      evaluator.evaluate({
        ...f.request,
        phase: 'validation',
        partitionIdentitySha256: f.plan.validation.identitySha256,
        startAtMs: f.plan.validation.startAtMs,
        endAtMs: f.plan.validation.startAtMs + 24 * HOUR,
      })
    ).rejects.toThrow('unsealed-validation');
    expect(doubles.market).not.toHaveBeenCalled();
    expect((await readdir(f.study)).some((file) => file.startsWith('access-'))).toBe(false);
  });

  it.each(['missing', 'symlink', 'oversized', 'malformed', 'wrong-hash', 'wrong-block-shape'] as const)(
    'records a durable failed access for %s metadata, with no retry or alternate phase',
    async (kind) => {
      const f = await setup();
      if (kind === 'symlink') {
        await writeFile(f.paths.validation, JSON.stringify(f.blocks));
        await symlink(f.paths.validation, f.paths.training);
      } else if (kind === 'oversized') {
        await writeFile(f.paths.training, '[]');
        await truncate(f.paths.training, 32 * 1024 * 1024 + 1);
      } else if (kind === 'malformed') await writeFile(f.paths.training, '[{');
      else if (kind === 'wrong-hash') await writeFile(f.paths.training, JSON.stringify(f.blocks.slice(1)));
      else if (kind === 'wrong-block-shape')
        await writeFile(f.paths.training, JSON.stringify(f.blocks.map((b) => ({ ...b, price: 'not-permitted' }))));
      const factory = vi.fn(() => f.options.fetch);
      const evaluator = await openGoalQualificationArchiveEvaluator({ ...f.options, episodeMarketFetch: factory });
      evaluators.push(evaluator);
      await evaluator.register(f.plan);
      await expect(evaluator.evaluate(f.request)).rejects.toThrow('evaluation-failed-no-retry');
      expect(JSON.parse(await readFile(join(f.study, `failed-${digest(f.request)}.json`), 'utf8')).requestSha256).toBe(
        digest(f.request)
      );
      await f.writeMetadata();
      await expect(evaluator.evaluate(f.request)).rejects.toThrow('failed-evaluation-no-retry');
      expect(doubles.market).not.toHaveBeenCalled();
      expect(f.options.fetch).not.toHaveBeenCalled();
      expect(factory).not.toHaveBeenCalled();
    }
  );

  it('copies the fixed plan, manifest and paths synchronously before its first await', async () => {
    const f = await setup(),
      savedPlan = structuredClone(f.plan);
    const opening = openGoalQualificationArchiveEvaluator(f.options);
    f.plan.studyId = 'mutated';
    f.manifest.sourceId = 'mutated';
    f.paths.training = 'relative-mutation';
    const evaluator = await opening;
    evaluators.push(evaluator);
    expect((await evaluator.register(savedPlan)).planSha256).toBe(digest(savedPlan));
    await expect(evaluator.register(f.plan)).rejects.toThrow('different-plan');
  });

  it('rejects accessors without invoking them, source mismatches and relative paths before opening a store', async () => {
    const f = await setup(),
      getter = vi.fn(() => f.plan);
    await expect(
      openGoalQualificationArchiveEvaluator({
        ...f.options,
        get plan() {
          return getter();
        },
      })
    ).rejects.toThrow('option-fields');
    await expect(openGoalQualificationArchiveEvaluator({ ...f.options, sourceSha256: 'f'.repeat(64) })).rejects.toThrow(
      'source-binding'
    );
    await expect(
      openGoalQualificationArchiveEvaluator({ ...f.options, metadataPaths: { ...f.paths, training: 'relative.json' } })
    ).rejects.toThrow('absolute-paths');
    expect(getter).not.toHaveBeenCalled();
    await expect(readFile(join(f.options.directory, 'owner.json'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('aborts owned active reads on disposal, leaves failed provenance and removes only its journal lock', async () => {
    const f = await setup();
    await f.writeMetadata();
    const evaluator = await f.open();
    await evaluator.register(f.plan);
    let entered!: () => void;
    const ready = new Promise<void>((resolve) => {
      entered = resolve;
    });
    doubles.market.mockImplementationOnce(
      async (_input, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(new Error('synthetic aborted')), { once: true });
          entered();
        })
    );
    const evaluation = evaluator.evaluate(f.request);
    const rejected = expect(evaluation).rejects.toThrow('evaluation-failed-no-retry');
    await ready;
    const disposal = evaluator.dispose();
    expect(evaluator.dispose()).toBe(disposal);
    await rejected;
    await disposal;
    await expect(evaluator.register(f.plan)).rejects.toThrow('disposed-or-aborted');
    await expect(readFile(join(f.options.directory, 'owner.json'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect((await readdir(f.study)).some((file) => file.startsWith('failed-'))).toBe(true);
    expect((await readdir(f.study)).some((file) => file.startsWith('complete-'))).toBe(false);
  });

  it('rejects an already aborted signal before acquiring any filesystem ownership', async () => {
    const f = await setup(),
      controller = new AbortController();
    controller.abort();
    await expect(openGoalQualificationArchiveEvaluator({ ...f.options, signal: controller.signal })).rejects.toThrow(
      'disposed-or-aborted'
    );
    await expect(readFile(join(f.options.directory, 'owner.json'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it.each(['static', 'episode'] as const)(
    'forwards the snapshotted %s market-only lane through the real source after durable access',
    async (lane) => {
      const f = await setup();
      await f.writeMetadata();
      const market = vi.fn<typeof fetch>(async () => new Response('synthetic lane'));
      const changed = vi.fn<typeof fetch>(async () => {
        throw Error('changed lane');
      });
      const options: GoalQualificationArchiveEvaluatorOptions = {
        ...f.options,
        ...(lane === 'static' ? { marketFetch: market } : { episodeMarketFetch: () => market }),
      };
      const opening = openGoalQualificationArchiveEvaluator(options);
      if (lane === 'static') options.marketFetch = changed;
      else options.episodeMarketFetch = () => changed;
      const evaluator = await opening;
      evaluators.push(evaluator);
      await evaluator.register(f.plan);
      doubles.market.mockImplementationOnce(async (_input, readOptions) => {
        const response = await readOptions.fetch('https://mof2.sora.org/', {
          method: 'POST',
          signal: readOptions.signal,
        });
        expect(await new Response(response.body).text()).toBe('synthetic lane');
        throw Error('End synthetic lane probe');
      });
      await expect(evaluator.evaluate(f.request)).rejects.toThrow('evaluation-failed-no-retry');
      expect(market).toHaveBeenCalledTimes(1);
      expect(changed).not.toHaveBeenCalled();
      expect(f.options.fetch).not.toHaveBeenCalled();
      expect((await readdir(f.study)).some((file) => file.startsWith('access-'))).toBe(true);
    }
  );

  it('rejects executable or invalid market-lane options before acquiring the store', async () => {
    const f = await setup(),
      getter = vi.fn();
    await expect(
      openGoalQualificationArchiveEvaluator({
        ...f.options,
        get marketFetch() {
          return getter();
        },
      })
    ).rejects.toThrow('option-fields');
    await expect(openGoalQualificationArchiveEvaluator({ ...f.options, marketFetch: null as never })).rejects.toThrow(
      'market-fetch'
    );
    await expect(
      openGoalQualificationArchiveEvaluator({ ...f.options, episodeMarketFetch: null as never })
    ).rejects.toThrow('episode-market-fetch');
    await expect(
      openGoalQualificationArchiveEvaluator({
        ...f.options,
        marketFetch: f.options.fetch,
        episodeMarketFetch: () => f.options.fetch,
      })
    ).rejects.toThrow('mutually-exclusive-market-fetch');
    await expect(
      openGoalQualificationArchiveEvaluator({
        ...f.options,
        get episodeMarketFetch() {
          return getter();
        },
      })
    ).rejects.toThrow('option-fields');
    expect(getter).not.toHaveBeenCalled();
    await expect(readFile(join(f.options.directory, 'owner.json'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it.each(['reject', 'invalid-result'] as const)('retains failed access when factory readiness is %s', async (kind) => {
    const f = await setup();
    await f.writeMetadata();
    const evaluator = await openGoalQualificationArchiveEvaluator({
      ...f.options,
      episodeMarketFetch: async () => {
        if (kind === 'reject') throw Error('synthetic preparation failure');
        return null as never;
      },
    });
    evaluators.push(evaluator);
    await evaluator.register(f.plan);
    await expect(evaluator.evaluate(f.request)).rejects.toThrow('evaluation-failed-no-retry');
    await expect(evaluator.evaluate(f.request)).rejects.toThrow('failed-evaluation-no-retry');
    expect(doubles.market).not.toHaveBeenCalled();
    expect(f.options.fetch).not.toHaveBeenCalled();
  });

  it.each(['timeout', 'dispose'] as const)(
    'fences a late factory after %s without opening market reads',
    async (kind) => {
      const f = await setup();
      await f.writeMetadata();
      let context!: Readonly<GoalEpisodeMarketFetchContext>;
      let entered!: () => void;
      let release!: (transport: typeof fetch) => void;
      const ready = new Promise<void>((resolve) => (entered = resolve));
      const evaluator = await openGoalQualificationArchiveEvaluator({
        ...f.options,
        timeoutMs: 1000,
        episodeMarketFetch: (owned) => {
          context = owned;
          entered();
          return new Promise((resolve) => (release = resolve));
        },
      });
      evaluators.push(evaluator);
      await evaluator.register(f.plan);
      const rejected = expect(evaluator.evaluate(f.request)).rejects.toThrow('evaluation-failed-no-retry');
      await ready;
      if (kind === 'dispose') await evaluator.dispose();
      await rejected;
      expect(context.signal.aborted).toBe(true);
      release(f.options.fetch);
      await Promise.resolve();
      await Promise.resolve();
      await expect(context.sink.retainEvidence('late-cache-binding', { late: true })).rejects.toThrow(
        'evidence-sink-closed'
      );
      expect(doubles.market).not.toHaveBeenCalled();
      expect(f.options.fetch).not.toHaveBeenCalled();
      expect((await readdir(f.study)).some((file) => file.startsWith('failed-'))).toBe(true);
      expect((await readdir(f.study)).some((file) => file.startsWith('complete-'))).toBe(false);
    }
  );
});

describe('explicit v2 archive composition', () => {
  // The 1,440-valuation episode durably syncs each retained record; allow for loaded disks.
  it('preserves the complete final valuation and cancelled clock through durable replay', async () => {
    const f = await setup();
    f.plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V2;
    f.plan.policy = GOAL_QUALIFICATION_POLICY_V2;
    if (f.plan.arrivalModel.kind !== 'modeled-finalized-callbacks') throw Error('fixture');
    f.plan.arrivalModel.checkDurationMs = 60000;
    f.options.manifest.protocol = 'goal-qualification-archive-source-v2';
    f.plan.source.manifestSha256 = digest(f.options.manifest);
    f.request.planSha256 = digest(f.plan);
    await expect(openGoalQualificationArchiveEvaluator(f.options)).rejects.toThrow('plan-version');
    await f.writeMetadata();
    const evaluator = await openGoalQualificationArchiveEvaluatorV2(f.options);
    evaluators.push(evaluator);
    expect(evaluator.protocol).toBe('finalized-xyk-execution-validation-v2');
    await evaluator.register(f.plan);
    const result = await evaluator.evaluate(f.request);
    expect(result.protocol).toBe('finalized-xyk-execution-validation-v2');
    expect(result.clock.events.at(-2)).toEqual({ kind: 'deadline-cancel', checkId: 1440, atMs: f.request.endAtMs });
    expect(result.events.filter((e) => e.kind === 'valuation')).toHaveLength(1440);
    expect(result.signals).toHaveLength(24);
    expect(result.signals[0].checkId).toBe(2);
    expect(result.deadlineCancellation).toBeNull();
    await rm(f.options.metadataPaths.training);
    expect(await evaluator.evaluate(f.request)).toEqual(result);
  }, 300000);
});

describe('owned dual-lane episode acquisition', () => {
  it('snapshots the factory and both returned functions, forwarding history and canonical market separately', async () => {
    const f = await setup();
    await f.writeMetadata();
    const ordinary = vi.fn<typeof fetch>(async () => new Response('ordinary'));
    const market = vi.fn<typeof fetch>(async () => new Response('market'));
    const changed = vi.fn<typeof fetch>();
    const lanes = { fetch: ordinary, marketFetch: market };
    const options: GoalQualificationArchiveEvaluatorOptions = { ...f.options, episodeFetch: () => lanes };
    const opening = openGoalQualificationArchiveEvaluator(options);
    options.episodeFetch = () => ({ fetch: changed, marketFetch: changed });
    const evaluator = await opening;
    evaluators.push(evaluator);
    await evaluator.register(f.plan);
    const originalMarket = doubles.market.getMockImplementation()!;
    doubles.market.mockImplementationOnce(async (input, readOptions) => {
      lanes.fetch = changed;
      lanes.marketFetch = changed;
      const response = await readOptions.fetch('https://mof2.sora.org/', {
        method: 'POST',
        signal: readOptions.signal,
      });
      expect(await new Response(response.body).text()).toBe('market');
      return originalMarket(input, readOptions);
    });
    doubles.history.mockImplementationOnce(async (_range, readOptions) => {
      const response = await readOptions.fetch('https://pi.soramitsu.io/graphql', {
        method: 'POST',
        signal: readOptions.signal,
      });
      expect(await new Response(response.body).text()).toBe('ordinary');
      throw Error('End synthetic two-lane probe');
    });
    await expect(evaluator.evaluate(f.request)).rejects.toThrow('evaluation-failed-no-retry');
    expect(ordinary).toHaveBeenCalledTimes(1);
    expect(market).toHaveBeenCalledTimes(1);
    expect(changed).not.toHaveBeenCalled();
    expect(f.options.fetch).not.toHaveBeenCalled();
  });

  it('keeps factory code unopened before metadata verification and a sealed validation access', async () => {
    const f = await setup();
    const factory = vi.fn(() => ({ fetch: f.options.fetch, marketFetch: f.options.fetch }));
    const evaluator = await openGoalQualificationArchiveEvaluator({ ...f.options, episodeFetch: factory });
    evaluators.push(evaluator);
    await evaluator.register(f.plan);
    await expect(
      evaluator.evaluate({
        ...f.request,
        phase: 'validation',
        partitionIdentitySha256: f.plan.validation.identitySha256,
        startAtMs: f.plan.validation.startAtMs,
        endAtMs: f.plan.validation.startAtMs + 24 * HOUR,
      })
    ).rejects.toThrow('unsealed-validation');
    expect((await readdir(f.study)).some((file) => file.startsWith('access-'))).toBe(false);
    await writeFile(f.paths.training, JSON.stringify(f.blocks.slice(1)));
    await expect(evaluator.evaluate(f.request)).rejects.toThrow('evaluation-failed-no-retry');
    expect(factory).not.toHaveBeenCalled();
    expect(doubles.market).not.toHaveBeenCalled();
  });

  it('rejects unsafe dual-lane options and competing factories before filesystem ownership', async () => {
    const f = await setup(),
      getter = vi.fn();
    const factory = () => ({ fetch: f.options.fetch, marketFetch: f.options.fetch });
    await expect(
      openGoalQualificationArchiveEvaluator({
        ...f.options,
        get episodeFetch() {
          return getter();
        },
      })
    ).rejects.toThrow('option-fields');
    await expect(openGoalQualificationArchiveEvaluator({ ...f.options, episodeFetch: null as never })).rejects.toThrow(
      'episode-fetch'
    );
    await expect(
      openGoalQualificationArchiveEvaluator({ ...f.options, episodeFetch: factory, marketFetch: f.options.fetch })
    ).rejects.toThrow('mutually-exclusive-episode-fetch');
    await expect(
      openGoalQualificationArchiveEvaluator({
        ...f.options,
        episodeFetch: factory,
        episodeMarketFetch: () => f.options.fetch,
      })
    ).rejects.toThrow('mutually-exclusive-episode-fetch');
    expect(getter).not.toHaveBeenCalled();
    await expect(readFile(join(f.options.directory, 'owner.json'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it.each(['throw', 'reject', 'null', 'missing', 'extra', 'getter', 'then-getter', 'inherited'] as const)(
    'retains a failed episode without source reads for a %s factory result',
    async (kind) => {
      const f = await setup();
      await f.writeMetadata();
      const getter = vi.fn();
      const evaluator = await openGoalQualificationArchiveEvaluator({
        ...f.options,
        episodeFetch: () => {
          if (kind === 'throw') throw Error('synthetic failure');
          if (kind === 'reject') return Promise.reject(Error('synthetic failure'));
          if (kind === 'null') return null as never;
          if (kind === 'missing') return { fetch: f.options.fetch } as never;
          if (kind === 'extra') return { fetch: f.options.fetch, marketFetch: f.options.fetch, extra: true } as never;
          if (kind === 'getter')
            return {
              fetch: f.options.fetch,
              get marketFetch() {
                return getter();
              },
            };
          if (kind === 'then-getter')
            return {
              fetch: f.options.fetch,
              marketFetch: f.options.fetch,
              get then() {
                return getter();
              },
            } as never;
          return Object.create({ fetch: f.options.fetch, marketFetch: f.options.fetch });
        },
      });
      evaluators.push(evaluator);
      await evaluator.register(f.plan);
      await expect(evaluator.evaluate(f.request)).rejects.toThrow('evaluation-failed-no-retry');
      await expect(evaluator.evaluate(f.request)).rejects.toThrow('failed-evaluation-no-retry');
      expect(getter).not.toHaveBeenCalled();
      expect(doubles.market).not.toHaveBeenCalled();
      expect(f.options.fetch).not.toHaveBeenCalled();
      expect((await readdir(f.study)).some((file) => file.startsWith('failed-'))).toBe(true);
    }
  );

  it.each(['timeout', 'dispose', 'external-abort'] as const)(
    'fences a late dual-lane result after %s and closes its evidence sink',
    async (kind) => {
      const f = await setup();
      await f.writeMetadata();
      const controller = new AbortController();
      let context!: Readonly<GoalEpisodeMarketFetchContext>;
      let entered!: () => void;
      let release!: (lanes: GoalEpisodeFetch) => void;
      const ready = new Promise<void>((resolve) => (entered = resolve));
      const evaluator = await openGoalQualificationArchiveEvaluator({
        ...f.options,
        signal: controller.signal,
        timeoutMs: 1000,
        episodeFetch: (owned) => {
          context = owned;
          entered();
          return new Promise((resolve) => (release = resolve));
        },
      });
      evaluators.push(evaluator);
      await evaluator.register(f.plan);
      const rejected = expect(evaluator.evaluate(f.request)).rejects.toThrow('evaluation-failed-no-retry');
      await ready;
      if (kind === 'dispose') await evaluator.dispose();
      else if (kind === 'external-abort') controller.abort();
      await rejected;
      expect(context.signal.aborted).toBe(true);
      release({ fetch: f.options.fetch, marketFetch: f.options.fetch });
      await Promise.resolve();
      await Promise.resolve();
      await expect(context.sink.retainEvidence('late-replay', { late: true })).rejects.toThrow('evidence-sink-closed');
      expect(doubles.market).not.toHaveBeenCalled();
      expect(f.options.fetch).not.toHaveBeenCalled();
      expect((await readdir(f.study)).some((file) => file.startsWith('complete-'))).toBe(false);
    }
  );
});

describe('explicit acquisition continuation constructor', () => {
  async function v2Fixture() {
    const f = await setup();
    f.plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V2;
    f.plan.policy = GOAL_QUALIFICATION_POLICY_V2;
    f.manifest.protocol = 'goal-qualification-archive-source-v2';
    f.plan.source.manifestSha256 = digest(f.manifest);
    return f;
  }
  it('keeps ordinary v1/v2 constructors separate and passes the exact dependency only to the continuation store', async () => {
    const f = await setup();
    const v1 = vi.spyOn(studyStore, 'openGoalQualificationStudyStore').mockRejectedValue(Error('v1 dispatched'));
    const v2 = vi.spyOn(studyStore, 'openGoalQualificationStudyStoreV2').mockRejectedValue(Error('v2 dispatched'));
    const continued = vi
      .spyOn(studyStore, 'openGoalQualificationStudyContinuationV2')
      .mockRejectedValue(Error('continuation dispatched'));
    await expect(openGoalQualificationArchiveEvaluator(f.options)).rejects.toThrow('v1 dispatched');
    const second = await v2Fixture();
    await expect(openGoalQualificationArchiveEvaluatorV2(second.options)).rejects.toThrow('v2 dispatched');
    const dependency = { preparation: {} as never, completedReplay: vi.fn() };
    await expect(
      openGoalQualificationArchiveContinuationV2(
        { ...second.options, episodeFetch: () => ({ fetch: second.options.fetch, marketFetch: second.options.fetch }) },
        dependency
      )
    ).rejects.toThrow('continuation dispatched');
    expect(v1).toHaveBeenCalledTimes(1);
    expect(v2).toHaveBeenCalledTimes(1);
    expect(continued).toHaveBeenCalledExactlyOnceWith(
      { directory: second.options.directory, sourceSha256: second.options.sourceSha256 },
      dependency
    );
    expect(dependency.completedReplay).not.toHaveBeenCalled();
    expect(doubles.market).not.toHaveBeenCalled();
  });

  it('requires dual replay and an owned continuation proof without falling back or accessing files', async () => {
    const f = await v2Fixture();
    const dependency = { preparation: {} as never, completedReplay: vi.fn() };
    const factory = vi.fn(() => ({ fetch: f.options.fetch, marketFetch: f.options.fetch }));
    await expect(openGoalQualificationArchiveContinuationV2(f.options, dependency)).rejects.toThrow(
      'continuation-episode-fetch-required'
    );
    await expect(
      openGoalQualificationArchiveContinuationV2({ ...f.options, episodeFetch: factory }, dependency)
    ).rejects.toThrow('unowned-preparation');
    await expect(
      openGoalQualificationArchiveContinuationV2({ ...f.options, episodeFetch: factory }, undefined as never)
    ).rejects.toThrow('continuation-dependency');
    const controller = new AbortController();
    controller.abort();
    await expect(
      openGoalQualificationArchiveContinuationV2(
        { ...f.options, episodeFetch: factory, signal: controller.signal },
        dependency
      )
    ).rejects.toThrow('disposed-or-aborted');
    expect(factory).not.toHaveBeenCalled();
    expect(dependency.completedReplay).not.toHaveBeenCalled();
    expect(f.options.fetch).not.toHaveBeenCalled();
    await expect(readFile(join(f.options.directory, 'owner.json'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

/** Real public metadata/binary identities with invented flat prices and pool accounts; no market observations. */
async function targetFixture() {
  const f = await setup();
  const metadataExport = JSON.parse(
    readFileSync(
      new URL(
        '../../../../output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/metadata-130.json',
        import.meta.url
      ),
      'utf8'
    )
  ).actualExport.resultHex;
  const metadataHex = new TypeRegistry().createType('Bytes', Buffer.from(metadataExport.slice(2), 'hex')).toHex();
  const compressed = new Uint8Array(
    readFileSync(
      '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm'
    )
  );
  const sourceHash = (name: string) =>
    createHash('sha256')
      .update(readFileSync(new URL(`../../../../scripts/bots/${name}`, import.meta.url)))
      .digest('hex');
  f.plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V3;
  f.plan.policy = GOAL_QUALIFICATION_POLICY_V3;
  f.plan.executionModel = readGoalTargetExecutionModel({
    protocol: GOAL_TARGET_MODEL_PROTOCOL,
    sourceRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.source,
    targetRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.target,
    targetCompressedSha256: GOAL_TARGET_COMPRESSED_SHA256,
    implementation: {
      hostSha256: sourceHash('goal-target-runtime-host.cjs'),
      stateCodecSha256: sourceHash('goal-target-runtime-state.ts'),
      quoteCodecSha256: sourceHash('goal-target-runtime-quote.ts'),
    },
    stateModel: 'source130-exact-storage-complete-xst-v1',
    fillModel: 'minimum-output-hypothetical-no-market-feedback',
    costPolicy: { protocol: GOAL_TARGET_COST_PROTOCOL, maximumLiveFeeCodec: '2000000000000000' },
  });
  f.plan.runtimeProfiles = [...goalTargetSourceRuntimeProfiles(f.plan.executionModel)];
  if (f.plan.arrivalModel.kind !== 'modeled-finalized-callbacks') throw Error('fixture');
  f.plan.arrivalModel.checkDurationMs = MINUTE;
  f.manifest.protocol = 'goal-qualification-archive-source-v3';
  f.plan.source.manifestSha256 = digest(f.manifest);
  f.request.planSha256 = digest(f.plan);
  const source = f.manifest.partitions.training.source;
  if ('kind' in source) throw Error('legacy fixture source');
  const propertiesKey = createHistoricalExecutionPoolCodec({
    genesisHash: f.manifest.genesisHash,
    blockHash: source.schemaAnchor.hash,
    metadataHex,
    runtimeVersion: { specVersion: 130, transactionVersion: 130 },
  }).storageKeys().properties;
  const reservesAccountId = `0x${'11'.repeat(32)}`,
    feesAccountId = `0x${'22'.repeat(32)}`;
  const properties = `${reservesAccountId}${feesAccountId.slice(2)}`;
  const oldMarket = doubles.market.getMockImplementation()!;
  doubles.market.mockImplementation(async (...args) => {
    const reader = await oldMarket(...args);
    reader.context.schemaAnchor = source.schemaAnchor;
    const raw = reader.evidence();
    raw.blockEvidence.splice(0, 1, {
      method: 'state_getMetadata',
      params: [source.schemaAnchor.hash],
      responseBody: JSON.stringify({ result: metadataHex }),
    });
    const read = reader.readMark;
    reader.readMark = async (height: number) => {
      const result = await read(height);
      raw.storageEvidence[raw.storageEvidence.length - 1] = {
        blockHash: result.block.hash,
        responseBody: JSON.stringify({
          result: [{ block: result.block.hash, changes: [[propertiesKey, properties]] }],
        }),
      };
      result.poolEvidence.accounts = { reservesAccountId, feesAccountId };
      return result;
    };
    return reader;
  });
  const options: GoalQualificationArchiveEvaluatorOptions = { ...f.options, targetCompressedBytes: compressed };
  return { ...f, options, compressed, study: join(options.directory, 'studies', digest(f.plan)) };
}

let catalogPromise: Promise<GoalRuntimeCatalog> | undefined;
/** Metadata ownership only: this fixture never collects a block or opens a market/history source. */
function ownedCatalog() {
  return (catalogPromise ??= (async () => {
    const sourceMetadata = async (version: number): Promise<string> =>
      JSON.parse(
        await readFile(
          new URL(
            `../../../../output/go-history/partial-target-window-metadata-20260921/source-schemas/source${version}-unverified-schema.json`,
            import.meta.url
          ),
          'utf8'
        )
      ).metadataHex;
    const target = JSON.parse(
      await readFile(
        new URL(
          '../../../../output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/metadata-131.json',
          import.meta.url
        ),
        'utf8'
      )
    ).actualExport.resultHex;
    return createGoalRuntimeCatalog({
      source128MetadataHex: await sourceMetadata(128),
      source129MetadataHex: await sourceMetadata(129),
      source130MetadataHex: await sourceMetadata(130),
      target131MetadataHex: new TypeRegistry().createType('Bytes', Buffer.from(target.slice(2), 'hex')).toHex(),
    });
  })());
}

/** The existing V3 fixture with an explicit catalog model and both matching source kinds. */
async function catalogFixture() {
  const f = await targetFixture(),
    catalog = await ownedCatalog(),
    legacy = f.plan.executionModel!;
  f.plan.executionModel = readGoalTargetExecutionModel({
    protocol: GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
    sourceRuntimeProfiles: GOAL_CATALOG_TARGET_SOURCE_PROFILES,
    targetRuntimeProfile: legacy.targetRuntimeProfile,
    targetCompressedSha256: legacy.targetCompressedSha256,
    implementation: {
      ...legacy.implementation,
      catalogCodecSha256: createHash('sha256')
        .update(
          await readFile(
            new URL('../../../../src/features/bot-trading/execution-codecs/runtime-catalog.ts', import.meta.url)
          )
        )
        .digest('hex'),
    },
    catalogSha256: catalog.catalogSha256,
    stateModel: 'catalog-source-exact-storage-complete-xst-v1',
    fillModel: legacy.fillModel,
    costPolicy: legacy.costPolicy,
  });
  f.plan.runtimeProfiles = [...goalTargetSourceRuntimeProfiles(f.plan.executionModel)];
  f.plan.policy = goalQualificationPolicy(GOAL_QUALIFICATION_PROTOCOL_V3, f.plan.executionModel);
  for (const partition of Object.values(f.manifest.partitions))
    partition.source = {
      kind: 'catalog-source-v1',
      finalizedSource: partition.source.finalizedSource,
      schemaAnchors: ([128, 129, 130] as const).map((specVersion, index) => ({
        specVersion,
        height: BASE - 3 + index,
        hash: hash(BASE - 3 + index),
      })),
    };
  f.plan.source.manifestSha256 = digest(f.manifest);
  f.request.planSha256 = digest(f.plan);
  f.options.catalog = catalog;
  return { ...f, catalog };
}

describe('catalog admission before one-shot archive registration', () => {
  it.each(['missing', 'cloned'] as const)('rejects a %s catalog before opening the store', async (kind) => {
    const f = await catalogFixture(),
      store = vi.spyOn(studyStore, 'openGoalQualificationStudyStoreV3');
    if (kind === 'missing') delete f.options.catalog;
    else f.options.catalog = { ...f.catalog };
    await expect(openGoalQualificationArchiveEvaluatorV3(f.options)).rejects.toThrow();
    expect(store).not.toHaveBeenCalled();
    await expect(readdir(f.options.directory)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(f.options.fetch).not.toHaveBeenCalled();
    expect(doubles.catalogMarket).not.toHaveBeenCalled();
    expect(doubles.history).not.toHaveBeenCalled();
  });

  it('rejects an owned catalog supplied to the old source130 model before opening the store', async () => {
    const f = await targetFixture(),
      store = vi.spyOn(studyStore, 'openGoalQualificationStudyStoreV3');
    f.options.catalog = await ownedCatalog();
    await expect(openGoalQualificationArchiveEvaluatorV3(f.options)).rejects.toThrow('catalog-model');
    expect(store).not.toHaveBeenCalled();
    await expect(readdir(f.options.directory)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(f.options.fetch).not.toHaveBeenCalled();
    expect(doubles.market).not.toHaveBeenCalled();
  });

  it.each(['training', 'validation'] as const)(
    'rejects a mismatched %s source before opening the store, even with a genuine catalog',
    async (phase) => {
      const f = await catalogFixture(),
        store = vi.spyOn(studyStore, 'openGoalQualificationStudyStoreV3');
      f.manifest.partitions[phase].source = {
        finalizedSource: f.manifest.partitions[phase].source.finalizedSource,
        schemaAnchor: { height: BASE - 1, hash: hash(BASE - 1) },
      };
      // Keep the untrusted manifest self-consistent; the model/source mismatch itself must reject.
      f.plan.source.manifestSha256 = digest(f.manifest);
      await expect(openGoalQualificationArchiveEvaluatorV3(f.options)).rejects.toThrow('metadata-source-model');
      expect(store).not.toHaveBeenCalled();
      await expect(readdir(f.options.directory)).rejects.toMatchObject({ code: 'ENOENT' });
      expect(f.options.fetch).not.toHaveBeenCalled();
      expect(doubles.catalogMarket).not.toHaveBeenCalled();
      expect(doubles.history).not.toHaveBeenCalled();
    }
  );

  it('opens and disposes a legitimate catalog composition without registration or economic reads', async () => {
    const f = await catalogFixture(),
      store = vi.spyOn(studyStore, 'openGoalQualificationStudyStoreV3');
    const evaluator = await openGoalQualificationArchiveEvaluatorV3(f.options);
    evaluators.push(evaluator);
    expect(store).toHaveBeenCalledTimes(1);
    expect(evaluator.protocol).toBe('finalized-xyk-execution-validation-v3');
    expect(await readdir(join(f.options.directory, 'studies'))).toEqual([]);
    await evaluator.dispose();
    expect(f.options.fetch).not.toHaveBeenCalled();
    for (const double of Object.values(doubles)) expect(double).not.toHaveBeenCalled();
    await expect(readFile(f.paths.training)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(f.paths.validation)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe('V3 archive publication capacity forwarding', () => {
  it.each([0, -1, 1.5, NaN, Infinity, 512 * 1024 * 1024 + 1, Number.MAX_SAFE_INTEGER])(
    'rejects invalid capacity %s before opening the store',
    async (limit) => {
      const f = await targetFixture(),
        store = vi.spyOn(studyStore, 'openGoalQualificationStudyStoreV3');
      await expect(
        openGoalQualificationArchiveEvaluatorV3({ ...f.options, maximumRawEvidenceBytesPerEpisode: limit })
      ).rejects.toThrow();
      expect(store).not.toHaveBeenCalled();
      await expect(readdir(f.options.directory)).rejects.toMatchObject({ code: 'ENOENT' });
      expect(f.options.fetch).not.toHaveBeenCalled();
    }
  );

  it.each([1, 2] as const)('keeps the V3 option out of the v%s constructor', async (version) => {
    const f = await setup(),
      open = version === 1 ? openGoalQualificationArchiveEvaluator : openGoalQualificationArchiveEvaluatorV2;
    await expect(open({ ...f.options, maximumRawEvidenceBytesPerEpisode: 1024 })).rejects.toThrow('option-fields');
    await expect(readdir(f.options.directory)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(f.options.fetch).not.toHaveBeenCalled();
  });

  it('snapshots and enforces the ceiling on composition evidence before any factory or market read', async () => {
    const f = await targetFixture(),
      store = vi.spyOn(studyStore, 'openGoalQualificationStudyStoreV3'),
      factory = vi.fn(async () => f.options.fetch!),
      options = { ...f.options, maximumRawEvidenceBytesPerEpisode: 1, episodeMarketFetch: factory };
    const pending = openGoalQualificationArchiveEvaluatorV3(options);
    options.maximumRawEvidenceBytesPerEpisode = 512 * 1024 * 1024;
    const evaluator = await pending;
    evaluators.push(evaluator);
    expect(store).toHaveBeenCalledWith(expect.objectContaining({ maximumRawEvidenceBytesPerEpisode: 1 }));
    await evaluator.register(f.plan);
    await f.writeMetadata();
    await expect(evaluator.evaluate(f.request)).rejects.toThrow('evaluation-failed-no-retry');
    expect(factory).not.toHaveBeenCalled();
    expect(doubles.market).not.toHaveBeenCalled();
    expect(f.options.fetch).not.toHaveBeenCalled();
    expect(await readdir(join(f.study, `raw-${digest(f.request)}`))).toEqual([]);
    expect(await readdir(f.study)).toContain(`failed-${digest(f.request)}.json`);
    expect(await readdir(f.study)).not.toContain(`complete-${digest(f.request)}.json`);
  });

  it('uses the same retained-byte ceiling for cache factory evidence', async () => {
    const f = await targetFixture(),
      factory = vi.fn(async ({ sink }: GoalEpisodeMarketFetchContext) => {
        await sink.retainEvidence('synthetic-cache', { text: 'x'.repeat(8192) });
        return f.options.fetch!;
      });
    const evaluator = await openGoalQualificationArchiveEvaluatorV3({
      ...f.options,
      maximumRawEvidenceBytesPerEpisode: 4096,
      episodeMarketFetch: factory,
    });
    evaluators.push(evaluator);
    await evaluator.register(f.plan);
    await f.writeMetadata();
    await expect(evaluator.evaluate(f.request)).rejects.toThrow('evaluation-failed-no-retry');
    expect(factory).toHaveBeenCalledTimes(1);
    expect(doubles.market).not.toHaveBeenCalled();
    expect(f.options.fetch).not.toHaveBeenCalled();
    expect(await readdir(join(f.study, `raw-${digest(f.request)}`))).toEqual(['composition-metadata.json']);
    expect(await readdir(f.study)).toContain(`failed-${digest(f.request)}.json`);
  });
});

describe('explicit v3 archive evaluator composition', () => {
  it('copies the binary before the first await and runs a full invented hold episode through actual v3 store/source/clock', async () => {
    const f = await targetFixture();
    await f.writeMetadata();
    const replayBinary = new Uint8Array(f.compressed);
    const v3Store = vi.spyOn(studyStore, 'openGoalQualificationStudyStoreV3');
    const v2Store = vi.spyOn(studyStore, 'openGoalQualificationStudyStoreV2');
    const v1Store = vi.spyOn(studyStore, 'openGoalQualificationStudyStore');
    const iterator = vi.fn(() => {
      throw Error('caller iterator must not execute');
    });
    const slice = vi.fn(() => {
      throw Error('caller slice must not execute');
    });
    Object.defineProperties(f.compressed, { [Symbol.iterator]: { value: iterator }, slice: { value: slice } });
    const opening = openGoalQualificationArchiveEvaluatorV3(f.options);
    // Source construction rechecks the binary pin after async store and metadata I/O.
    f.compressed.fill(0);
    const evaluator = await opening;
    evaluators.push(evaluator);
    expect(v3Store).toHaveBeenCalledTimes(1);
    expect(v2Store).not.toHaveBeenCalled();
    expect(v1Store).not.toHaveBeenCalled();
    expect(iterator).not.toHaveBeenCalled();
    expect(slice).not.toHaveBeenCalled();
    expect(evaluator.protocol).toBe('finalized-xyk-execution-validation-v3');
    const registration = await evaluator.register(f.plan);
    expect(doubles.market).not.toHaveBeenCalled();
    const readMarket = doubles.market.getMockImplementation()!;
    doubles.market.mockImplementation(async (...args) => {
      const access = JSON.parse(await readFile(join(f.study, `access-${digest(f.request)}.json`), 'utf8'));
      expect(access.registrationSha256).toBe(registration.registrationSha256);
      return readMarket(...args);
    });
    const result = await evaluator.evaluate(f.request);
    expect(result.protocol).toBe('finalized-xyk-execution-validation-v3');
    expect(result.events.filter((event) => event.kind === 'valuation')).toHaveLength(1440);
    expect(result.events.filter((event) => event.kind === 'minimum-output-fill')).toHaveLength(0);
    expect(result.signals).toHaveLength(24);
    expect(result.clock.events.at(-2)).toEqual({ kind: 'deadline-cancel', checkId: 1440, atMs: f.request.endAtMs });
    expect(result.deadlineCancellation).toBeNull();
    expect(result.terminal.accountingAtMs).toBe(f.request.endAtMs);
    const rawDirectory = join(f.study, `raw-${digest(f.request)}`);
    const openingEvidence = JSON.parse(await readFile(join(rawDirectory, 'opening.json.json'), 'utf8'));
    expect(openingEvidence.value.runtimeProfile).toEqual(GOAL_TARGET_MODEL_PROFILES.source);
    expect(result.opening.evidenceSha256).toBe(digest(openingEvidence.value));
    expect(doubles.history).toHaveBeenCalledTimes(24);
    expect(doubles.quote).not.toHaveBeenCalled();
    expect(doubles.fee).not.toHaveBeenCalled();
    expect(f.options.fetch).not.toHaveBeenCalled();
    const complete = JSON.parse(await readFile(join(f.study, `complete-${digest(f.request)}.json`), 'utf8'));
    expect(complete.evidence).toEqual(result);
    expect(complete.rawEvidence.some((row: { name: string }) => row.name === 'composition-metadata')).toBe(true);
    const originalRecord = await readFile(join(f.study, 'registration.json'), 'utf8');
    await evaluator.dispose();
    await rm(f.paths.training);
    doubles.market.mockClear();
    doubles.history.mockClear();
    const replay = await openGoalQualificationArchiveEvaluatorV3({ ...f.options, targetCompressedBytes: replayBinary });
    evaluators.push(replay);
    expect(await replay.register(f.plan)).toEqual(registration);
    expect(await replay.evaluate(f.request)).toEqual(result);
    expect(doubles.market).not.toHaveBeenCalled();
    expect(doubles.history).not.toHaveBeenCalled();
    expect(f.options.fetch).not.toHaveBeenCalled();
    expect(await readFile(join(f.study, 'registration.json'), 'utf8')).toBe(originalRecord);
  }, 180000);

  it.each([1, 2] as const)(
    'the v%s constructor rejects a v3 plan and target-only option before store access',
    async (version) => {
      const f = await targetFixture();
      const open = version === 1 ? openGoalQualificationArchiveEvaluator : openGoalQualificationArchiveEvaluatorV2;
      await expect(open(f.options)).rejects.toThrow('option-fields');
      const oldOptions = { ...f.options };
      delete oldOptions.targetCompressedBytes;
      await expect(open(oldOptions)).rejects.toThrow('plan-version');
      await expect(readdir(f.options.directory)).rejects.toMatchObject({ code: 'ENOENT' });
      expect(doubles.market).not.toHaveBeenCalled();
      expect(f.options.fetch).not.toHaveBeenCalled();
    }
  );

  it.each(['missing-binary', 'changed-binary', 'shared-binary', 'source', 'manifest'] as const)(
    'rejects %s before store, metadata or transport access',
    async (kind) => {
      const f = await targetFixture();
      if (kind === 'missing-binary') delete f.options.targetCompressedBytes;
      if (kind === 'changed-binary') f.compressed[0] ^= 1;
      if (kind === 'shared-binary') {
        const shared = new Uint8Array(new SharedArrayBuffer(f.compressed.byteLength));
        shared.set(f.compressed);
        f.options.targetCompressedBytes = shared;
      }
      if (kind === 'source') f.options.sourceSha256 = 'f'.repeat(64);
      if (kind === 'manifest') f.manifest.sourceId = 'wrong-manifest';
      await expect(openGoalQualificationArchiveEvaluatorV3(f.options)).rejects.toThrow();
      await expect(readdir(f.options.directory)).rejects.toMatchObject({ code: 'ENOENT' });
      expect(doubles.market).not.toHaveBeenCalled();
      expect(doubles.history).not.toHaveBeenCalled();
      expect(f.options.fetch).not.toHaveBeenCalled();
    }
  );

  it.each(['missing-model', 'target-role', 'zero-cap'] as const)(
    'rejects %s at registration before a durable access or transport read',
    async (kind) => {
      const f = await targetFixture();
      if (kind === 'missing-model') delete f.plan.executionModel;
      if (kind === 'target-role') f.plan.runtimeProfiles = [GOAL_TARGET_MODEL_PROFILES.target];
      if (kind === 'zero-cap')
        f.plan.executionModel = {
          ...f.plan.executionModel!,
          costPolicy: { ...f.plan.executionModel!.costPolicy, maximumLiveFeeCodec: '0' },
        };
      const evaluator = await openGoalQualificationArchiveEvaluatorV3(f.options);
      evaluators.push(evaluator);
      await expect(evaluator.register(f.plan)).rejects.toThrow();
      expect(await readdir(join(f.options.directory, 'studies'))).toEqual([]);
      expect(doubles.market).not.toHaveBeenCalled();
      expect(doubles.history).not.toHaveBeenCalled();
      expect(f.options.fetch).not.toHaveBeenCalled();
    }
  );

  it('rejects a changed implementation pin before market data, preserving the attempted access as failed', async () => {
    const f = await targetFixture();
    const model = f.plan.executionModel;
    if (!model || model.protocol !== GOAL_TARGET_MODEL_PROTOCOL) throw Error('legacy fixture model');
    f.plan.executionModel = {
      ...model,
      implementation: {
        ...model.implementation,
        stateCodecSha256: '0'.repeat(64),
      },
    };
    f.request.planSha256 = digest(f.plan);
    const study = join(f.options.directory, 'studies', digest(f.plan));
    await f.writeMetadata();
    const evaluator = await openGoalQualificationArchiveEvaluatorV3(f.options);
    evaluators.push(evaluator);
    await evaluator.register(f.plan);
    await expect(evaluator.evaluate(f.request)).rejects.toThrow('evaluation-failed-no-retry');
    expect(doubles.market).not.toHaveBeenCalled();
    expect(doubles.history).not.toHaveBeenCalled();
    expect(f.options.fetch).not.toHaveBeenCalled();
    expect(await readdir(study)).toContain(`failed-${digest(f.request)}.json`);
    expect(await readdir(study)).not.toContain(`complete-${digest(f.request)}.json`);
  });
});
