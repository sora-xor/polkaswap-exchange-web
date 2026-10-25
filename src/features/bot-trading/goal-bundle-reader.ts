/** Pinned training-episode bytes only. Integrity is not chain truth, qualification or wallet authority. */
import { sha256AsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { createGoalBundleTransport, GoalBundleError as BundleError } from './goal-bundle-transport';
import { assertGoalBundleStudySelection, type GoalBundleStudySelection } from './goal-bundle-study';

const MAX_MANIFEST_BYTES = 4 * 1024 * 1024;
const MAX_FILE_BYTES = 32 * 1024 * 1024;
const MAX_TOTAL_BYTES = 512 * 1024 * 1024;
const MAX_FILES = 16000;
const SHA = /^[0-9a-f]{64}$/;
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/** Supplied by trusted application code; neither field establishes qualification. */
export interface GoalBundleReaderInput {
  rootUrl: string;
  manifestSha256: string;
}
export interface GoalBundleReaderDependencies {
  fetch: typeof fetch;
  signal?: AbortSignal;
}
export interface GoalBundleArtifact {
  name: string;
  sha256: string;
  bytes: number;
}
/** One episode is deliberately bounded separately from a future whole-study index. */
export interface GoalBundleManifest {
  version: 1;
  kind: 'goal-episode-evidence-bundle-v1';
  phase: 'training' | 'validation';
  planSha256: string;
  requestSha256: string;
  sourceSha256: string;
  artifacts: readonly GoalBundleArtifact[];
}
export interface GoalBundleReader<Phase extends 'training' | 'validation' = 'training'> {
  readonly summary: Readonly<{
    kind: Phase extends 'training' ? 'goal-training-bundle-bytes-v1' : 'goal-validation-bundle-bytes-v1';
    phase: Phase;
    manifestSha256: string;
    planSha256: string;
    requestSha256: string;
    sourceSha256: string;
    files: number;
    bytes: number;
  }>;
  /** Each logical artifact is read once, in sequence; callers own and may retain the returned bytes. */
  read(name: string): Promise<Uint8Array>;
  /** Abort outstanding work and revoke further reads; no shared provider is disconnected. */
  dispose(): void;
}
function check(value: unknown, reason: string): asserts value {
  if (!value) throw new BundleError(reason);
}
function own(value: unknown, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  check(value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype, 'own-data');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  check(
    required.every((key) => Object.hasOwn(descriptors, key)) &&
      Reflect.ownKeys(descriptors).every(
        (key) =>
          typeof key === 'string' &&
          [...required, ...optional].includes(key) &&
          descriptors[key].enumerable &&
          'value' in descriptors[key]
      ),
    'own-data'
  );
  return Object.fromEntries(Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]));
}
function hash(value: unknown): asserts value is string {
  check(typeof value === 'string' && SHA.test(value), 'digest');
}
function rootUrl(value: unknown): string {
  check(typeof value === 'string' && value.length > 0 && value.length <= 2048, 'root');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new BundleError('root');
  }
  check(
    url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.href === value &&
      url.pathname.endsWith('/') &&
      url.pathname
        .slice(1, -1)
        .split('/')
        .every((segment) =>
          segment === '' ? url.pathname === '/' : /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/.test(segment)
        ),
    'root'
  );
  return url.href;
}
const sha = (bytes: Uint8Array): string => u8aToHex(sha256AsU8a(bytes), undefined, false);
function manifest(bytes: Uint8Array, phase: 'training' | 'validation'): GoalBundleManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes));
  } catch {
    throw new BundleError('manifest-json');
  }
  const value = own(parsed, ['version', 'kind', 'phase', 'planSha256', 'requestSha256', 'sourceSha256', 'artifacts']);
  check(value.version === 1 && value.kind === 'goal-episode-evidence-bundle-v1', 'manifest-version');
  check(value.phase === phase, 'validation-unsupported');
  hash(value.planSha256);
  hash(value.requestSha256);
  hash(value.sourceSha256);
  check(
    Array.isArray(value.artifacts) && value.artifacts.length > 0 && value.artifacts.length <= MAX_FILES,
    'manifest-files'
  );
  let total = 0;
  const names = new Set<string>();
  const artifacts = value.artifacts.map((raw) => {
    const artifact = own(raw, ['name', 'sha256', 'bytes']);
    check(
      typeof artifact.name === 'string' &&
        NAME.test(artifact.name) &&
        !artifact.name.includes('..') &&
        !names.has(artifact.name),
      'artifact-name'
    );
    hash(artifact.sha256);
    check(
      Number.isSafeInteger(artifact.bytes) &&
        (artifact.bytes as number) > 0 &&
        (artifact.bytes as number) <= MAX_FILE_BYTES,
      'artifact-size'
    );
    names.add(artifact.name);
    total += artifact.bytes as number;
    check(total <= MAX_TOTAL_BYTES, 'manifest-size');
    return Object.freeze({ name: artifact.name, sha256: artifact.sha256, bytes: artifact.bytes as number });
  });
  return Object.freeze({
    version: 1,
    kind: 'goal-episode-evidence-bundle-v1',
    phase,
    planSha256: value.planSha256,
    requestSha256: value.requestSha256,
    sourceSha256: value.sourceSha256,
    artifacts: Object.freeze(artifacts),
  });
}
/**
 * Open a trusted-hash HTTPS training episode. Only exact derived object URLs are read, without credentials,
 * redirects, wallet APIs, filesystem access, certificate restoration or validation admission.
 */
