/** Pinned completed-study distribution. Raw validation episodes stay closed; bytes grant no trading authority. */
import { createGoalBundleTransport, GoalBundleError } from './goal-bundle-transport';
import {
  createGoalBundleReader,
  createGoalValidationBundleReader,
  type GoalBundleArtifact,
  type GoalBundleReader,
} from './goal-bundle-reader';
import { assertGoalBundleStudySelection, type GoalBundleStudySelection } from './goal-bundle-study';
import type { GoalStudyBundleIndex } from '../../../scripts/bots/goal-study-bundle-export';

const SHA = /^[0-9a-f]{64}$/;
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const MAX_INDEX = 8 * 1024 * 1024;
const MAX_FILE = 32 * 1024 * 1024;
const MAX_STUDY = 8 * 1024 ** 3;
function check(value: unknown, reason: string): asserts value {
  if (!value) throw new GoalBundleError(`study-${reason}`);
}
function own(value: unknown, keys: readonly string[]): Record<string, unknown> {
  check(value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype, 'object');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  check(
    Reflect.ownKeys(descriptors).length === keys.length &&
      keys.every((key) => descriptors[key]?.enumerable && 'value' in descriptors[key]),
    'fields'
  );
  return Object.fromEntries(keys.map((key) => [key, descriptors[key].value]));
}
function hash(value: unknown): asserts value is string {
  check(typeof value === 'string' && SHA.test(value), 'hash');
}
function artifacts(value: unknown, maximum: number): readonly GoalBundleArtifact[] {
  check(Array.isArray(value) && value.length > 0 && value.length <= maximum, 'artifact-count');
  const names = new Set<string>();
  let total = 0;
  return Object.freeze(
    value.map((raw) => {
      const item = own(raw, ['name', 'sha256', 'bytes']);
      check(
        typeof item.name === 'string' && NAME.test(item.name) && !item.name.includes('..') && !names.has(item.name),
        'artifact-name'
      );
      names.add(item.name);
      hash(item.sha256);
      check(
        Number.isSafeInteger(item.bytes) && Number(item.bytes) > 0 && Number(item.bytes) <= MAX_FILE,
        'artifact-size'
      );
      total += Number(item.bytes);
      check(total <= MAX_STUDY, 'artifact-total');
      return Object.freeze({ name: item.name, sha256: item.sha256, bytes: Number(item.bytes) });
    })
  );
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
/** Parse identities and finite artifact namespaces. Semantic raw verification is owned by the caller's evaluator. */
function index(bytes: Uint8Array): Readonly<GoalStudyBundleIndex> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes));
  } catch {
    throw new GoalBundleError('study-json');
  }
  const input = own(parsed, [
    'kind',
    'version',
    'protocolSha256',
    'planSha256',
    'sourceSha256',
    'certificateSha256',
    'artifacts',
    'episodes',
    'parent',
    'metadata',
  ]);
  check(input.kind === 'goal-study-evidence-bundle-v1' && input.version === 1, 'version');
  for (const name of ['protocolSha256', 'planSha256', 'sourceSha256', 'certificateSha256']) hash(input[name]);
  const root = artifacts(input.artifacts, 64),
    rootNames = new Set(root.map((entry) => entry.name));
  check(
    [
      'certificate',
      'protocol',
      'registration',
      'selection',
      'study-claim',
      'validation-claim',
      'metadata-training',
      'metadata-validation',
    ].every((name) => rootNames.has(name)),
    'missing-root-artifact'
  );
  check(Array.isArray(input.episodes) && [6, 10, 14].includes(input.episodes.length), 'episodes');
  const seen = new Set<string>(),
    candidates = new Set<string>();
  const trainingCount = input.episodes.length - 2;
  let currentCandidate = '';
  const episodes = input.episodes.map((raw, position) => {
    const entry = own(raw, ['phase', 'candidateSha256', 'episodeIndex', 'requestSha256', 'manifestSha256']);
    for (const name of ['candidateSha256', 'requestSha256', 'manifestSha256']) hash(entry[name]);
    check(!seen.has(entry.requestSha256 as string), 'duplicate-episode');
    seen.add(entry.requestSha256 as string);
    const training = position < trainingCount;
    check(
      entry.phase === (training ? 'training' : 'validation') &&
        entry.episodeIndex === (training ? position % 4 : position - trainingCount),
      'episode-order'
    );
    if (training && position % 4 === 0) {
      check(!candidates.has(entry.candidateSha256 as string), 'duplicate-candidate');
      candidates.add(entry.candidateSha256 as string);
      currentCandidate = entry.candidateSha256 as string;
    } else if (!training && position === trainingCount) {
      check(candidates.has(entry.candidateSha256 as string), 'selected-candidate');
      currentCandidate = entry.candidateSha256 as string;
    }
    check(entry.candidateSha256 === currentCandidate, 'candidate-order');
    check(
      rootNames.has(`access-${entry.requestSha256}`) && rootNames.has(`complete-${entry.requestSha256}`),
      'missing-episode-record'
    );
    return entry;
  });
  check(
    root.every(
      (entry) =>
        /^(?:certificate|protocol|registration|selection|study-claim|validation-claim|metadata-training|metadata-validation|continuation)$/.test(
          entry.name
        ) ||
        (/^(?:access|complete)-[0-9a-f]{64}$/.test(entry.name) &&
          seen.has(entry.name.slice(entry.name.indexOf('-') + 1)))
    ),
    'root-namespace'
  );
  let parent: GoalStudyBundleIndex['parent'] = null;
  if (input.parent !== null) {
    const body = own(input.parent, ['planSha256', 'requestSha256', 'artifacts']);
    hash(body.planSha256);
    hash(body.requestSha256);
    check(body.planSha256 !== input.planSha256 && rootNames.has('continuation'), 'parent-binding');
    const entries = artifacts(body.artifacts, 16005),
      names = new Set(entries.map((entry) => entry.name));
    check(
      [
        'registration',
        'continuation-child',
        'acquisition-inventory',
        `access-${body.requestSha256}`,
        `failed-${body.requestSha256}`,
      ].every((name) => names.has(name)),
      'parent-records'
    );
    parent = { planSha256: body.planSha256, requestSha256: body.requestSha256, artifacts: entries };
  } else check(!rootNames.has('continuation'), 'unexpected-continuation');
  let metadata: GoalStudyBundleIndex['metadata'] = null;
  if (input.metadata !== null) {
    const body = own(input.metadata, ['bindings', 'artifacts']),
      bindings = own(body.bindings, ['training', 'validation']);
    const entries = artifacts(body.artifacts, 25005),
      byName = new Map(entries.map((entry) => [entry.name, entry]));
    check(
      entries.every((entry) =>
        /^(?:run-protocol|verification|raw-manifest|blocks-training|blocks-validation|shard-\d{5}\.complete|group-\d{5}\.(?:complete|batch-\d{5}))$/.test(
          entry.name
        )
      ),
      'metadata-namespace'
    );
    check(
      ['run-protocol', 'verification', 'raw-manifest', 'blocks-training', 'blocks-validation'].every((name) =>
        byName.has(name)
      ),
      'metadata-inputs'
    );
    let metadataPolicy: unknown;
    for (const phase of ['training', 'validation']) {
      const binding = own(bindings[phase], [
        'policy',
        'manifestSha256',
        'verificationSha256',
        'rawManifestSha256',
        'partition',
        'blocksSha256',
        'initShardIndex',
      ]);
      check(
        (binding.policy === 'verified-canonical-metadata-cache-v1' ||
          binding.policy === 'verified-canonical-catalog-metadata-cache-v2') &&
          binding.partition === phase &&
          Number.isSafeInteger(binding.initShardIndex) &&
          Number(binding.initShardIndex) >= 0 &&
          Number(binding.initShardIndex) < 25000,
        'metadata-binding'
      );
      for (const name of ['manifestSha256', 'verificationSha256', 'rawManifestSha256', 'blocksSha256'])
        hash(binding[name]);
      check(
        binding.manifestSha256 === byName.get('run-protocol')!.sha256 &&
          binding.verificationSha256 === byName.get('verification')!.sha256 &&
          binding.rawManifestSha256 === byName.get('raw-manifest')!.sha256,
        'metadata-pins'
      );
      check(metadataPolicy === undefined || metadataPolicy === binding.policy, 'metadata-policy');
      metadataPolicy = binding.policy;
      bindings[phase] = binding;
    }
    check(
      entries.reduce((sum, entry) => sum + entry.bytes, 0) <=
        (metadataPolicy === 'verified-canonical-catalog-metadata-cache-v2' ? 12 : 4) * 1024 ** 3 + 5 * MAX_FILE,
      'metadata-total'
    );
    metadata = {
      bindings: bindings as unknown as NonNullable<GoalStudyBundleIndex['metadata']>['bindings'],
      artifacts: entries,
    };
  }
  return freeze({ ...input, artifacts: root, episodes, parent, metadata }) as unknown as Readonly<GoalStudyBundleIndex>;
}

