/** Publish immutable study evidence for browser re-verification; never grants trading authority. */
import { createHash } from 'node:crypto';
import { constants, type BigIntStats } from 'node:fs';
import { lstat, mkdir, mkdtemp, open, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import {
  createGoalQualificationBoundaryV2,
  createGoalQualificationBoundaryV3,
  goalQualificationDigest as digest,
  type GoalQualificationCertificate,
  type GoalQualificationEvaluationRequest,
  type GoalQualificationPlan,
} from '../../src/features/bot-trading/goal-qualification';
import type { GoalBundleArtifact, GoalBundleManifest } from '../../src/features/bot-trading/goal-bundle-reader';
import { readGoalRawEnvelope } from '../../src/features/bot-trading/goal-raw-envelope';
import type { GoalQualificationArchiveManifest } from './goal-qualification-archive-reader';
import {
  openGoalQualificationStudyReplayV2,
  openGoalQualificationStudyReplayV3,
  type GoalStudyEvidenceReceipt,
} from './goal-qualification-study-store';
import { prepareGoalAcquisitionReplayFiles } from './goal-acquisition-replay-files';
import {
  buildGoalMetadataReplayRawManifest,
  type GoalMetadataReplayInput,
  type GoalCatalogMetadataReplayInput,
  type GoalMetadataReplayRawEntry,
} from './goal-qualification-metadata-replay';

import {
  readGoalTargetExecutionModel,
  isGoalCatalogTargetExecutionModel,
} from '../../src/features/bot-trading/goal-target-model';

type MetadataReplayBinding = GoalMetadataReplayInput | GoalCatalogMetadataReplayInput;
const MAX_FILE = 32 * 1024 * 1024;
const MAX_EPISODE = 512 * 1024 * 1024;
const MAX_STUDY = 8 * 1024 * 1024 * 1024;
const SHA = /^[0-9a-f]{64}$/;
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const DAY = 86400000;
interface Protocol {
  plan: GoalQualificationPlan;
  manifest: GoalQualificationArchiveManifest;
  sources: Record<string, string>;
  files: Record<string, { path: string; sha256: string }>;
  caches?: Record<'training' | 'validation', MetadataReplayBinding>;
  parent?: { planSha256: string; requestSha256: string; sourceSha256: string; protocolSha256: string };
  rawManifestSha256?: string;
}
/** Paths are trusted local operator inputs, never accepted from the website or an AI tool payload. */
export interface GoalStudyBundleExportInput {
  studyRoot: string;
  runDirectory: string;
  /** Must not exist. The index is written last, and an incomplete directory is not a publication. */
  outputDirectory: string;
  /** Digest of the already sealed canonical protocol, supplied independently of the source file. */
  protocolSha256: string;
  signal?: AbortSignal;
}
/** Root objects include journal records; episodes retain the exact original raw wrapper bytes. */
export interface GoalStudyBundleIndex {
  kind: 'goal-study-evidence-bundle-v1';
  version: 1;
  protocolSha256: string;
  planSha256: string;
  sourceSha256: string;
  certificateSha256: string;
  artifacts: readonly GoalBundleArtifact[];
  episodes: readonly {
    phase: 'training' | 'validation';
    candidateSha256: string;
    episodeIndex: number;
    requestSha256: string;
    manifestSha256: string;
  }[];
  /** Parent evidence preserves the failed attempt. It is not another candidate or validation partition. */
  parent: null | { planSha256: string; requestSha256: string; artifacts: readonly GoalBundleArtifact[] };
  /** Original callback collection, including the raw RPC batches needed to rebuild the causal clock. */
  metadata: null | {
    bindings: Record<'training' | 'validation', MetadataReplayBinding>;
    artifacts: readonly GoalBundleArtifact[];
  };
}
function check(value: unknown, reason: string): asserts value {
  if (!value) throw Error(`goal-study-export:${reason}`);
}
const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
const sameFile = (a: BigIntStats, b: BigIntStats) =>
  a.dev === b.dev &&
  a.ino === b.ino &&
  a.mode === b.mode &&
  a.size === b.size &&
  a.mtimeNs === b.mtimeNs &&
  a.ctimeNs === b.ctimeNs &&
  a.nlink === b.nlink;
function absolute(path: unknown): asserts path is string {
  check(
    typeof path === 'string' &&
      path.length <= 4096 &&
      !path.includes('\0') &&
      isAbsolute(path) &&
      resolve(path) === path,
    'absolute-path'
  );
}
function outside(parent: string, path: string): boolean {
  const part = relative(parent, path);
  return part === '..' || part.startsWith(`..${sep}`);
}
function sourcePath(root: string, name: string): string {
  check(name.length <= 1024 && name.split('/').every((part) => NAME.test(part) && !part.includes('..')), 'source-path');
  const path = resolve(root, name);
  check(path.startsWith(root + sep), 'source-path');
  return path;
}
function request(
  plan: GoalQualificationPlan,
  candidateIndex: number,
  phase: 'training' | 'validation',
  episodeIndex: number
): GoalQualificationEvaluationRequest {
  const candidate = plan.candidates[candidateIndex];
  return {
    planSha256: digest(plan),
    candidate,
    candidateSha256: digest(candidate),
    phase,
    partitionIdentitySha256: plan[phase].identitySha256,
    startAtMs: plan[phase].startAtMs + episodeIndex * DAY,
    endAtMs: plan[phase].startAtMs + (episodeIndex + 1) * DAY,
    episodeIndex,
  };
}

/** Immutable distribution identity and exact publication size, without trading authority. */
export interface GoalStudyBundleExportResult {
  indexPath: string;
  indexSha256: string;
  episodes: number;
  files: number;
  bytes: number;
}
/** Original strict V2 publication entry point, including its previously verified continuation support. */
export function exportGoalStudyBundle(raw: GoalStudyBundleExportInput): Promise<Readonly<GoalStudyBundleExportResult>> {
  return exportBundle(raw, 2);
}
/** Explicit V3 publication; only complete new studies, with no acquisition continuation or raw replay shortcut. */
export function exportGoalStudyBundleV3(
  raw: GoalStudyBundleExportInput
): Promise<Readonly<GoalStudyBundleExportResult>> {
  return exportBundle(raw, 3);
}
/**
 * Recheck completed journals and copy exact bytes without opening new research data.
 * This verifies distribution integrity; independent raw replay precedes release publication.
 */
async function exportBundle(
  raw: GoalStudyBundleExportInput,
  version: 2 | 3
): Promise<Readonly<GoalStudyBundleExportResult>> {
  check(raw && Object.getPrototypeOf(raw) === Object.prototype, 'input');
  const descriptors = Object.getOwnPropertyDescriptors(raw);
  const keys = [
    'studyRoot',
    'runDirectory',
    'outputDirectory',
    'protocolSha256',
    ...(Object.hasOwn(raw, 'signal') ? ['signal'] : []),
  ];
  check(
    Reflect.ownKeys(descriptors).length === keys.length &&
      keys.every((key) => descriptors[key]?.enumerable && 'value' in descriptors[key]),
    'input'
  );
  const input = Object.fromEntries(
    keys.map((key) => [key, descriptors[key].value])
  ) as unknown as GoalStudyBundleExportInput;
  for (const path of [input.studyRoot, input.runDirectory, input.outputDirectory]) absolute(path);
  check(SHA.test(input.protocolSha256) && (input.signal === undefined || input.signal instanceof AbortSignal), 'input');
  check(
    outside(input.studyRoot, input.outputDirectory) &&
      outside(input.runDirectory, input.outputDirectory) &&
      outside(input.outputDirectory, input.studyRoot) &&
      outside(input.outputDirectory, input.runDirectory),
    'output-overlap'
  );
  const active = () => check(!input.signal?.aborted, 'aborted');
  const snapshots = new Map<string, { stat: BigIntStats; sha256: string }>();
  let outputBytes = 0,
    outputFiles = 0;
  /** Every source must be a bounded regular file through real, non-symlink parents. */
  const read = async (path: string): Promise<Buffer> => {
    active();
    absolute(path);
    check((await realpath(path)) === path, 'symlink');
    const before = await lstat(path, { bigint: true });
    check(before.isFile() && before.size > 0n && before.size <= BigInt(MAX_FILE), 'file-size-or-type');
    const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      check(sameFile(before, await handle.stat({ bigint: true })), 'changed-file');
      const bytes = Buffer.alloc(Number(before.size));
      let offset = 0;
      while (offset < bytes.length) {
        active();
        const part = await handle.read(bytes, offset, bytes.length - offset, offset);
        check(part.bytesRead > 0, 'short-read');
        offset += part.bytesRead;
      }
      check(
        sameFile(before, await handle.stat({ bigint: true })) && sameFile(before, await lstat(path, { bigint: true })),
        'changed-file'
      );
      const hash = sha(bytes),
        previous = snapshots.get(path);
      check(!previous || (sameFile(previous.stat, before) && previous.sha256 === hash), 'changed-file');
      snapshots.set(path, { stat: before, sha256: hash });
      return bytes;
    } finally {
      await handle.close();
    }
  };
  const json = async <T>(path: string): Promise<T> => {
    const bytes = await read(path);
    return JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)) as T;
  };
  const absent = async (path: string) => {
    try {
      await lstat(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    throw Error('goal-study-export:must-be-absent');
  };
  for (const path of [input.studyRoot, input.runDirectory, dirname(input.outputDirectory)])
    check((await realpath(path)) === path && (await lstat(path)).isDirectory(), 'directory');
  await absent(input.outputDirectory);
  const protocol = await json<Protocol>(join(input.runDirectory, 'protocol.json'));
  check(sha(canonical(protocol)) === input.protocolSha256, 'protocol-pin');
  const certificate = await json<GoalQualificationCertificate>(join(input.runDirectory, 'certificate.json'));
  check(digest(protocol.plan) === digest(certificate.plan), 'certificate-plan');
  check(
    protocol.plan.protocol === `finalized-xyk-qualification-v${version}` &&
      (version === 2 || protocol.manifest.protocol === 'goal-qualification-archive-source-v3'),
    'protocol-version'
  );
  if (version === 3)
    check(
      !Object.hasOwn(protocol, 'parent') && !Object.hasOwn(protocol, 'rawManifestSha256'),
      'continuation-unsupported'
    );
  if (version === 3) check(protocol.caches, 'metadata-required');
  const catalogMode =
    version === 3 && isGoalCatalogTargetExecutionModel(readGoalTargetExecutionModel(protocol.plan.executionModel));
  check(
    protocol.sources && Object.keys(protocol.sources).length > 0 && Object.keys(protocol.sources).length <= 256,
    'source-count'
  );
  check(sha(canonical(protocol.sources)) === protocol.plan.source.evaluatorSha256, 'source-binding');
  for (const [name, hash] of Object.entries(protocol.sources)) {
    check(SHA.test(hash) && sha(await read(sourcePath(input.runDirectory, name))) === hash, 'source-changed');
  }
  check(digest(protocol.manifest) === protocol.plan.source.manifestSha256, 'archive-binding');
  const metadata: Partial<Record<'training' | 'validation', Buffer>> = {};
  for (const phase of ['training', 'validation'] as const) {
    const binding = protocol.files[`blocks-${phase}`];
    check(binding && SHA.test(binding.sha256), 'metadata-binding');
    const bytes = await read(binding.path),
      blocks = JSON.parse(bytes.toString('utf8')) as unknown;
    check(
      Array.isArray(blocks) &&
        blocks.length > 0 &&
        sha(bytes) === binding.sha256 &&
        sha(JSON.stringify(blocks)) === protocol.manifest.partitions[phase].blocksSha256,
      'metadata-changed'
    );
    metadata[phase] = bytes;
  }
  let metadataArchive: null | {
    directory: string;
    inputs: Map<string, Buffer>;
    entries: readonly GoalMetadataReplayRawEntry[];
    bindings: Record<'training' | 'validation', MetadataReplayBinding>;
  } = null;
  if (protocol.caches) {
    check(Object.keys(protocol.caches).length === 2, 'metadata-cache-partitions');
    const inputs = new Map<string, Buffer>();
    for (const name of ['run-protocol', 'verification', 'raw-manifest']) {
      const binding = protocol.files[name];
      check(binding && SHA.test(binding.sha256), 'metadata-cache-binding');
      const bytes = await read(binding.path);
      check(sha(bytes) === binding.sha256, 'metadata-cache-input-changed');
      inputs.set(name, bytes);
    }
    for (const phase of ['training', 'validation'] as const) {
      const binding = protocol.caches[phase];
      check(
        binding &&
          binding.policy ===
            (catalogMode ? 'verified-canonical-catalog-metadata-cache-v2' : 'verified-canonical-metadata-cache-v1') &&
          binding.partition === phase &&
          binding.manifestSha256 === protocol.plan.source.collectorSha256 &&
          binding.manifestSha256 === protocol.files['run-protocol'].sha256 &&
          binding.verificationSha256 === protocol.files.verification.sha256 &&
          binding.rawManifestSha256 === protocol.files['raw-manifest'].sha256 &&
          binding.blocksSha256 === protocol.manifest.partitions[phase].blocksSha256 &&
          Number.isSafeInteger(binding.initShardIndex) &&
          binding.initShardIndex >= 0,
        'metadata-cache-binding'
      );
      inputs.set(`blocks-${phase}`, metadata[phase]!);
    }
    const rawManifest = JSON.parse(inputs.get('raw-manifest')!.toString('utf8'));
    const manifest = buildGoalMetadataReplayRawManifest(
      {
        manifestSha256: protocol.caches.training.manifestSha256,
        verificationSha256: protocol.caches.training.verificationSha256,
      },
      rawManifest.files
    );
    check(canonical(rawManifest) === canonical(manifest), 'metadata-cache-manifest');
    check(
      manifest.files.reduce((total, entry) => total + entry.bytes, 0) <= (catalogMode ? 12 : 4) * 1024 ** 3,
      'metadata-cache-size'
    );
    metadataArchive = {
      directory: dirname(protocol.files['run-protocol'].path),
      inputs,
      entries: manifest.files,
      bindings: protocol.caches,
    };
  }
  const plan = protocol.plan,
    planSha256 = digest(plan),
    sourceSha256 = plan.source.evaluatorSha256;
  const study = join(input.studyRoot, 'studies', planSha256);
  let temporary: string | undefined;
  let store: Awaited<ReturnType<typeof openGoalQualificationStudyReplayV2>> | undefined;
  let boundary: ReturnType<typeof createGoalQualificationBoundaryV2> | undefined;
  try {
    if (protocol.parent) {
      check(SHA.test(protocol.parent.planSha256) && SHA.test(protocol.parent.requestSha256), 'parent-binding');
      temporary = await realpath(await mkdtemp(join(tmpdir(), 'goal-export-prefix-')));
      const prepared = await prepareGoalAcquisitionReplayFiles({
        studyRoot: input.studyRoot,
        parentPlanSha256: protocol.parent.planSha256,
        requestSha256: protocol.parent.requestSha256,
        manifestPath: join(temporary, 'inventory.json'),
        ...(input.signal ? { signal: input.signal } : {}),
      });
      check(prepared.manifest.sha256 === protocol.rawManifestSha256, 'parent-inventory');
      store = await openGoalQualificationStudyReplayV2(
        { directory: input.studyRoot, sourceSha256 },
        {
          preparation: prepared.preparation,
          completedReplay: () => {
            throw Error('goal-study-export:no-new-evaluation');
          },
        }
      );
    } else
      store = await (version === 3 ? openGoalQualificationStudyReplayV3 : openGoalQualificationStudyReplayV2)({
        directory: input.studyRoot,
        sourceSha256,
      });
    const journalNames = ['registration', 'selection'];
    for (const name of journalNames) await read(join(study, name + '.json'));
    await read(join(input.studyRoot, 'study-ids', `${plan.studyId}.json`));
    await read(join(input.studyRoot, 'validation-partitions', `${plan.validation.identitySha256}.json`));
    if (protocol.parent) {
      const parentDirectory = join(input.studyRoot, 'studies', protocol.parent.planSha256);
      for (const name of [
        'registration',
        `access-${protocol.parent.requestSha256}`,
        `failed-${protocol.parent.requestSha256}`,
        'continuation-child',
      ])
        await read(join(parentDirectory, name + '.json'));
      await read(join(study, 'continuation.json'));
    }
    const selected = plan.candidates.findIndex(
      (candidate) => digest(candidate) === certificate.selection.candidateSha256
    );
    check(selected >= 0, 'selected-candidate');
    const requests: GoalQualificationEvaluationRequest[] = [];
    for (let candidate = 0; candidate < plan.candidates.length; candidate++)
      for (let episode = 0; episode < 4; episode++) requests.push(request(plan, candidate, 'training', episode));
    for (let episode = 0; episode < 2; episode++) requests.push(request(plan, selected, 'validation', episode));
    // Check all completion files before entering the store; missing data must never create access markers.
    for (const item of requests) {
      const id = digest(item);
      await absent(join(study, `failed-${id}.json`));
      await read(join(study, `access-${id}.json`));
      await read(join(study, `complete-${id}.json`));
    }
    boundary = (version === 3 ? createGoalQualificationBoundaryV3 : createGoalQualificationBoundaryV2)({
      protocol: version === 3 ? 'finalized-xyk-execution-validation-v3' : 'finalized-xyk-execution-validation-v2',
      sourceSha256,
      register: (p, restored) => store!.register(p, restored),
      sealSelection: (selection, restored) => store!.sealSelection(selection, restored),
      evaluate: (item, selection) => {
        active();
        return store!.evaluate(item, selection, async () => {
          throw Error('goal-study-export:no-new-evaluation');
        });
      },
    });
    await boundary.reverify(certificate);
    boundary.revoke();
    active();
    await mkdir(input.outputDirectory, { mode: 0o700 });
    await mkdir(join(input.outputDirectory, 'objects'));
    await mkdir(join(input.outputDirectory, 'episodes'));
    const written = new Map<string, string>();
    const write = async (path: string, bytes: Buffer) => {
      active();
      const prior = written.get(path),
        hash = sha(bytes);
      if (prior) {
        check(prior === hash, 'object-collision');
        return;
      }
      check(bytes.length > 0 && bytes.length <= MAX_FILE, 'output-file-size');
      check(outputBytes + bytes.length <= MAX_STUDY, 'output-size');
      const handle = await open(
        path,
        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
        0o600
      );
      try {
        await handle.writeFile(bytes);
        await handle.sync();
      } finally {
        await handle.close();
      }
      written.set(path, hash);
      outputBytes += bytes.length;
      outputFiles++;
    };
    const artifact = async (directory: string, name: string, bytes: Buffer): Promise<GoalBundleArtifact> => {
      check(NAME.test(name) && !name.includes('..'), 'artifact-name');
      const hash = sha(bytes);
      await write(join(directory, 'objects', `${hash}.bin`), bytes);
      return { name, sha256: hash, bytes: bytes.length };
    };
    const encoded = (value: unknown) => Buffer.from(canonical(value) + '\n');
    const artifacts: GoalBundleArtifact[] = [];
    const rootArtifact = async (name: string, bytes: Buffer) =>
      artifacts.push(await artifact(input.outputDirectory, name, bytes));
    await rootArtifact('certificate', await read(join(input.runDirectory, 'certificate.json')));
    // Explicit public projection: never serialize protocol.files, private local paths or source text.
    await rootArtifact(
      'protocol',
      encoded({
        plan,
        manifest: protocol.manifest,
        sources: protocol.sources,
        protocolSha256: input.protocolSha256,
        parent: protocol.parent ?? null,
      })
    );
    for (const name of journalNames) await rootArtifact(name, await read(join(study, `${name}.json`)));
    await rootArtifact('study-claim', await read(join(input.studyRoot, 'study-ids', `${plan.studyId}.json`)));
    await rootArtifact(
      'validation-claim',
      await read(join(input.studyRoot, 'validation-partitions', `${plan.validation.identitySha256}.json`))
    );
    for (const phase of ['training', 'validation'] as const) await rootArtifact(`metadata-${phase}`, metadata[phase]!);
    let publishedMetadata: GoalStudyBundleIndex['metadata'] = null;
    if (metadataArchive) {
      const metadataArtifacts: GoalBundleArtifact[] = [];
      for (const [name, bytes] of metadataArchive.inputs)
        metadataArtifacts.push(await artifact(input.outputDirectory, name, bytes));
      for (const entry of metadataArchive.entries) {
        const bytes = await read(join(metadataArchive.directory, entry.name + '.json'));
        check(bytes.length === entry.bytes && sha(bytes) === entry.sha256, 'metadata-cache-raw-changed');
        metadataArtifacts.push(await artifact(input.outputDirectory, entry.name, bytes));
      }
      publishedMetadata = { bindings: metadataArchive.bindings, artifacts: metadataArtifacts };
    }
    const episodes: GoalStudyBundleIndex['episodes'][number][] = [];
    for (const item of requests) {
      active();
      const id = digest(item),
        directory = join(input.outputDirectory, 'episodes', id);
      await mkdir(directory);
      await mkdir(join(directory, 'objects'));
      const completionPath = join(study, `complete-${id}.json`);
      const completion = await json<{ rawEvidence: GoalStudyEvidenceReceipt[] }>(completionPath);
      check(completion.rawEvidence.length > 0 && completion.rawEvidence.length <= 16000, 'episode-files');
      const episodeArtifacts: GoalBundleArtifact[] = [];
      let episodeBytes = 0;
      for (const receipt of completion.rawEvidence) {
        check(NAME.test(receipt.name) && !receipt.name.includes('..'), 'raw-name');
        if (version === 3)
          check(!/^(?:replay-|acquisition-|continuation-)/.test(receipt.name), 'continuation-unsupported');
        const bytes = await read(join(study, `raw-${id}`, `${receipt.name}.json`));
        const value = readGoalRawEnvelope(bytes, {
          name: receipt.name,
          requestSha256: id,
          valueSha256: receipt.sha256,
        });
        check(Buffer.byteLength(canonical(value)) === receipt.bytes, 'raw-value-size');
        episodeBytes += bytes.length;
        check(episodeBytes <= MAX_EPISODE, 'episode-size');
        episodeArtifacts.push(await artifact(directory, receipt.name, bytes));
      }
      const manifest: GoalBundleManifest = {
        version: 1,
        kind: 'goal-episode-evidence-bundle-v1',
        phase: item.phase,
        planSha256,
        requestSha256: id,
        sourceSha256,
        artifacts: episodeArtifacts,
      };
      const bytes = encoded(manifest);
      check(bytes.length <= 4 * 1024 * 1024, 'episode-manifest-size');
      await write(join(directory, 'manifest.json'), bytes);
      episodes.push({
        phase: item.phase,
        candidateSha256: item.candidateSha256,
        episodeIndex: item.episodeIndex,
        requestSha256: id,
        manifestSha256: sha(bytes),
      });
      await rootArtifact(`access-${id}`, await read(join(study, `access-${id}.json`)));
      await rootArtifact(`complete-${id}`, await read(completionPath));
    }
    let parent: GoalStudyBundleIndex['parent'] = null;
    if (protocol.parent) {
      const binding = protocol.parent,
        directory = join(input.studyRoot, 'studies', binding.planSha256);
      const parentArtifacts: GoalBundleArtifact[] = [];
      const inventoryBytes = await read(join(temporary!, 'inventory.json'));
      check(sha(inventoryBytes) === protocol.rawManifestSha256, 'parent-inventory-changed');
      const inventory = JSON.parse(inventoryBytes.toString('utf8')) as { files: GoalStudyEvidenceReceipt[] };
      for (const name of [
        'registration',
        `access-${binding.requestSha256}`,
        `failed-${binding.requestSha256}`,
        'continuation-child',
      ]) {
        const bytes = await read(join(directory, name + '.json'));
        if (name !== 'continuation-child') {
          const logicalName = name.startsWith('access-') ? 'access' : name.startsWith('failed-') ? 'failed' : name;
          const receipt = inventory.files.find((entry) => entry.name === logicalName);
          check(receipt && receipt.sha256 === sha(bytes) && receipt.bytes === bytes.length, 'parent-record-changed');
        }
        parentArtifacts.push(await artifact(input.outputDirectory, name, bytes));
      }
      await rootArtifact('continuation', await read(join(study, 'continuation.json')));
      // The replay preparer verified this inventory. Preserve every raw source, not just normalized results.
      parentArtifacts.push(await artifact(input.outputDirectory, 'acquisition-inventory', inventoryBytes));
      for (const entry of inventory.files.filter((entry) => entry.name.startsWith('raw/'))) {
        const name = entry.name.slice(4);
        check(NAME.test(name) && !name.includes('..'), 'parent-raw-name');
        const bytes = await read(join(directory, `raw-${binding.requestSha256}`, `${name}.json`));
        check(bytes.length === entry.bytes && sha(bytes) === entry.sha256, 'parent-raw-changed');
        parentArtifacts.push(await artifact(input.outputDirectory, name, bytes));
      }
      parent = { planSha256: binding.planSha256, requestSha256: binding.requestSha256, artifacts: parentArtifacts };
    }
    for (const path of snapshots.keys()) {
      active();
      await read(path);
    }
    const index: GoalStudyBundleIndex = {
      kind: 'goal-study-evidence-bundle-v1',
      version: 1,
      protocolSha256: input.protocolSha256,
      planSha256,
      sourceSha256,
      certificateSha256: certificate.certificateSha256,
      artifacts,
      episodes,
      parent,
      metadata: publishedMetadata,
    };
    const indexPath = join(input.outputDirectory, 'index.json'),
      indexBytes = encoded(index);
    check(indexBytes.length <= 8 * 1024 * 1024, 'index-size');
    await write(indexPath, indexBytes);
    const directory = await open(input.outputDirectory, constants.O_RDONLY);
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
    active();
    return Object.freeze({
      indexPath,
      indexSha256: sha(indexBytes),
      episodes: episodes.length,
      files: outputFiles,
      bytes: outputBytes,
    });
  } finally {
    boundary?.revoke();
    await store?.dispose();
    if (temporary) await rm(temporary, { recursive: true, force: true });
  }
}
