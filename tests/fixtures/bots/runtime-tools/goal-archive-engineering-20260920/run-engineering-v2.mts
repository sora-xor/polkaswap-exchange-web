/** One explicitly exposed engineering episode; no qualification, wallet or submission path. */
import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { open, mkdir, link, unlink } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as archiveNamespace from '../../../../../scripts/bots/goal-qualification-archive-reader';
import * as replayNamespace from '../../../../../scripts/bots/goal-qualification-metadata-replay';
import * as qualificationNamespace from '../../../../../src/features/bot-trading/goal-qualification';
import * as clockNamespace from '../../../../../scripts/bots/goal-qualification-clock-builder-v2';
import type { GoalArchiveDevelopmentInput } from '../../../../../scripts/bots/goal-qualification-archive-reader';
import type { GoalMetadataReplayInput } from '../../../../../scripts/bots/goal-qualification-metadata-replay';
import type { GoalQualificationClockBlock } from '../../../../../src/features/bot-trading/goal-qualification-clock';
const archive = (Reflect.get(archiveNamespace, 'default') ?? archiveNamespace) as typeof archiveNamespace;
const replay = (Reflect.get(replayNamespace, 'default') ?? replayNamespace) as typeof replayNamespace;
const qualification = (Reflect.get(qualificationNamespace, 'default') ??
  qualificationNamespace) as typeof qualificationNamespace;
const clocks = (Reflect.get(clockNamespace, 'default') ?? clockNamespace) as typeof clockNamespace;
const BASE = dirname(fileURLToPath(import.meta.url)),
  ROOT = resolve(BASE, '../../../../..');
const RUN = resolve(BASE, 'episode-v2'),
  CACHE = resolve(BASE, 'callback-collection');