export async function createGoalBundleReader(
  raw: GoalBundleReaderInput,
  dependencies: GoalBundleReaderDependencies
): Promise<GoalBundleReader> {
  return createPhaseReader(raw, dependencies, 'training');
}

/** Exact selected validation episode, issued only by the owned completed-study replay. */
export interface GoalValidationBundleBinding {
  indexSha256: string;
  planSha256: string;
  sourceSha256: string;
  candidateSha256: string;
  requestSha256: string;
}

/** A serialized selection cannot open validation. Recheck the owned seal throughout the reader lifetime. */
export async function createGoalValidationBundleReader(
  raw: GoalBundleReaderInput,
  dependencies: GoalBundleReaderDependencies,
  admission: { selection: GoalBundleStudySelection; binding: GoalValidationBundleBinding }
): Promise<GoalBundleReader<'validation'>> {
  const values = own(admission, ['selection', 'binding']);
  const binding = own(values.binding, [
    'indexSha256',
    'planSha256',
    'sourceSha256',
    'candidateSha256',
    'requestSha256',
  ]) as unknown as GoalValidationBundleBinding;
  Object.values(binding).forEach(hash);
  const assertAdmitted = () => assertGoalBundleStudySelection(values.selection as GoalBundleStudySelection, binding);
  assertAdmitted();
  const reader = await createPhaseReader(raw, dependencies, 'validation', assertAdmitted);
  try {
    check(
      reader.summary.planSha256 === binding.planSha256 &&
        reader.summary.sourceSha256 === binding.sourceSha256 &&
        reader.summary.requestSha256 === binding.requestSha256,
      'validation-binding'
    );
    assertAdmitted();
    return reader;
  } catch (error) {
    reader.dispose();
    throw error;
  }
}

async function createPhaseReader<Phase extends 'training' | 'validation'>(
  raw: GoalBundleReaderInput,
  dependencies: GoalBundleReaderDependencies,
  phase: Phase,
  assertAdmitted: () => void = () => undefined
): Promise<GoalBundleReader<Phase>> {
  assertAdmitted();
  const input = own(raw, ['rootUrl', 'manifestSha256']);
  const root = rootUrl(input.rootUrl);
  hash(input.manifestSha256);
  const expectedManifest = input.manifestSha256;
  const { dispose, read: load, assertOpen: active } = createGoalBundleTransport(root, dependencies);
  let busy = false;
  try {
    const verified = manifest(await load('manifest.json', expectedManifest, MAX_MANIFEST_BYTES), phase);
    assertAdmitted();
    const entries = new Map(verified.artifacts.map((entry) => [entry.name, entry]));
    const consumed = new Set<string>();
    const summary = Object.freeze({
      kind: phase === 'training' ? 'goal-training-bundle-bytes-v1' : 'goal-validation-bundle-bytes-v1',
      phase,
      manifestSha256: expectedManifest,
      planSha256: verified.planSha256,
      requestSha256: verified.requestSha256,
      sourceSha256: verified.sourceSha256,
      files: entries.size,
      bytes: verified.artifacts.reduce((total, entry) => total + entry.bytes, 0),
    }) as GoalBundleReader<Phase>['summary'];
    return Object.freeze({
      summary,
      dispose,
      async read(name: string): Promise<Uint8Array> {
        try {
          active();
          assertAdmitted();
          check(!busy, 'concurrent-read');
          check(typeof name === 'string' && !consumed.has(name), 'artifact-read-once');
          const entry = entries.get(name);
          check(entry, 'artifact-unknown');
          busy = true;
          consumed.add(name);
          const result = await load(`objects/${entry.sha256}.bin`, entry.sha256, entry.bytes, entry.bytes);
          assertAdmitted();
          return result;
        } catch (error) {
          dispose();
          throw error instanceof BundleError ? error : new BundleError('unavailable');
        } finally {
          busy = false;
        }
      },
    });
  } catch (error) {
    dispose();
    throw error;
  }
}
