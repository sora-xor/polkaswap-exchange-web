/** Durable preregistration and access ordering for a trusted offline evaluator; never qualification authority. */
import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { link, lstat, mkdir, open, readdir, unlink } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import {
  GOAL_QUALIFICATION_PROTOCOL,
  GOAL_QUALIFICATION_PROTOCOL_V2,
  GOAL_QUALIFICATION_PROTOCOL_V3,
  goalQualificationPolicy,
  goalQualificationEvidenceProtocol,
  goalQualificationDigest as digest,
  readGoalQualificationBinding,
  type GoalQualificationCertificate,
  type GoalQualificationEpisodeEvidence,
  type GoalQualificationEvaluationRequest,
  type GoalQualificationPlan,
  type GoalQualificationRegistration,
  type GoalQualificationSelection,
} from '../../src/features/bot-trading/goal-qualification';
import { validateGoalQualificationArrivalModel } from '../../src/features/bot-trading/goal-qualification-clock';
import {
  readGoalTargetExecutionModel,
  goalTargetSourceRuntimeProfiles,
  isGoalCatalogTargetExecutionModel,
} from '../../src/features/bot-trading/goal-target-model';
import {
  assertGoalAcquisitionReplayPreparation,
  assertGoalAcquisitionReplayCompletion,
  type GoalAcquisitionReplayPreparation,
  type GoalAcquisitionReplayCompletion,
} from './goal-acquisition-replay';

const DAY = 86_400_000;
const SHA = /^[0-9a-f]{64}$/;
const SMALL_BYTES = 1024 * 1024;
const EVIDENCE_BYTES = 32 * 1024 * 1024;
type SelectionInput = Readonly<Omit<GoalQualificationSelection, 'sealSha256' | 'kind'>>;
export interface GoalStudyEvidenceReceipt {
  name: string;
  sha256: string;
  bytes: number;
}
export interface GoalStudyEvidenceSink {
  /** Request-scoped write-once storage; the returned digest covers the caller's exact detached own-data value. */
  retainEvidence(name: string, value: unknown): Promise<Readonly<GoalStudyEvidenceReceipt>>;
}
type Producer = (
  request: Readonly<GoalQualificationEvaluationRequest>,
  sink: GoalStudyEvidenceSink
) => Promise<GoalQualificationEpisodeEvidence>;
interface ValidationClaim {
  kind: 'goal-study-validation-claim-v1';
  planSha256: string;
  studyId: string;
  validationIdentitySha256: string;
  genesisHash: string;
  startAtMs: number;
  endAtMs: number;
  source: GoalQualificationPlan['source'];
}
interface RegistrationRecord {
  kind: 'goal-study-registration-v1';
  plan: GoalQualificationPlan;
  sourceSha256: string;
  registeredAt: string;
  registration: GoalQualificationRegistration;
}
interface AccessRecord {
  kind: 'goal-study-evaluation-access-v1';
  request: GoalQualificationEvaluationRequest;
  registrationSha256: string;
  selectionSha256: string | null;
  recordedAt: string;
}
interface CompletedRecord {
  kind: 'goal-study-evaluation-complete-v1';
  accessSha256: string;
  evidenceSha256: string;
  evidence: GoalQualificationEpisodeEvidence;
  rawEvidence: readonly GoalStudyEvidenceReceipt[];
  rawManifestSha256: string;
}
/** Trusted replay dependency, never a JSON flag or an alternate validation partition. */
export interface GoalStudyAcquisitionContinuation {
  preparation: GoalAcquisitionReplayPreparation;
  completedReplay(): GoalAcquisitionReplayCompletion;
}
interface ContinuationRecord {
  kind: 'goal-study-acquisition-continuation-v1';
  parentPlanSha256: string;
  parentRegistrationSha256: string;
  parentSourceSha256: string;
  parentRequestSha256: string;
  parentAccessSha256: string;
  parentFailedRecordSha256: string;
  parentRawManifestSha256: string;
  failedHttpStatus: number;
  childPlanSha256: string;
  childSourceSha256: string;
}
const fail = (reason: string): never => {
  throw new Error(`Goal qualification study store: ${reason}`);
};
function check(condition: unknown, reason: string): asserts condition {
  if (!condition) fail(reason);
}
const code = (error: unknown) => (error as NodeJS.ErrnoException)?.code;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
/** The shared digest rejects getters, non-data objects, unsafe numbers and oversized structures before copying. */
function snapshot<T>(value: T, maximumBytes = SMALL_BYTES): T {
  digest(value);
  const text = canonical(value);
  check(Buffer.byteLength(text) <= maximumBytes, 'record-too-large');
  return freeze(JSON.parse(text) as T);
}
/** Raw RPC metadata may exceed the qualification digest's 100k per-string cap; it remains bounded own-data. */
function rawSnapshot<T>(value: T, maximumBytes: number): T {
  let nodes = 0,
    stringBytes = 0;
  const visit = (item: unknown, depth: number): unknown => {
    check(++nodes <= 800000 && depth <= 24, 'raw-structure-limit');
    if (item === null || typeof item === 'boolean') return item;
    if (typeof item === 'number') {
      check(Number.isSafeInteger(item), 'raw-number');
      return item;
    }
    if (typeof item === 'string') {
      stringBytes += Buffer.byteLength(item);
      check(stringBytes <= maximumBytes, 'raw-string-limit');
      return item;
    }
    check(item && typeof item === 'object', 'raw-own-data');
    const descriptors = Object.getOwnPropertyDescriptors(item),
      keys = Reflect.ownKeys(descriptors);
    if (Array.isArray(item)) {
      check(
        Object.getPrototypeOf(item) === Array.prototype && item.length <= 30000 && keys.length === item.length + 1,
        'raw-array'
      );
      return Object.freeze(
        Array.from({ length: item.length }, (_, index) => {
          check(descriptors[index]?.enumerable && 'value' in descriptors[index], 'raw-array-data');
          return visit(descriptors[index].value, depth + 1);
        })
      );
    }
    check([Object.prototype, null].includes(Object.getPrototypeOf(item)) && keys.length <= 64, 'raw-object');
    return Object.freeze(
      Object.fromEntries(
        keys.map((key) => {
          check(typeof key === 'string' && descriptors[key].enumerable && 'value' in descriptors[key], 'raw-field');
          return [key, visit(descriptors[key].value, depth + 1)];
        })
      )
    );
  };
  const result = visit(value, 0) as T;
  check(Buffer.byteLength(canonical(result)) <= maximumBytes, 'record-too-large');
  return result;
}
const rawDigest = (ownValue: unknown) => createHash('sha256').update(canonical(ownValue), 'utf8').digest('hex');
function fields(value: object, expected: readonly string[]): void {
  check(
    Object.keys(value).length === expected.length && expected.every((key) => Object.hasOwn(value, key)),
    'invalid-fields'
  );
}
const equal = (a: unknown, b: unknown) => canonical(a) === canonical(b);
function validationClaim(plan: GoalQualificationPlan): ValidationClaim {
  return snapshot({
    kind: 'goal-study-validation-claim-v1',
    planSha256: digest(plan),
    studyId: plan.studyId,
    validationIdentitySha256: plan.validation.identitySha256,
    genesisHash: plan.candidates[0].genesisHash,
    startAtMs: plan.validation.startAtMs,
    endAtMs: plan.validation.endAtMs,
    source: plan.source,
  });
}
async function syncDirectory(directory: string): Promise<void> {
  const handle = await open(directory, constants.O_RDONLY);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}