const START = Date.parse('2026-06-29T13:00:00Z'),
  END = START + 86400000;
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const sha = (v: string | Uint8Array) => createHash('sha256').update(v).digest('hex');
const canonical = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
const digest = qualification.goalQualificationDigest;
function check(v: unknown, reason: string): asserts v {
  if (!v) throw Error(reason);
}
/** Exact file bytes and a stable regular-file identity; no leaf symlinks or special files. */
export async function bytes(path: string, maximum = 32 * 1024 ** 2): Promise<Buffer> {
  const f = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = await f.stat({ bigint: true });
    check(before.isFile() && before.size > 0n && before.size <= BigInt(maximum), 'artifact-size');
    const data = await f.readFile();
    const after = await f.stat({ bigint: true });
    check(
      BigInt(data.length) === before.size &&
        ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'].every(
          (k) => before[k as keyof typeof before] === after[k as keyof typeof after]
        ),
      'artifact-changed'
    );
    return data;
  } finally {
    await f.close();
  }
}
async function json(path: string) {
  return JSON.parse((await bytes(path)).toString('utf8'));
}
/** Persist bytes before publishing the no-clobber final name and syncing its directory. */
export async function save(path: string, value: unknown) {
  const body = Buffer.from(canonical(value));
  const directory = dirname(path),
    temporary = resolve(directory, `.writing-${randomUUID()}`);
  await mkdir(directory, { recursive: true });
  const f = await open(temporary, 'wx', 0o600);
  try {
    await f.writeFile(body);
    await f.sync();
  } finally {
    await f.close();
  }
  try {
    await link(temporary, path);
  } finally {
    await unlink(temporary);
  }
  const d = await open(directory, constants.O_RDONLY);
  try {
    await d.sync();
  } finally {
    await d.close();
  }
  return { sha256: sha(body), bytes: body.length };
}
interface Protocol {
  kind: 'already-exposed-goal-engineering-protocol-v2';
  input: Omit<GoalArchiveDevelopmentInput, 'engineeringReceipt' | 'blocks'>;
  cache: GoalMetadataReplayInput;
  files: Record<string, { path: string; sha256: string }>;
  sources: Record<string, string>;
  exposureAudit: object;
  network: { maximumStarts: number; minimumIntervalMs: number };
}
/** Keep the immediate arrival predecessor/successor while excluding all unrelated callback metadata. */
export function selectClockCoverage(
  blocks: readonly GoalQualificationClockBlock[],
  startAtMs: number,
  endAtMs: number,
  arrivalDelayMs: number
): GoalQualificationClockBlock[] {
  check(Number.isSafeInteger(startAtMs) && Number.isSafeInteger(endAtMs) && endAtMs > startAtMs, 'episode');
  check(Number.isSafeInteger(arrivalDelayMs) && arrivalDelayMs >= 0, 'arrival-delay');
  const first = blocks.findIndex((b) => b.timestampMs + arrivalDelayMs >= startAtMs);
  const successor = blocks.findIndex((b) => b.timestampMs + arrivalDelayMs >= endAtMs);
  check(first > 0 && successor > first, 'callback-coverage');
  return blocks.slice(first - 1, successor + 1);
}
/** Preparation reads only source code and already verified canonical metadata. */
async function prepare() {
  const engineering = await json(resolve(BASE, 'protocol.json'));
  const verificationPath = resolve(BASE, 'collector-complete-verification.json');
  const verification = await json(verificationPath);
  check(
    verification.verified && verification.networkAttempts === 0 && verification.marketDataRead === false,
    'metadata-not-verified'
  );
  const metadataPath = resolve(BASE, 'callback-development-blocks.json');
  const rawManifestPath = resolve(BASE, 'callback-raw-manifest.json');
  const preparedPath = resolve(CACHE, 'run-protocol.json');
  const rawManifest = await json(rawManifestPath),
    prepared = await json(preparedPath);
  const blocks = (await json(metadataPath)) as GoalQualificationClockBlock[];
  const blockSha = sha(JSON.stringify(blocks));
  const files = {
    'run-protocol': { path: preparedPath, sha256: sha(await bytes(preparedPath)) },
    verification: { path: verificationPath, sha256: sha(await bytes(verificationPath)) },
    'raw-manifest': { path: rawManifestPath, sha256: sha(await bytes(rawManifestPath)) },
    'blocks-development': { path: metadataPath, sha256: sha(await bytes(metadataPath)) },
  };
  check(
    rawManifest.manifestSha256 === files['run-protocol'].sha256 &&
      rawManifest.verificationSha256 === files.verification.sha256,
    'raw-binding'
  );
  const cache: GoalMetadataReplayInput = {
    policy: replay.GOAL_METADATA_REPLAY_POLICY.id,
    manifestSha256: files['run-protocol'].sha256,
    verificationSha256: files.verification.sha256,
    rawManifestSha256: files['raw-manifest'].sha256,
    partition: 'development',
    blocksSha256: blockSha,
    initShardIndex: 0,
  };
  const config = ts.readConfigFile(resolve(BASE, 'runtime-tsconfig.json'), ts.sys.readFile);
  check(!config.error, 'tsconfig');
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, BASE);
  const program = ts.createProgram([fileURLToPath(import.meta.url)], { ...parsed.options, noEmit: true });
  const paths = new Set([
    fileURLToPath(import.meta.url),
    resolve(BASE, 'runtime-tsconfig.json'),
    resolve(ROOT, 'tsconfig.json'),
    resolve(ROOT, 'package.json'),
    resolve(ROOT, 'yarn.lock'),
    ...program
      .getSourceFiles()
      .filter(
        (f) => !f.isDeclarationFile && f.fileName.startsWith(ROOT + '/') && !f.fileName.includes('/node_modules/')
      )
      .map((f) => f.fileName),
  ]);
  const sources: Record<string, string> = {};
  for (const path of [...paths].sort()) sources[relative(ROOT, path)] = sha(await bytes(path));
  const sourceSha = sha(canonical(sources)),
    identitySha = digest({
      kind: 'exposed-engineering-partition',
      startAtMs: START,
      endAtMs: END,
      blocksSha256: blockSha,
    });
  const unusedIdentity = digest({ kind: 'unused-validation-slot', qualificationEligible: false });
  const exposureAudit = {
    kind: 'already-exposed-engineering-access-v1',
    qualificationEligible: false,
    period: { startAtMs: START, endAtMs: END, firstHistoryBucketAtMs: START - 201 * 3600000 },
    engineeringMetadataProtocolSha256: sha(await bytes(resolve(BASE, 'protocol.json'))),
    fixedEarlierStudy: 'Unchanged. No earlier training/validation or current GO/day001 observations are read.',
    exposure: 'Old archive development prefix already used in prior research. This is not new training or validation.',
    candidate:
      'Unchanged engineering baseline:2.5KUSD DCA every6hours,10KUSD capital,1XOR separate fees. No optimization.',
    callbackTiming: 'Explicit fixed modeled delays; not observed historical browser arrivals.',
    previousPreparationFailureSha256: sha(await bytes(resolve(BASE, 'episode-v1/preparation-failed.json'))),
    previousProtocolSha256: sha(await bytes(resolve(BASE, 'episode-v1/protocol.json'))),
    openingPreflightSha256: sha(await bytes(resolve(BASE, 'opening-preflight-v1/complete.json'))),
    versionChange:
      'Explicit deadline cancellation and causal history availability; dates, strategy, lot sizes, fees and delay values unchanged.',
    cache,
    cachePolicy: replay.GOAL_METADATA_REPLAY_POLICY,
  };
  const partition = {
    identitySha256: identitySha,
    blocksSha256: blockSha,
    receiptSha256: files.verification.sha256,
    source: prepared.protocol.source,
  };
  const manifest = {
    protocol: 'goal-qualification-archive-source-v2' as const,
    sourceId: 'exposed-engineering-june29-v2',
    genesisHash: GENESIS,
    denominator: '100000000000000000000000000000000000000',
    warmupHours: 200 as const,
    captureModel: {
      kind: 'fixed-pinned-capture-delays-v1' as const,
      historyReadMs: 1000,
      indexerPublicationDelayMs: 1000,
      markReadMs: 1000,
      quoteAndFeeReadMs: 4000,
    },
    partitions: { training: partition, validation: { ...partition, identitySha256: unusedIdentity } },
    accessAuditSha256: digest(exposureAudit),
    operationalIngestionSha256: [files.verification.sha256],
    maximumHttpRequests: 10000,
    maximumResponseBytes: 256 * 1024 ** 2,
  };
  const candidate = {
    genesisHash: GENESIS,
    denominator: manifest.denominator,
    initialKusdCodec: '10000000000000000000',
    maxTradeKusdCodec: '2500000000000000000',
    maxTradeXorCodec: '10000000000000000000',
    strategy: {
      kind: 'dca' as const,
      amount: '2.5',
      intervalMs: 6 * 3600000,
      threshold: '2',
      direction: 'below' as const,
      fastWindow: 2,
      slowWindow: 3,
      prompt: '',
    },
  };
  qualification.readGoalQualificationBinding(candidate);
  const plan = {
    protocol: qualification.GOAL_QUALIFICATION_PROTOCOL_V2,
    studyId: 'exposed-engineering-june29-v2',
    policy: qualification.GOAL_QUALIFICATION_POLICY_V2,
    source: {
      sourceId: manifest.sourceId,
      manifestSha256: digest(manifest),
      collectorSha256: files['run-protocol'].sha256,
      evaluatorSha256: sourceSha,
    },
    runtimeProfiles: [
      {
        specVersion: 130 as const,
        transactionVersion: 130 as const,
        metadataSha256: engineering.schema.metadataSha256,
        codeHash: engineering.schema.codeHash,
      },
    ],
    arrivalModel: {
      kind: 'modeled-finalized-callbacks' as const,
      model: 'fixed-nonnegative-delays-v1' as const,
      finalityDelayMs: 12000,
      callbackDelayMs: 1000,
      processingDelayMs: 0,
      checkDurationMs: 30000,
    },
    training: { identitySha256: identitySha, startAtMs: START, endAtMs: END },
    validation: { identitySha256: unusedIdentity, startAtMs: END, endAtMs: END },
    candidates: [candidate],
  };
  const request = {
    planSha256: digest(plan),
    candidate,
    candidateSha256: digest(candidate),
    phase: 'training' as const,
    partitionIdentitySha256: identitySha,
    startAtMs: START,
    endAtMs: END,
    episodeIndex: 0,
  };
  const protocol: Protocol = {
    kind: 'already-exposed-goal-engineering-protocol-v2',
    input: { plan, request, manifest },
    cache,
    files,
    sources,
    exposureAudit,
    network: { maximumStarts: 2500, minimumIntervalMs: 125 },
  };
  // Save even if the metadata-only clock check fails: no silent adjustment of timing or dates.
  await save(resolve(RUN, 'protocol.json'), protocol);
  const delay = plan.arrivalModel.finalityDelayMs + plan.arrivalModel.callbackDelayMs;
  try {
    const clock = clocks.buildGoalQualificationClockV2({
      episode: { startAtMs: START, endAtMs: END },
      model: plan.arrivalModel,
      source: {
        sourceId: manifest.sourceId,
        genesisHash: GENESIS,
        manifestSha256: digest(manifest),
        preregistrationSha256: sha(canonical(protocol)),
      },
      blocks: selectClockCoverage(blocks, START, END, delay),
    });
    await save(resolve(RUN, 'prepared.json'), {
      ready: true,
      protocolSha256: sha(canonical(protocol)),
      checks: clock.checks.length,
      cancelledChecks: clock.checks.filter((c) => 'cancelledAtMs' in c),
      clockTraceSha256: clock.traceSha256,
      sourceFiles: paths.size,
      marketDataRead: false,
      qualificationEligible: false,
    });
    console.log(
      JSON.stringify({ ready: true, checks: clock.checks.length, sourceFiles: paths.size, marketDataRead: false })
    );
  } catch (e) {
    await save(resolve(RUN, 'preparation-failed.json'), {
      ready: false,
      marketDataRead: false,
      reason: e instanceof Error ? e.message : 'invalid-clock',
      diagnostic: e instanceof clocks.GoalCallbackBuildError ? e.diagnostic : null,
    });
    throw Error('engineering-clock-incomplete');
  }
}
/** One durable access marker, bounded physical transport and write-once raw evidence. No retries. */
async function execute() {
  const protocol = (await json(resolve(RUN, 'protocol.json'))) as Protocol;
  const prepared = await json(resolve(RUN, 'prepared.json'));
  check(prepared.ready && prepared.protocolSha256 === sha(canonical(protocol)), 'not-prepared');
  for (const [path, hash] of Object.entries(protocol.sources))
    check(sha(await bytes(resolve(ROOT, path))) === hash, 'source-changed');
  for (const f of Object.values(protocol.files)) check(sha(await bytes(f.path)) === f.sha256, 'input-changed');
  const rows: { name: string; sha256: string; bytes: number }[] = [];
  let rawBytes = 0,
    starts = 0,
    lastStart = 0,
    hits = 0;
  const lifetime = new AbortController();
  const onSignal = () => lifetime.abort();
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  const retain = async (name: string, value: unknown) => {
    check(/^[a-zA-Z0-9_.-]+\.json$/.test(name) && !rows.some((r) => r.name === name), 'raw-name');
    const size = Buffer.byteLength(canonical(value));
    check(rows.length < 16000 && size <= 32 * 1024 ** 2 && rawBytes + size <= 512 * 1024 ** 2, 'raw-budget');
    const receipt = await save(resolve(RUN, 'raw', name), value);
    rows.push({ name, ...receipt });
    rawBytes += receipt.bytes;
    return receipt;
  };
  const rawFetch = globalThis.fetch;
  const liveFetch: typeof fetch = async (url, init) => {
    check(
      !lifetime.signal.aborted && ['https://mof2.sora.org/', 'https://pi.soramitsu.io/graphql'].includes(String(url)),
      'endpoint'
    );
    check(++starts <= protocol.network.maximumStarts, 'http-limit');
    const wait = protocol.network.minimumIntervalMs - (Date.now() - lastStart);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    check(!lifetime.signal.aborted && !init?.signal?.aborted, 'aborted');
    lastStart = Date.now();
    return rawFetch(url, init);
  };
  const readArtifact = async (name: string, signal: AbortSignal) => {
    check(!signal.aborted, 'aborted');
    const fixed = protocol.files[name];
    if (fixed) {
      const data = await bytes(fixed.path);
      check(sha(data) === fixed.sha256, 'cache-file-changed');
      return data.toString('utf8');
    }
    check(/^(?:shard-\d{5}\.complete|group-\d{5}\.(?:complete|batch-\d{5}))$/.test(name), 'cache-file-name');
    return (await bytes(resolve(CACHE, name + '.json'), 8 * 1024 ** 2)).toString('utf8');
  };
  await save(resolve(RUN, 'access.json'), {
    kind: 'already-exposed-engineering-access-v1',
    protocolSha256: sha(canonical(protocol)),
    startedAt: new Date().toISOString(),
    pid: process.pid,
    qualificationEligible: false,
    transactionSubmitted: false,
  });
  try {
    const cache = await replay.createGoalMetadataReplayTransport(protocol.cache, {
      readArtifact,
      liveFetch,
      signal: lifetime.signal,
      retainEvidence: async (value) => {
        await retain(`cache-${++hits}.json`, value);
      },
    });
    await retain('metadata-cache-binding.json', { binding: cache.binding, bindingSha256: cache.bindingSha256 });
    const blocks = (await json(protocol.files['blocks-development'].path)) as GoalQualificationClockBlock[];
    const input: GoalArchiveDevelopmentInput = {
      ...protocol.input,
      blocks,
      engineeringReceipt: {
        kind: 'already-exposed-engineering-run-v1',
        planSha256: protocol.input.request.planSha256,
        requestSha256: digest(protocol.input.request),
        manifestSha256: protocol.input.plan.source.manifestSha256,
        exposureAuditSha256: digest(protocol.exposureAudit),
        protocolRecordedBeforeRunSha256: sha(canonical(protocol)),
      },
    };
    let valuations = 0;
    const result = await archive.evaluateGoalArchiveEngineeringEpisodeV2(input, {
      fetch: liveFetch,
      marketFetch: cache.fetch,
      signal: lifetime.signal,
      timeoutMs: 20000,
      sink: {
        retainEvidence: async (name, value) => {
          const r = await retain(name, value);
          if (name.startsWith('valuation-') && ++valuations % 120 === 0)
            console.log(
              JSON.stringify({ valuations, httpStarts: starts, cacheHits: hits, qualificationEligible: false })
            );
          return r;
        },
      },
    });
    for (const [path, hash] of Object.entries(protocol.sources))
      check(sha(await bytes(resolve(ROOT, path))) === hash, 'source-changed');
    await save(resolve(RUN, 'raw-manifest.json'), {
      complete: true,
      rows,
      bytes: rawBytes,
      cacheCounts: cache.counts(),
      httpStarts: starts,
    });
    await save(resolve(RUN, 'result.json'), result);
    await save(resolve(RUN, 'complete.json'), {
      complete: true,
      traceSha256: result.traceSha256,
      events: result.trace.events.length,
      signals: result.trace.signals.length,
      rawReceipts: rows.length,
      rawBytes,
      httpStarts: starts,
      cacheHits: hits,
      qualificationEligible: false,
      transactionSubmitted: false,
    });
    console.log(
      JSON.stringify({
        complete: true,
        events: result.trace.events.length,
        signals: result.trace.signals.length,
        httpStarts: starts,
        qualificationEligible: false,
      })
    );
  } catch (e) {
    await save(resolve(RUN, 'raw-manifest-incomplete.json'), {
      complete: false,
      rows,
      bytes: rawBytes,
      httpStarts: starts,
    });
    await save(resolve(RUN, 'failure.json'), {
      complete: false,
      reason: e instanceof Error ? e.message : 'engineering-failed',
      httpStarts: starts,
      cacheHits: hits,
      qualificationEligible: false,
      transactionSubmitted: false,
    });
    console.log(
      JSON.stringify({
        complete: false,
        reason: e instanceof Error ? e.message : 'engineering-failed',
        httpStarts: starts,
        cacheHits: hits,
      })
    );
    process.exitCode = 1;
  } finally {
    lifetime.abort();
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  if (mode === '--prepare') await prepare();
  else if (mode === '--run') await execute();
  else throw Error('Use --prepare or --run');
}