/** Static index identity. Supply the index pin from trusted application configuration, never from AI output. */
export interface GoalStudyBundleReaderInput {
  rootUrl: string;
  indexSha256: string;
}
/**
 * Open a completed study's public evidence. Certificate bytes remain untrusted data. Only training raw
 * episodes can be opened here; an owned study-selection composition is still needed for validation.
 */
export async function createGoalStudyBundleReader(
  raw: GoalStudyBundleReaderInput,
  dependencies: { fetch: typeof fetch; signal?: AbortSignal }
) {
  const input = own(raw, ['rootUrl', 'indexSha256']);
  hash(input.indexSha256);
  check(typeof input.rootUrl === 'string', 'root');
  const deps = own(dependencies, ['fetch', ...(Object.hasOwn(dependencies, 'signal') ? ['signal'] : [])]);
  check(
    typeof deps.fetch === 'function' && (deps.signal === undefined || deps.signal instanceof AbortSignal),
    'dependencies'
  );
  const lifetime = new AbortController(),
    parentSignal = deps.signal as AbortSignal | undefined;
  const abort = () => lifetime.abort();
  parentSignal?.addEventListener('abort', abort, { once: true });
  if (parentSignal?.aborted) abort();
  let transport: ReturnType<typeof createGoalBundleTransport>;
  try {
    transport = createGoalBundleTransport(input.rootUrl, {
      fetch: deps.fetch as typeof fetch,
      signal: lifetime.signal,
    });
  } catch (error) {
    parentSignal?.removeEventListener('abort', abort);
    throw error;
  }
  const children = new Set<GoalBundleReader<'training' | 'validation'>>(),
    opened = new Set<string>();
  let closed = false,
    active = false,
    readBytes = 0;
  const dispose = () => {
    if (closed) return;
    closed = true;
    lifetime.abort();
    transport.dispose();
    for (const child of children) child.dispose();
    parentSignal?.removeEventListener('abort', abort);
  };
  const operation = async <T>(action: () => Promise<T>): Promise<T> => {
    try {
      check(!closed && !lifetime.signal.aborted, 'closed');
      check(!active, 'concurrent-read');
      active = true;
      return await action();
    } catch (error) {
      dispose();
      throw error;
    } finally {
      active = false;
    }
  };
  try {
    const verified = index(await transport.read('index.json', input.indexSha256, MAX_INDEX));
    const root = new Map(verified.artifacts.map((entry) => [entry.name, entry]));
    const metadata = new Map(verified.metadata?.artifacts.map((entry) => [entry.name, entry]) ?? []);
    const parent = new Map(verified.parent?.artifacts.map((entry) => [entry.name, entry]) ?? []);
    const validationRecords = new Set(
      verified.episodes
        .filter((episode) => episode.phase === 'validation')
        .map((episode) => `complete-${episode.requestSha256}`)
    );
    const read = async (entries: Map<string, GoalBundleArtifact>, name: string) => {
      const entry = entries.get(name);
      check(entry, 'unknown-artifact');
      check(readBytes + entry.bytes <= MAX_STUDY, 'read-budget');
      readBytes += entry.bytes;
      return transport.read(`objects/${entry.sha256}.bin`, entry.sha256, entry.bytes, entry.bytes);
    };
    const selectionBinding = (requestSha256: string) => {
      const episode = verified.episodes.find((entry) => entry.requestSha256 === requestSha256);
      check(episode?.phase === 'validation', 'validation-episode');
      return {
        indexSha256: input.indexSha256 as string,
        planSha256: verified.planSha256,
        sourceSha256: verified.sourceSha256,
        candidateSha256: episode.candidateSha256,
        requestSha256,
      };
    };
    return Object.freeze({
      index: verified,
      indexSha256: input.indexSha256,
      dispose,
      readRoot: (name: string) =>
        operation(() => {
          check(!validationRecords.has(name), 'validation-unsupported');
          return read(root, name);
        }),
      readMetadata: (name: string) => operation(() => read(metadata, name)),
      readParent: (name: string) => operation(() => read(parent, name)),
      readValidationRoot: (name: string, selection: GoalBundleStudySelection) =>
        operation(async () => {
          check(validationRecords.has(name), 'validation-record');
          const binding = selectionBinding(name.slice('complete-'.length));
          assertGoalBundleStudySelection(selection, binding);
          const bytes = await read(root, name);
          assertGoalBundleStudySelection(selection, binding);
          return bytes;
        }),
      openValidationEpisode: (requestSha256: string, selection: GoalBundleStudySelection) =>
        operation(async () => {
          const binding = selectionBinding(requestSha256);
          assertGoalBundleStudySelection(selection, binding);
          check(!opened.has(requestSha256), 'episode-read-once');
          opened.add(requestSha256);
          const episode = verified.episodes.find((entry) => entry.requestSha256 === requestSha256)!;
          const child = await createGoalValidationBundleReader(
            { rootUrl: `${input.rootUrl}episodes/${requestSha256}/`, manifestSha256: episode.manifestSha256 },
            { fetch: deps.fetch as typeof fetch, signal: lifetime.signal },
            { selection, binding }
          );
          children.add(child);
          check(readBytes + child.summary.bytes <= MAX_STUDY, 'read-budget');
          readBytes += child.summary.bytes;
          return child;
        }),
      openTrainingEpisode: (requestSha256: string) =>
        operation(async () => {
          const episode = verified.episodes.find((entry) => entry.requestSha256 === requestSha256);
          check(episode && episode.phase === 'training', 'validation-unsupported');
          check(!opened.has(requestSha256), 'episode-read-once');
          opened.add(requestSha256);
          const child = await createGoalBundleReader(
            { rootUrl: `${input.rootUrl}episodes/${requestSha256}/`, manifestSha256: episode.manifestSha256 },
            { fetch: deps.fetch as typeof fetch, signal: lifetime.signal }
          );
          children.add(child);
          check(
            child.summary.planSha256 === verified.planSha256 &&
              child.summary.sourceSha256 === verified.sourceSha256 &&
              child.summary.requestSha256 === requestSha256,
            'episode-binding'
          );
          check(readBytes + child.summary.bytes <= MAX_STUDY, 'read-budget');
          readBytes += child.summary.bytes;
          return child;
        }),
    });
  } catch (error) {
    dispose();
    throw error;
  }
}