async function ensureDirectory(directory: string): Promise<void> {
  try {
    await mkdir(directory, { mode: 0o700 });
  } catch (error) {
    if (code(error) !== 'EEXIST') throw error;
  }
  const info = await lstat(directory);
  check(info.isDirectory() && !info.isSymbolicLink(), 'not-owned-directory');
}
/** Publish only fully synced bytes using an atomic hard link which cannot replace an existing record. */
async function writeOnce(
  directory: string,
  name: string,
  value: unknown,
  maximumBytes = SMALL_BYTES,
  raw = false
): Promise<void> {
  const body = `${canonical((raw ? rawSnapshot : snapshot)(value, maximumBytes))}\n`;
  const temporary = join(directory, `.pending-${randomUUID()}`);
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(body);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await link(temporary, join(directory, name));
    await syncDirectory(directory);
  } finally {
    await unlink(temporary);
    await syncDirectory(directory);
  }
}
/** No symlink following, unbounded reads or automatic repair of malformed durable records. */
async function readRecord<T>(
  directory: string,
  name: string,
  maximumBytes = SMALL_BYTES,
  raw = false
): Promise<T | undefined> {
  let handle;
  try {
    handle = await open(join(directory, name), constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    if (code(error) === 'ENOENT') return;
    throw error;
  }
  try {
    const info = await handle.stat();
    check(info.isFile() && info.size > 0 && info.size <= maximumBytes + 1, 'invalid-record-size');
    const chunks: Buffer[] = [];
    let length = 0;
    for (;;) {
      const buffer = Buffer.alloc(64 * 1024);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (!bytesRead) break;
      length += bytesRead;
      check(length <= maximumBytes + 1, 'record-too-large');
      chunks.push(buffer.subarray(0, bytesRead));
    }
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(Buffer.concat(chunks));
    check(text.endsWith('\n'), 'incomplete-record');
    const value = (raw ? rawSnapshot : snapshot)(JSON.parse(text) as T, maximumBytes);
    check(text === `${canonical(value)}\n`, 'noncanonical-record');
    return value;
  } finally {
    await handle.close();
  }
}
function readPlan(
  input: Readonly<GoalQualificationPlan>,
  sourceSha256: string,
  protocol: GoalQualificationPlan['protocol']
): GoalQualificationPlan {
  const plan = snapshot(input);
  fields(plan, [
    'protocol',
    'studyId',
    'policy',
    'source',
    'runtimeProfiles',
    'arrivalModel',
    'training',
    'validation',
    'candidates',
    ...(protocol === GOAL_QUALIFICATION_PROTOCOL_V3 ? ['executionModel'] : []),
  ]);
  check(
    plan.protocol === protocol && equal(plan.policy, goalQualificationPolicy(protocol, plan.executionModel)),
    'plan-policy'
  );
  check(/^[A-Za-z0-9_-]{1,128}$/.test(plan.studyId), 'study-id');
  fields(plan.source, ['sourceId', 'manifestSha256', 'collectorSha256', 'evaluatorSha256']);
  check(/^[A-Za-z0-9_.:-]{1,128}$/.test(plan.source.sourceId), 'source-id');
  check(
    [plan.source.manifestSha256, plan.source.collectorSha256, plan.source.evaluatorSha256].every((value) =>
      SHA.test(value)
    ) && plan.source.evaluatorSha256 === sourceSha256,
    'source-binding'
  );
  validateGoalQualificationArrivalModel(plan.arrivalModel);
  const model =
    protocol === GOAL_QUALIFICATION_PROTOCOL_V3 ? readGoalTargetExecutionModel(plan.executionModel) : undefined;
  const catalogModel = model && isGoalCatalogTargetExecutionModel(model);
  check(plan.runtimeProfiles.length >= 1 && plan.runtimeProfiles.length <= (catalogModel ? 3 : 2), 'runtime-profiles');
  for (const profile of plan.runtimeProfiles) {
    fields(profile, ['specVersion', 'transactionVersion', 'metadataSha256', 'codeHash']);
    check(
      (catalogModel ? [128, 129, 130] : [130, 131]).includes(profile.specVersion) &&
        profile.transactionVersion === profile.specVersion &&
        SHA.test(profile.metadataSha256) &&
        /^0x[0-9a-f]{64}$/.test(profile.codeHash),
      'runtime-profile'
    );
  }
  check(new Set(plan.runtimeProfiles.map(digest)).size === plan.runtimeProfiles.length, 'duplicate-runtime');
  if (model) check(equal(plan.runtimeProfiles, goalTargetSourceRuntimeProfiles(model)), 'source-runtime-profile');
  for (const partition of [plan.training, plan.validation]) {
    fields(partition, ['identitySha256', 'startAtMs', 'endAtMs']);
    check(SHA.test(partition.identitySha256), 'partition-identity');
    check(
      Number.isSafeInteger(partition.startAtMs) &&
        Number.isSafeInteger(partition.endAtMs) &&
        partition.startAtMs >= 3_600_000 &&
        partition.startAtMs % 3_600_000 === 0 &&
        partition.endAtMs % 3_600_000 === 0,
      'partition-time'
    );
  }
  check(
    plan.training.endAtMs - plan.training.startAtMs === 116 * 3_600_000 &&
      plan.validation.startAtMs === plan.training.endAtMs + 2 * 3_600_000 &&
      plan.validation.endAtMs - plan.validation.startAtMs === 49 * 3_600_000 &&
      plan.training.identitySha256 !== plan.validation.identitySha256,
    'partition-window'
  );
  check(plan.candidates.length >= 1 && plan.candidates.length <= 3, 'candidate-count');
  plan.candidates.forEach(readGoalQualificationBinding);
  check(new Set(plan.candidates.map(digest)).size === plan.candidates.length, 'duplicate-candidate');
  const first = plan.candidates[0];
  check(
    plan.candidates.every(
      (candidate) =>
        candidate.genesisHash === first.genesisHash &&
        candidate.denominator === first.denominator &&
        candidate.initialKusdCodec === first.initialKusdCodec
    ),
    'candidate-allocation'
  );
  return plan;
}
function expectedRequest(
  plan: GoalQualificationPlan,
  candidateIndex: number,
  phase: 'training' | 'validation',
  episodeIndex: number
): GoalQualificationEvaluationRequest {
  const candidate = plan.candidates[candidateIndex];
  return snapshot({
    planSha256: digest(plan),
    candidate,
    candidateSha256: digest(candidate),
    phase,
    partitionIdentitySha256: plan[phase].identitySha256,
    startAtMs: plan[phase].startAtMs + episodeIndex * DAY,
    endAtMs: plan[phase].startAtMs + (episodeIndex + 1) * DAY,
    episodeIndex,
  });
}
function evidenceFor(
  request: GoalQualificationEvaluationRequest,
  value: GoalQualificationEpisodeEvidence,
  protocol: GoalQualificationPlan['protocol']
): GoalQualificationEpisodeEvidence {
  const evidence = snapshot(value, EVIDENCE_BYTES);
  fields(evidence, [
    'protocol',
    'requestSha256',
    'dataSha256',
    'opening',
    'clock',
    'terminal',
    'signals',
    'events',
    ...(protocol === GOAL_QUALIFICATION_PROTOCOL_V2 || protocol === GOAL_QUALIFICATION_PROTOCOL_V3
      ? ['deadlineCancellation']
      : []),
  ]);
  check(
    evidence.protocol === goalQualificationEvidenceProtocol(protocol) &&
      evidence.requestSha256 === digest(request) &&
      SHA.test(evidence.dataSha256),
    'evidence-binding'
  );
  check(
    evidence.opening.fundedAtMs === request.startAtMs && evidence.terminal.accountingAtMs === request.endAtMs,
    'evidence-window'
  );
  return evidence;
}

/** One configured authoritative root is required. Stale owner locks are never stolen or reset automatically. */
export function openGoalQualificationStudyStore(options: { directory: string; sourceSha256: string }) {
  return openStudyStore(options, GOAL_QUALIFICATION_PROTOCOL);
}
/** Explicit v2 journal, retaining the same authoritative root and overlap protections. */
export function openGoalQualificationStudyStoreV2(options: { directory: string; sourceSha256: string }) {
  return openStudyStore(options, GOAL_QUALIFICATION_PROTOCOL_V2);
}
/** Trusted V3 acquisition limits; omitted limits preserve the original journal behavior. */
export interface GoalQualificationStudyStoreV3Options {
  directory: string;
  sourceSha256: string;
  /** Aggregate exact canonical raw wrapper file bytes, including each final newline; at most 512 MiB. */
  maximumRawEvidenceBytesPerEpisode?: number;
}
/** Explicit v3 journal with an optional lower publication capacity bound and unchanged economic semantics. */
export function openGoalQualificationStudyStoreV3(options: GoalQualificationStudyStoreV3Options) {
  return openStudyStore(options, GOAL_QUALIFICATION_PROTOCOL_V3);
}
/**
 * Add a source-bound acquisition continuation after an unavailable first training episode.
 * Original claims and failed records stay unchanged; an owned exact-prefix replay is mandatory.
 */
export function openGoalQualificationStudyContinuationV2(
  options: { directory: string; sourceSha256: string },
  continuation: GoalStudyAcquisitionContinuation
) {
  return openStudyStore(options, GOAL_QUALIFICATION_PROTOCOL_V2, continuationDependency(continuation));
}
/** Validate trusted own-data dependencies without invoking caller accessors or cloning owned preparation. */
function continuationDependency(continuation: GoalStudyAcquisitionContinuation): GoalStudyAcquisitionContinuation {
  check(continuation && Object.getPrototypeOf(continuation) === Object.prototype, 'continuation-dependency');
  const descriptors = Object.getOwnPropertyDescriptors(continuation);
  check(
    Reflect.ownKeys(descriptors).length === 2 &&
      ['preparation', 'completedReplay'].every((key) => descriptors[key]?.enumerable && 'value' in descriptors[key]) &&
      typeof descriptors.completedReplay.value === 'function',
    'continuation-dependency'
  );
  assertGoalAcquisitionReplayPreparation(descriptors.preparation.value);
  return {
    preparation: descriptors.preparation.value,
    completedReplay: descriptors.completedReplay.value,
  };
}
/**
 * Reverify existing v2 records under the ordinary exclusive owner lock. Only that temporary lock is
 * written; missing directories, registration, selection or completion are never created or repaired.
 * Continuations retain their original owned preparation and lineage checks but cannot invoke producers.
 */
export function openGoalQualificationStudyReplayV2(
  options: { directory: string; sourceSha256: string },
  continuation?: GoalStudyAcquisitionContinuation
) {
  return openStudyStore(
    options,
    GOAL_QUALIFICATION_PROTOCOL_V2,
    continuation === undefined ? undefined : continuationDependency(continuation),
    true
  );
}
/** Reverify existing v3 records without invoking producers or changing records; no v3 continuation is supported. */
export function openGoalQualificationStudyReplayV3(options: { directory: string; sourceSha256: string }) {
  return openStudyStore(options, GOAL_QUALIFICATION_PROTOCOL_V3, undefined, true);
}
async function openStudyStore(
  options: GoalQualificationStudyStoreV3Options,
  protocol: GoalQualificationPlan['protocol'],
  continuation?: GoalStudyAcquisitionContinuation,
  readOnly = false
) {
  const input = snapshot(options);
  const limited =
    protocol === GOAL_QUALIFICATION_PROTOCOL_V3 &&
    !readOnly &&
    Object.hasOwn(input, 'maximumRawEvidenceBytesPerEpisode');
  fields(input, ['directory', 'sourceSha256', ...(limited ? ['maximumRawEvidenceBytesPerEpisode'] : [])]);
  const maximumRawEvidenceBytesPerEpisode = limited ? input.maximumRawEvidenceBytesPerEpisode : undefined;
  if (limited)
    check(
      Number.isSafeInteger(maximumRawEvidenceBytesPerEpisode) &&
        maximumRawEvidenceBytesPerEpisode! > 0 &&
        maximumRawEvidenceBytesPerEpisode! <= 512 * 1024 * 1024,
      'raw-byte-limit-option'
    );
  check(isAbsolute(input.directory) && SHA.test(input.sourceSha256), 'store-options');
  const studies = join(input.directory, 'studies'),
    ids = join(input.directory, 'study-ids'),
    partitions = join(input.directory, 'validation-partitions');
  if (readOnly) {
    for (const directory of [input.directory, studies, ids, partitions]) {
      const info = await lstat(directory);
      check(info.isDirectory() && !info.isSymbolicLink(), 'not-owned-directory');
    }
  } else await ensureDirectory(input.directory);
  const owner = snapshot({ kind: 'goal-study-owner-v1', pid: process.pid, token: randomUUID() });
  await writeOnce(input.directory, 'owner.json', owner);
  let closed = false,
    active = false,
    ioFailed = false;
  let activeDone = Promise.resolve();
  let disposal: Promise<void> | undefined;
  try {
    if (!readOnly) for (const directory of [studies, ids, partitions]) await ensureDirectory(directory);
    await syncDirectory(input.directory);
  } catch (error) {
    await unlink(join(input.directory, 'owner.json'));
    await syncDirectory(input.directory);
    throw error;
  }
  async function operation<T>(run: () => Promise<T>): Promise<T> {
    check(!closed && !ioFailed, 'store-closed');
    check(!active, 'concurrent-operation');
    active = true;
    let finish!: () => void;
    activeDone = new Promise<void>((resolve) => {
      finish = resolve;
    });
    try {
      check(equal(await readRecord(input.directory, 'owner.json'), owner), 'ownership-lost');
      const result = await run();
      check(!closed, 'store-closed');
      return result;
    } finally {
      active = false;
      finish();
    }
  }
  async function persist(directory: string, name: string, value: unknown, maximumBytes = SMALL_BYTES, raw = false) {
    check(!readOnly, 'read-only-study');
    try {
      await writeOnce(directory, name, value, maximumBytes, raw);
    } catch (error) {
      ioFailed = true;
      throw error;
    }
  }
  /** Verify the unchanged parent and the original exclusive claim on every lineage-sensitive operation. */
  async function continuationParent() {
    check(continuation, 'continuation-required');
    assertGoalAcquisitionReplayPreparation(continuation.preparation);
    const binding = continuation.preparation.bindings;
    const directory = join(studies, binding.parentPlanSha256);
    const record = await readRecord<RegistrationRecord>(directory, 'registration.json');
    check(record?.kind === 'goal-study-registration-v1', 'continuation-parent-registration');
    fields(record, ['kind', 'plan', 'sourceSha256', 'registeredAt', 'registration']);
    const plan = readPlan(record.plan, binding.parentSourceSha256, protocol);
    check(
      digest(plan) === binding.parentPlanSha256 && record.sourceSha256 === binding.parentSourceSha256,
      'continuation-parent-source'
    );
    const expected = expectedRequest(plan, 0, 'training', 0);
    check(digest(expected) === binding.requestSha256, 'continuation-first-training-only');
    const access = await readRecord<AccessRecord>(directory, `access-${binding.requestSha256}.json`);
    const failed = await readRecord<{ kind: string; requestSha256: string; accessSha256: string }>(
      directory,
      `failed-${binding.requestSha256}.json`
    );
    check(access && failed, 'continuation-parent-failure');
    fields(access, ['kind', 'request', 'registrationSha256', 'selectionSha256', 'recordedAt']);
    fields(failed, ['kind', 'requestSha256', 'accessSha256']);
    check(
      access.kind === 'goal-study-evaluation-access-v1' &&
        equal(access.request, expected) &&
        access.selectionSha256 === null &&
        access.registrationSha256 === record.registration.registrationSha256 &&
        digest(access) === binding.accessSha256 &&
        failed.kind === 'goal-study-evaluation-failed-v1' &&
        failed.requestSha256 === binding.requestSha256 &&
        failed.accessSha256 === digest(access) &&
        digest(failed) === binding.failedRecordSha256 &&
        [502, 503, 504].includes(binding.failedHttpStatus),
      'continuation-parent-failure-binding'
    );
    const allowed = new Set([
      'registration.json',
      `access-${binding.requestSha256}.json`,
      `failed-${binding.requestSha256}.json`,
      `raw-${binding.requestSha256}`,
      'continuation-child.json',
    ]);
    check(
      (await readdir(directory)).every((name) => allowed.has(name)),
      'continuation-parent-exposed-or-completed'
    );
    const rawNames = await readdir(join(directory, `raw-${binding.requestSha256}`));
    check(
      rawNames.length === continuation.preparation.inspection.rawEnvelopes &&
        rawNames.every((name) => /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.json$/.test(name)),
      'continuation-parent-raw-inventory'
    );
    const claim = validationClaim(plan);
    check(
      equal(await readRecord(ids, `${plan.studyId}.json`), claim) &&
        equal(await readRecord(partitions, `${plan.validation.identitySha256}.json`), claim),
      'continuation-original-claim'
    );
    const registrationBody = {
      kind: record.kind,
      sourceSha256: record.sourceSha256,
      registeredAt: record.registeredAt,
      planSha256: digest(plan),
      trainingIdentitySha256: plan.training.identitySha256,
      validationIdentitySha256: plan.validation.identitySha256,
    };
    check(
      equal(record.registration, {
        kind: 'preregistered-unopened-validation',
        planSha256: digest(plan),
        registrationSha256: digest(registrationBody),
        trainingIdentitySha256: plan.training.identitySha256,
        validationIdentitySha256: plan.validation.identitySha256,
      }),
      'continuation-parent-registration-corrupt'
    );
    return { directory, record, binding };
  }
  async function continuationRecord(plan: GoalQualificationPlan): Promise<ContinuationRecord> {
    const parent = await continuationParent();
    const expected = snapshot({
      ...parent.record.plan,
      source: {
        ...parent.record.plan.source,
        evaluatorSha256: input.sourceSha256,
      },
    });
    check(
      input.sourceSha256 !== parent.binding.parentSourceSha256 && equal(plan, expected),
      'continuation-changed-economics'
    );
    return snapshot({
      kind: 'goal-study-acquisition-continuation-v1',
      parentPlanSha256: parent.binding.parentPlanSha256,
      parentRegistrationSha256: parent.record.registration.registrationSha256,
      parentSourceSha256: parent.binding.parentSourceSha256,
      parentRequestSha256: parent.binding.requestSha256,
      parentAccessSha256: parent.binding.accessSha256,
      parentFailedRecordSha256: parent.binding.failedRecordSha256,
      parentRawManifestSha256: parent.binding.rawManifestSha256,
      failedHttpStatus: parent.binding.failedHttpStatus,
      childPlanSha256: digest(plan),
      childSourceSha256: input.sourceSha256,
    });
  }
  /**
   * Read metadata belonging to an earlier claim, under its own supported protocol and source.
   * This never grants execution/replay authority and never opens raw evidence or completion traces.
   */
  async function priorRegistration(planSha256: string, lineage?: ContinuationRecord) {
    check(SHA.test(planSha256), 'prior-plan-digest');
    const directory = join(studies, planSha256);
    const record = await readRecord<RegistrationRecord>(directory, 'registration.json');
    check(record?.kind === 'goal-study-registration-v1', 'prior-registration');
    fields(record, ['kind', 'plan', 'sourceSha256', 'registeredAt', 'registration']);
    check(
      SHA.test(record.sourceSha256) &&
        typeof record.registeredAt === 'string' &&
        Number.isSafeInteger(Date.parse(record.registeredAt)) &&
        (record.plan.protocol === GOAL_QUALIFICATION_PROTOCOL ||
          record.plan.protocol === GOAL_QUALIFICATION_PROTOCOL_V2 ||
          record.plan.protocol === GOAL_QUALIFICATION_PROTOCOL_V3),
      'prior-source-protocol'
    );
    const plan = readPlan(record.plan, record.sourceSha256, record.plan.protocol);
    check(digest(plan) === planSha256, 'prior-plan-binding');
    check(
      equal(record.registration, {
        kind: 'preregistered-unopened-validation',
        planSha256,
        registrationSha256: digest({
          kind: record.kind,
          sourceSha256: record.sourceSha256,
          registeredAt: record.registeredAt,
          ...(lineage ? { continuationSha256: digest(lineage) } : {}),
          planSha256,
          trainingIdentitySha256: plan.training.identitySha256,
          validationIdentitySha256: plan.validation.identitySha256,
        }),
        trainingIdentitySha256: plan.training.identitySha256,
        validationIdentitySha256: plan.validation.identitySha256,
      }),
      'prior-registration-corrupt'
    );
    return { directory, record, plan };
  }
  /** Honor the unchanged original claim, including any recorded single-child continuation lineage. */
  async function priorClaim(planSha256: string) {
    const parent = await priorRegistration(planSha256);
    const claim = validationClaim(parent.plan);
    check(
      equal(await readRecord(ids, `${parent.plan.studyId}.json`), claim) &&
        equal(await readRecord(partitions, `${parent.plan.validation.identitySha256}.json`), claim) &&
        !(await readRecord(parent.directory, 'continuation.json')),
      'prior-registration-claim'
    );
    const lineage = await readRecord<ContinuationRecord>(parent.directory, 'continuation-child.json');
    if (lineage) {
      fields(lineage, [
        'kind',
        'parentPlanSha256',
        'parentRegistrationSha256',
        'parentSourceSha256',
        'parentRequestSha256',
        'parentAccessSha256',
        'parentFailedRecordSha256',
        'parentRawManifestSha256',
        'failedHttpStatus',
        'childPlanSha256',
        'childSourceSha256',
      ]);
      for (const key of [
        'parentPlanSha256',
        'parentRegistrationSha256',
        'parentSourceSha256',
        'parentRequestSha256',
        'parentAccessSha256',
        'parentFailedRecordSha256',
        'parentRawManifestSha256',
        'childPlanSha256',
        'childSourceSha256',
      ] as const)
        check(SHA.test(lineage[key]), 'prior-lineage-digest');
      const expected = expectedRequest(parent.plan, 0, 'training', 0);
      check(
        parent.plan.protocol === GOAL_QUALIFICATION_PROTOCOL_V2 &&
          lineage.kind === 'goal-study-acquisition-continuation-v1' &&
          lineage.parentPlanSha256 === planSha256 &&
          lineage.parentRegistrationSha256 === parent.record.registration.registrationSha256 &&
          lineage.parentSourceSha256 === parent.record.sourceSha256 &&
          lineage.parentRequestSha256 === digest(expected) &&
          lineage.childSourceSha256 !== lineage.parentSourceSha256 &&
          lineage.childPlanSha256 !== planSha256 &&
          [502, 503, 504].includes(lineage.failedHttpStatus),
        'prior-lineage-binding'
      );
      const child = await priorRegistration(lineage.childPlanSha256, lineage);
      check(
        child.record.sourceSha256 === lineage.childSourceSha256 &&
          equal(child.plan, {
            ...parent.plan,
            source: {
              ...parent.plan.source,
              evaluatorSha256: lineage.childSourceSha256,
            },
          }) &&
          equal(await readRecord(child.directory, 'continuation.json'), lineage) &&
          !(await readRecord(child.directory, 'continuation-child.json')),
        'prior-continuation-lineage'
      );
      const access = await readRecord<AccessRecord>(parent.directory, `access-${lineage.parentRequestSha256}.json`);
      const failed = await readRecord<{ kind: string; requestSha256: string; accessSha256: string }>(
        parent.directory,
        `failed-${lineage.parentRequestSha256}.json`
      );
      check(access && failed, 'prior-continuation-failure');
      fields(access, ['kind', 'request', 'registrationSha256', 'selectionSha256', 'recordedAt']);
      fields(failed, ['kind', 'requestSha256', 'accessSha256']);
      check(
        access.kind === 'goal-study-evaluation-access-v1' &&
          equal(access.request, expected) &&
          access.selectionSha256 === null &&
          access.registrationSha256 === parent.record.registration.registrationSha256 &&
          digest(access) === lineage.parentAccessSha256 &&
          failed.kind === 'goal-study-evaluation-failed-v1' &&
          failed.requestSha256 === lineage.parentRequestSha256 &&
          failed.accessSha256 === digest(access) &&
          digest(failed) === lineage.parentFailedRecordSha256,
        'prior-continuation-failure-binding'
      );
      const allowed = new Set([
        'registration.json',
        `access-${lineage.parentRequestSha256}.json`,
        `failed-${lineage.parentRequestSha256}.json`,
        `raw-${lineage.parentRequestSha256}`,
        'continuation-child.json',
      ]);
      check(
        (await readdir(parent.directory)).every((name) => allowed.has(name)),
        'prior-continuation-parent-state'
      );
    }
    return claim;
  }
  async function registration(planSha256: string): Promise<{ directory: string; record: RegistrationRecord }> {
    check(SHA.test(planSha256), 'plan-digest');
    const directory = join(studies, planSha256);
    const record = await readRecord<RegistrationRecord>(directory, 'registration.json');
    check(record?.kind === 'goal-study-registration-v1', 'unregistered-study');
    fields(record, ['kind', 'plan', 'sourceSha256', 'registeredAt', 'registration']);
    const plan = readPlan(record.plan, input.sourceSha256, protocol);
    check(digest(plan) === planSha256 && record.sourceSha256 === input.sourceSha256, 'registration-binding');
    const result = record.registration;
    const lineage = continuation ? await continuationRecord(plan) : undefined;
    const body = {
      kind: record.kind,
      sourceSha256: record.sourceSha256,
      registeredAt: record.registeredAt,
      ...(lineage ? { continuationSha256: digest(lineage) } : {}),
    };
    check(
      equal(result, {
        kind: 'preregistered-unopened-validation',
        planSha256,
        registrationSha256: digest({
          ...body,
          planSha256,
          trainingIdentitySha256: plan.training.identitySha256,
          validationIdentitySha256: plan.validation.identitySha256,
        }),
        trainingIdentitySha256: plan.training.identitySha256,
        validationIdentitySha256: plan.validation.identitySha256,
      }),
      'registration-corrupt'
    );
    if (lineage) {
      check(
        equal(await readRecord(directory, 'continuation.json'), lineage) &&
          equal(await readRecord(join(studies, lineage.parentPlanSha256), 'continuation-child.json'), lineage),
        'continuation-lineage'
      );
    } else {
      const claim = validationClaim(plan);
      check(
        equal(await readRecord(ids, `${plan.studyId}.json`), claim) &&
          equal(await readRecord(partitions, `${plan.validation.identitySha256}.json`), claim),
        'registration-claim'
      );
    }
    return { directory, record };
  }
  async function completed(
    directory: string,
    request: GoalQualificationEvaluationRequest
  ): Promise<CompletedRecord | undefined> {
    const id = digest(request),
      access = await readRecord<AccessRecord>(directory, `access-${id}.json`);
    const value = await readRecord<CompletedRecord>(directory, `complete-${id}.json`, EVIDENCE_BYTES);
    check(!(await readRecord(directory, `failed-${id}.json`)), 'failed-evaluation-no-retry');
    if (!access) {
      check(!value, 'completion-without-access');
      return;
    }
    fields(access, ['kind', 'request', 'registrationSha256', 'selectionSha256', 'recordedAt']);
    check(access.kind === 'goal-study-evaluation-access-v1' && equal(access.request, request), 'access-binding');
    const reg = await readRecord<RegistrationRecord>(directory, 'registration.json');
    const selection =
      request.phase === 'validation'
        ? await readRecord<GoalQualificationSelection>(directory, 'selection.json')
        : undefined;
    check(
      access.registrationSha256 === reg?.registration.registrationSha256 &&
        access.selectionSha256 === (selection?.sealSha256 ?? null),
      'access-seal-binding'
    );
    check(value, 'incomplete-evaluation-no-retry');
    fields(value, ['kind', 'accessSha256', 'evidenceSha256', 'evidence', 'rawEvidence', 'rawManifestSha256']);
    check(
      value.kind === 'goal-study-evaluation-complete-v1' &&
        value.accessSha256 === digest(access) &&
        value.evidenceSha256 === digest(value.evidence),
      'completion-corrupt'
    );
    check(value.rawEvidence.length <= 16000 && value.rawManifestSha256 === digest(value.rawEvidence), 'raw-manifest');
    const rawDirectory = join(directory, `raw-${id}`),
      names = new Set(await readdir(rawDirectory));
    check(names.size === value.rawEvidence.length, 'raw-file-count');
    let previousName = '',
      rawBytes = 0;
    for (const receipt of value.rawEvidence) {
      fields(receipt, ['name', 'sha256', 'bytes']);
      check(
        /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(receipt.name) &&
          receipt.name > previousName &&
          SHA.test(receipt.sha256) &&
          Number.isSafeInteger(receipt.bytes) &&
          receipt.bytes > 0 &&
          receipt.bytes <= EVIDENCE_BYTES,
        'raw-receipt'
      );
      previousName = receipt.name;
      rawBytes += receipt.bytes;
      check(rawBytes <= 512 * 1024 * 1024 && names.has(`${receipt.name}.json`), 'raw-byte-limit');
      const raw = await readRecord<{
        kind: string;
        requestSha256: string;
        name: string;
        sha256: string;
        value: unknown;
      }>(rawDirectory, `${receipt.name}.json`, EVIDENCE_BYTES, true);
      check(raw, 'raw-evidence-missing');
      fields(raw, ['kind', 'requestSha256', 'name', 'sha256', 'value']);
      check(
        raw.kind === 'goal-study-raw-evidence-v1' &&
          raw.requestSha256 === id &&
          raw.name === receipt.name &&
          raw.sha256 === receipt.sha256 &&
          rawDigest(raw.value) === receipt.sha256 &&
          Buffer.byteLength(canonical(raw.value)) === receipt.bytes,
        'raw-evidence-corrupt'
      );
    }
    evidenceFor(request, value.evidence, protocol);
    return value;
  }
  async function trainingComplete(directory: string, plan: GoalQualificationPlan): Promise<void> {
    for (let candidate = 0; candidate < plan.candidates.length; candidate++)
      for (let episode = 0; episode < 4; episode++)
        check(await completed(directory, expectedRequest(plan, candidate, 'training', episode)), 'training-incomplete');
  }
  async function readSelection(
    directory: string,
    record: RegistrationRecord
  ): Promise<GoalQualificationSelection | undefined> {
    const selection = await readRecord<GoalQualificationSelection>(directory, 'selection.json');
    if (!selection) return;
    fields(selection, [
      'kind',
      'registrationSha256',
      'candidateSha256',
      'trainingSha256',
      'validationIdentitySha256',
      'sealSha256',
    ]);
    const { kind, sealSha256, ...body } = selection;
    check(
      kind === 'selection-sealed-before-validation' &&
        SHA.test(body.trainingSha256) &&
        body.registrationSha256 === record.registration.registrationSha256 &&
        body.validationIdentitySha256 === record.plan.validation.identitySha256 &&
        record.plan.candidates.some((candidate) => digest(candidate) === body.candidateSha256) &&
        sealSha256 === digest({ kind: 'goal-study-selection-v1', planSha256: digest(record.plan), ...body }),
      'selection-corrupt'
    );
    return selection;
  }
  return Object.freeze({
    /** Registration is durable before any producer can access training. Identical existing registration is replayed. */
    register(planInput: Readonly<GoalQualificationPlan>, restoredInput?: Readonly<GoalQualificationCertificate>) {
      const plan = readPlan(planInput, input.sourceSha256, protocol),
        restored = restoredInput === undefined ? undefined : snapshot(restoredInput, EVIDENCE_BYTES);
      return operation(async () => {
        const id = digest(plan),
          directory = join(studies, id);
        const existing = await readRecord<RegistrationRecord>(directory, 'registration.json');
        if (existing) {
          const current = await registration(id);
          check(equal(current.record.plan, plan), 'changed-plan');
          if (restored)
            check(
              equal(restored.plan, plan) && equal(restored.registration, current.record.registration),
              'restored-registration'
            );
          return current.record.registration;
        }
        check(!readOnly, 'replay-registration-missing');
        check(!restored, 'missing-restored-study');
        if (continuation) {
          const lineage = await continuationRecord(plan);
          const parentDirectory = join(studies, lineage.parentPlanSha256);
          check(!(await readRecord(parentDirectory, 'continuation-child.json')), 'continuation-already-claimed');
          await ensureDirectory(directory);
          check((await readdir(directory)).length === 0, 'incomplete-registration');
          await syncDirectory(studies);
          // Append lineage under the original claim; neither the original registration nor failed records change.
          await persist(directory, 'continuation.json', lineage);
          await persist(parentDirectory, 'continuation-child.json', lineage);
          const body = {
            kind: 'goal-study-registration-v1' as const,
            sourceSha256: input.sourceSha256,
            registeredAt: new Date().toISOString(),
          };
          const result: GoalQualificationRegistration = {
            kind: 'preregistered-unopened-validation',
            planSha256: id,
            registrationSha256: digest({
              ...body,
              continuationSha256: digest(lineage),
              planSha256: id,
              trainingIdentitySha256: plan.training.identitySha256,
              validationIdentitySha256: plan.validation.identitySha256,
            }),
            trainingIdentitySha256: plan.training.identitySha256,
            validationIdentitySha256: plan.validation.identitySha256,
          };
          await persist(directory, 'registration.json', { ...body, plan, registration: result });
          return snapshot(result);
        }
        check(
          !(await readRecord(ids, `${plan.studyId}.json`)) &&
            !(await readRecord(partitions, `${plan.validation.identitySha256}.json`)),
          'study-or-partition-already-claimed'
        );
        const claims = await readdir(partitions);
        check(claims.length < 1024, 'claim-limit');
        for (const file of claims) {
          check(/^[0-9a-f]{64}\.json$/.test(file), 'unexpected-claim-record');
          const prior = await readRecord<ValidationClaim>(partitions, file);
          check(
            prior?.kind === 'goal-study-validation-claim-v1' && SHA.test(prior.planSha256),
            'invalid-validation-claim'
          );
          const verifiedClaim = await priorClaim(prior.planSha256);
          check(
            file === `${verifiedClaim.validationIdentitySha256}.json` && equal(prior, verifiedClaim),
            'claim-corrupt'
          );
          // Same-chain market intervals remain exposed even when a caller renames its source or partition.
          check(
            prior.genesisHash !== plan.candidates[0].genesisHash ||
              prior.endAtMs <= plan.validation.startAtMs ||
              prior.startAtMs >= plan.validation.endAtMs,
            'overlapping-validation'
          );
        }
        await ensureDirectory(directory);
        check((await readdir(directory)).length === 0, 'incomplete-registration');
        await syncDirectory(studies);
        const claim = validationClaim(plan);
        await persist(ids, `${plan.studyId}.json`, claim);
        await persist(partitions, `${plan.validation.identitySha256}.json`, claim);
        const body = {
          kind: 'goal-study-registration-v1' as const,
          sourceSha256: input.sourceSha256,
          registeredAt: new Date().toISOString(),
        };
        const result: GoalQualificationRegistration = {
          kind: 'preregistered-unopened-validation',
          planSha256: id,
          registrationSha256: digest({
            ...body,
            planSha256: id,
            trainingIdentitySha256: plan.training.identitySha256,
            validationIdentitySha256: plan.validation.identitySha256,
          }),
          trainingIdentitySha256: plan.training.identitySha256,
          validationIdentitySha256: plan.validation.identitySha256,
        };
        await persist(directory, 'registration.json', { ...body, plan, registration: result });
        return snapshot(result);
      });
    },
    /** The boundary supplies its exact training-summary digest; this journal enforces completeness and write ordering. */
    sealSelection(selectionInput: SelectionInput, restoredInput?: Readonly<GoalQualificationSelection>) {
      const selection = snapshot(selectionInput),
        restored = restoredInput === undefined ? undefined : snapshot(restoredInput);
      fields(selection, ['registrationSha256', 'candidateSha256', 'trainingSha256', 'validationIdentitySha256']);
      check(
        Object.values(selection).every((value) => SHA.test(value)),
        'selection-input'
      );
      return operation(async () => {
        const claim = await readRecord<{ planSha256: string }>(
          partitions,
          `${selection.validationIdentitySha256}.json`
        );
        check(claim, 'unregistered-partition');
        const child = continuation
          ? await readRecord<ContinuationRecord>(join(studies, claim.planSha256), 'continuation-child.json')
          : undefined;
        check(!continuation || child, 'continuation-lineage');
        const { directory, record } = await registration(child?.childPlanSha256 ?? claim.planSha256);
        check(
          selection.registrationSha256 === record.registration.registrationSha256 &&
            record.plan.candidates.some((candidate) => digest(candidate) === selection.candidateSha256),
          'selection-binding'
        );
        await trainingComplete(directory, record.plan);
        const result: GoalQualificationSelection = {
          ...selection,
          kind: 'selection-sealed-before-validation',
          sealSha256: digest({ kind: 'goal-study-selection-v1', planSha256: digest(record.plan), ...selection }),
        };
        const existing = await readSelection(directory, record);
        if (existing) check(equal(existing, result), 'changed-selection');
        else {
          check(!readOnly, 'replay-selection-missing');
          check(!restored, 'missing-restored-selection');
          await persist(directory, 'selection.json', result);
        }
        if (restored) check(equal(restored, result), 'restored-selection');
        return snapshot(result);
      });
    },
    /** A synced access marker precedes producer invocation; complete immutable traces replay without reopening data. */
    evaluate(
      requestInput: Readonly<GoalQualificationEvaluationRequest>,
      selectionInput: Readonly<GoalQualificationSelection> | undefined,
      producer: Producer
    ) {
      const request = snapshot(requestInput),
        selection = selectionInput === undefined ? undefined : snapshot(selectionInput);
      check(typeof producer === 'function', 'producer-required');
      return operation(async () => {
        const { directory, record } = await registration(request.planSha256),
          plan = record.plan;
        check(request.phase === 'training' || request.phase === 'validation', 'request-phase');
        const candidate = plan.candidates.findIndex((item) => digest(item) === request.candidateSha256);
        check(
          candidate >= 0 &&
            Number.isSafeInteger(request.episodeIndex) &&
            request.episodeIndex >= 0 &&
            request.episodeIndex < (request.phase === 'training' ? 4 : 2),
          'request-candidate-episode'
        );
        check(equal(request, expectedRequest(plan, candidate, request.phase, request.episodeIndex)), 'request-binding');
        const sealed = await readSelection(directory, record);
        if (request.phase === 'validation') {
          check(
            sealed && selection && equal(sealed, selection) && sealed.candidateSha256 === request.candidateSha256,
            'unsealed-validation'
          );
          await trainingComplete(directory, plan);
        } else check(!selection, 'training-selection');
        const prior = await completed(directory, request);
        if (prior) return prior.evidence;
        check(!readOnly, 'replay-completion-missing');
        if (request.phase === 'training') {
          check(!sealed, 'training-after-selection');
          for (let c = 0; c <= candidate; c++)
            for (let episode = 0; episode < (c === candidate ? request.episodeIndex : 4); episode++)
              check(await completed(directory, expectedRequest(plan, c, 'training', episode)), 'training-order');
        } else if (request.episodeIndex === 1)
          check(await completed(directory, expectedRequest(plan, candidate, 'validation', 0)), 'validation-order');
        const id = digest(request),
          access: AccessRecord = {
            kind: 'goal-study-evaluation-access-v1',
            request,
            registrationSha256: record.registration.registrationSha256,
            selectionSha256: sealed?.sealSha256 ?? null,
            recordedAt: new Date().toISOString(),
          };
        await persist(directory, `access-${id}.json`, access);
        const rawDirectory = join(directory, `raw-${id}`);
        await ensureDirectory(rawDirectory);
        await syncDirectory(directory);
        let sinkOpen = true,
          sinkFailed = false,
          rawBytes = 0,
          rawFileBytes = 0;
        const rawEvidence: GoalStudyEvidenceReceipt[] = [],
          rawNames = new Set<string>();
        const rawWrites: Promise<Readonly<GoalStudyEvidenceReceipt>>[] = [];
        const sink: GoalStudyEvidenceSink = Object.freeze({
          retainEvidence(name: string, value: unknown) {
            let ownValue: unknown, receipt: GoalStudyEvidenceReceipt;
            let envelope: Readonly<{
              kind: 'goal-study-raw-evidence-v1';
              requestSha256: string;
              name: string;
              sha256: string;
              value: unknown;
            }>;
            try {
              check(sinkOpen && !closed && !ioFailed, 'evidence-sink-closed');
              check(
                typeof name === 'string' &&
                  /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(name) &&
                  !rawNames.has(name) &&
                  rawNames.size < 16000,
                'evidence-name'
              );
              ownValue = rawSnapshot(value, EVIDENCE_BYTES - 1024);
              receipt = { name, sha256: rawDigest(ownValue), bytes: Buffer.byteLength(canonical(ownValue)) };
              check(rawBytes + receipt.bytes <= 512 * 1024 * 1024, 'raw-byte-limit');
              envelope = Object.freeze({
                kind: 'goal-study-raw-evidence-v1',
                requestSha256: id,
                name,
                sha256: receipt.sha256,
                value: ownValue,
              });
              if (maximumRawEvidenceBytesPerEpisode !== undefined) {
                const fileBytes = Buffer.byteLength(canonical(envelope)) + 1;
                check(rawFileBytes + fileBytes <= maximumRawEvidenceBytesPerEpisode, 'raw-file-byte-limit');
                // Reserve before the first await so concurrent writes share the same finite allowance.
                rawFileBytes += fileBytes;
              }
              rawNames.add(name);
              rawBytes += receipt.bytes;
            } catch (error) {
              sinkFailed = true;
              return Promise.reject(error);
            }
            const pending = (async () => {
              await persist(rawDirectory, `${name}.json`, envelope, EVIDENCE_BYTES, true);
              rawEvidence.push(receipt);
              check(!closed, 'evidence-sink-closed');
              return snapshot(receipt);
            })();
            rawWrites.push(pending);
            void pending.catch(() => {
              sinkFailed = true;
            });
            return pending;
          },
        });
        try {
          const evidence = evidenceFor(request, await producer(request, sink), protocol);
          if (continuation && request.phase === 'training' && candidate === 0 && request.episodeIndex === 0) {
            assertGoalAcquisitionReplayCompletion(continuation.completedReplay(), continuation.preparation.bindings);
          }
          sinkOpen = false;
          await Promise.allSettled(rawWrites);
          check(!sinkFailed, 'evidence-retention-failed');
          rawEvidence.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
          await persist(
            directory,
            `complete-${id}.json`,
            {
              kind: 'goal-study-evaluation-complete-v1',
              accessSha256: digest(access),
              evidenceSha256: digest(evidence),
              evidence,
              rawEvidence,
              rawManifestSha256: digest(rawEvidence),
            },
            EVIDENCE_BYTES
          );
          return evidence;
        } catch {
          sinkOpen = false;
          await Promise.allSettled(rawWrites);
          if (!ioFailed)
            await persist(directory, `failed-${id}.json`, {
              kind: 'goal-study-evaluation-failed-v1',
              requestSha256: id,
              accessSha256: digest(access),
            });
          return fail('evaluation-failed-no-retry');
        }
      });
    },
    /** Stop admitting work immediately, finish durable bookkeeping, then remove only this owner's lock. */
    dispose(): Promise<void> {
      if (disposal) return disposal;
      closed = true;
      disposal = (async () => {
        await activeDone;
        check(equal(await readRecord(input.directory, 'owner.json'), owner), 'ownership-lost');
        await unlink(join(input.directory, 'owner.json'));
        await syncDirectory(input.directory);
      })();
      return disposal;
    },
  });
}
