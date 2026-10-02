/** Read-only completed-study journal replay through the unchanged qualification boundary. */
import {
  createGoalQualificationBoundaryV2,
  createGoalQualificationBoundaryV3,
  GOAL_QUALIFICATION_PROTOCOL_V2,
  GOAL_QUALIFICATION_PROTOCOL_V3,
  goalQualificationEvidenceProtocol,
  goalQualificationDigest,
  type GoalQualificationCertificate,
  type GoalQualificationEpisodeEvidence,
  type GoalQualificationEvaluationRequest,
  type GoalQualificationPlan,
  type GoalQualificationRegistration,
  type GoalQualificationSelection,
} from './goal-qualification';
import { goalRawBytesSha256, readGoalRawEnvelope } from './goal-raw-envelope';
import type { GoalBundleArchiveManifest, GoalBundleEpisodeReceipt } from './goal-bundle-episode';
import type { GoalStudyBundleIndex } from '../../../scripts/bots/goal-study-bundle-export';

const SHA = /^[0-9a-f]{64}$/,
  NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/,
  DAY = 86400000;
type Json = Record<string, any>; // Only bounded detached JSON or exact own-data records pass the guards below.
/** Owned only after the unchanged boundary recomputes all training results and the original selection seal. */
export interface GoalBundleStudySelection {
  readonly kind: 'reverified-training-study-selection-v1';
  readonly indexSha256: string;
  readonly planSha256: string;
  readonly sourceSha256: string;
  readonly selection: Readonly<GoalQualificationSelection>;
  readonly validationRequests: readonly string[];
}
export interface GoalBundleStudySelectionBinding {
  indexSha256: string;
  planSha256: string;
  sourceSha256: string;
  candidateSha256?: string;
  requestSha256?: string;
}
const selections = new WeakMap<object, () => boolean>();
function check(value: unknown, reason: string): asserts value {
  if (!value) throw Error(`goal-bundle-study:${reason}`);
}
function own(value: unknown, fields?: readonly string[]): Json {
  check(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      [Object.prototype, null].includes(Object.getPrototypeOf(value)),
    'object'
  );
  const d = Object.getOwnPropertyDescriptors(value),
    keys = Reflect.ownKeys(d);
  check(
    keys.every((k) => typeof k === 'string' && d[k].enumerable && 'value' in d[k]),
    'own-data'
  );
  if (fields) check(keys.length === fields.length && fields.every((k) => Object.hasOwn(d, k)), 'fields');
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.value]));
}
function canonical(value: unknown): string {
  return Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((value as Json)[k])}`)
          .join(',')}}`
      : JSON.stringify(value);
}
const bytes = (value: string) => new TextEncoder().encode(value);
const digest = (value: unknown) => goalRawBytesSha256(bytes(canonical(value)));
const same = (left: unknown, right: unknown, reason: string) => check(digest(left) === digest(right), reason);
function freeze<T>(value: T): T {
  if (
    value &&
    typeof value === 'object' &&
    (Array.isArray(value) || [Object.prototype, null].includes(Object.getPrototypeOf(value)))
  ) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function parse(raw: Uint8Array, canonicalRecord = true): Json {
  check(raw instanceof Uint8Array && raw.length > 0 && raw.length <= 32 * 1024 * 1024, 'record-size');
  let value: unknown, text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw);
    value = JSON.parse(text);
  } catch {
    throw Error('goal-bundle-study:json');
  }
  let nodes = 0;
  const visit = (v: unknown, depth: number): unknown => {
    check(++nodes <= 800000 && depth <= 24, 'record-complexity');
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
    if (typeof v === 'number') {
      check(Number.isSafeInteger(v), 'record-number');
      return v;
    }
    if (Array.isArray(v)) {
      check(v.length <= 30000, 'record-array');
      return v.map((x) => visit(x, depth + 1));
    }
    const object = own(v);
    check(Object.keys(object).length <= 256, 'record-object');
    return Object.fromEntries(Object.entries(object).map(([k, x]) => [k, visit(x, depth + 1)]));
  };
  const result = own(visit(value, 0));
  if (canonicalRecord) check(text === canonical(result) + '\n', 'noncanonical-record');
  return freeze(result);
}
/** Reject JSON copies, revoked studies and capabilities for any other reader, source, candidate or request. */
export function assertGoalBundleStudySelection(
  value: unknown,
  raw: GoalBundleStudySelectionBinding
): asserts value is GoalBundleStudySelection {
  const expected = own(raw, [
    'indexSha256',
    'planSha256',
    'sourceSha256',
    ...(Object.hasOwn(raw, 'candidateSha256') ? ['candidateSha256'] : []),
    ...(Object.hasOwn(raw, 'requestSha256') ? ['requestSha256'] : []),
  ]);
  check(
    Object.values(expected).every((v) => typeof v === 'string' && SHA.test(v)),
    'selection-binding'
  );
  check(value && typeof value === 'object' && selections.get(value)?.(), 'unowned-selection');
  const selection = value as GoalBundleStudySelection;
  check(
    selection.indexSha256 === expected.indexSha256 &&
      selection.planSha256 === expected.planSha256 &&
      selection.sourceSha256 === expected.sourceSha256 &&
      (!expected.candidateSha256 || selection.selection.candidateSha256 === expected.candidateSha256) &&
      (!expected.requestSha256 || selection.validationRequests.includes(expected.requestSha256)),
    'selection-binding'
  );
}
/** Structural dependency implemented by the pinned reader; it cannot originate from a page or AI payload. */
export interface GoalBundleStudyEpisodeReader {
  readonly summary: Readonly<{
    phase: 'training' | 'validation';
    manifestSha256: string;
    planSha256: string;
    requestSha256: string;
    sourceSha256: string;
    files: number;
    bytes: number;
  }>;
  read(name: string): Promise<Uint8Array>;
  dispose(): void;
}
export interface GoalBundleStudyReader {
  readonly index: Readonly<GoalStudyBundleIndex>;
  readonly indexSha256: string;
  readRoot(name: string): Promise<Uint8Array>;
  readParent(name: string): Promise<Uint8Array>;
  readValidationRoot(name: string, selection: GoalBundleStudySelection): Promise<Uint8Array>;
  openTrainingEpisode(requestSha256: string): Promise<GoalBundleStudyEpisodeReader>;
  openValidationEpisode(
    requestSha256: string,
    selection: GoalBundleStudySelection
  ): Promise<GoalBundleStudyEpisodeReader>;
  dispose(): void;
}
/** Trusted causal producer input. Returned evidence is compared in full with the original completion record. */
export interface GoalBundleStudyEpisodeContext {
  plan: Readonly<GoalQualificationPlan>;
  manifest: Readonly<GoalBundleArchiveManifest>;
  registration: Readonly<GoalQualificationRegistration>;
  request: Readonly<GoalQualificationEvaluationRequest>;
  receipts: readonly Readonly<GoalBundleEpisodeReceipt>[];
  reader: GoalBundleStudyEpisodeReader;
  selection?: GoalBundleStudySelection;
  signal: AbortSignal;
}
/** Per-episode streaming verifier supplied by trusted application composition, never bundled JSON. */
export interface GoalBundleStudyObserver {
  observeChild(
    receipt: Readonly<GoalBundleEpisodeReceipt>,
    value: Readonly<Record<string, unknown>>
  ): void | Promise<void>;
  complete(): void | Promise<void>;
}
/** Concrete original-prefix observer for the first continuation episode. */
export interface GoalBundleStudyContinuation {
  prepare(
    context: Readonly<{
      lineage: Readonly<Record<string, unknown>>;
      parentRequest: Readonly<GoalQualificationEvaluationRequest>;
      inventory: Readonly<Record<string, unknown>>;
      readParentArtifact(name: string, signal: AbortSignal): Promise<Uint8Array>;
      signal: AbortSignal;
    }>
  ): Promise<GoalBundleStudyObserver>;
}
/** Concrete retry-budget verifier for subsequent episodes of a recorded-retry continuation. */
export interface GoalBundleStudyAcquisition {
  prepare(
    context: Readonly<{ request: Readonly<GoalQualificationEvaluationRequest>; signal: AbortSignal }>
  ): Promise<GoalBundleStudyObserver>;
}
export interface GoalBundleStudyInput {
  reader: GoalBundleStudyReader;
  evaluateEpisode(context: Readonly<GoalBundleStudyEpisodeContext>): Promise<GoalQualificationEpisodeEvidence>;
  continuation?: GoalBundleStudyContinuation;
  acquisition?: GoalBundleStudyAcquisition;
  signal?: AbortSignal;
}
/** V3 currently supports original completed studies only, without acquisition continuation dependencies. */
export type GoalBundleStudyV3Input = Omit<GoalBundleStudyInput, 'continuation' | 'acquisition'>;
function expectedRequest(
  plan: GoalQualificationPlan,
  candidateIndex: number,
  phase: 'training' | 'validation',
  episodeIndex: number
): GoalQualificationEvaluationRequest {
  const candidate = plan.candidates[candidateIndex];
  return freeze({
    planSha256: goalQualificationDigest(plan),
    candidate,
    candidateSha256: goalQualificationDigest(candidate),
    phase,
    partitionIdentitySha256: plan[phase].identitySha256,
    startAtMs: plan[phase].startAtMs + episodeIndex * DAY,
    endAtMs: plan[phase].startAtMs + (episodeIndex + 1) * DAY,
    episodeIndex,
  });
}
function claim(plan: GoalQualificationPlan) {
  return {
    kind: 'goal-study-validation-claim-v1',
    planSha256: goalQualificationDigest(plan),
    studyId: plan.studyId,
    validationIdentitySha256: plan.validation.identitySha256,
    genesisHash: plan.candidates[0].genesisHash,
    startAtMs: plan.validation.startAtMs,
    endAtMs: plan.validation.endAtMs,
    source: plan.source,
  };
}
function registration(
  record: Json,
  plan: GoalQualificationPlan,
  sourceSha256: string,
  lineage?: unknown
): GoalQualificationRegistration {
  own(record, ['kind', 'plan', 'sourceSha256', 'registeredAt', 'registration']);
  check(
    record.kind === 'goal-study-registration-v1' &&
      record.sourceSha256 === sourceSha256 &&
      typeof record.registeredAt === 'string',
    'registration'
  );
  same(record.plan, plan, 'registration-plan');
  const body = {
    kind: record.kind,
    sourceSha256,
    registeredAt: record.registeredAt,
    ...(lineage ? { continuationSha256: digest(lineage) } : {}),
    planSha256: goalQualificationDigest(plan),
    trainingIdentitySha256: plan.training.identitySha256,
    validationIdentitySha256: plan.validation.identitySha256,
  };
  const expected = {
    kind: 'preregistered-unopened-validation' as const,
    planSha256: body.planSha256,
    registrationSha256: digest(body),
    trainingIdentitySha256: body.trainingIdentitySha256,
    validationIdentitySha256: body.validationIdentitySha256,
  };
  same(record.registration, expected, 'registration-digest');
  return freeze(expected);
}
/**
 * Reverify an already completed, pinned v2 study. The evaluator callback and acquisition verifiers are trusted
 * application composition dependencies, never untrusted tools or AI functions. No journal is written here.
 */
export function createGoalBundleStudy(raw: GoalBundleStudyInput) {
  return createVersionedStudy(raw, 2);
}
/** Reverify a completed v3 source130/target131 study with the shared private selection and revocation controls. */
export function createGoalBundleStudyV3(raw: GoalBundleStudyV3Input) {
  return createVersionedStudy(raw, 3);
}
/** Protocol dispatch changes only the qualification rules; journal ordering and selection ownership are shared. */
async function createVersionedStudy(raw: GoalBundleStudyInput, version: 2 | 3) {
  const input = own(raw, [
    'reader',
    'evaluateEpisode',
    ...(version === 2 && Object.hasOwn(raw, 'continuation') ? ['continuation'] : []),
    ...(version === 2 && Object.hasOwn(raw, 'acquisition') ? ['acquisition'] : []),
    ...(Object.hasOwn(raw, 'signal') ? ['signal'] : []),
  ]);
  check(
    typeof input.evaluateEpisode === 'function' && (input.signal === undefined || input.signal instanceof AbortSignal),
    'dependencies'
  );
  const reader = input.reader as GoalBundleStudyReader,
    evaluateEpisode = input.evaluateEpisode as GoalBundleStudyInput['evaluateEpisode'],
    continuation = input.continuation as GoalBundleStudyContinuation | undefined,
    acquisition = input.acquisition as GoalBundleStudyAcquisition | undefined;
  check(
    reader &&
      typeof reader.readRoot === 'function' &&
      typeof reader.readParent === 'function' &&
      typeof reader.readValidationRoot === 'function' &&
      typeof reader.openTrainingEpisode === 'function' &&
      typeof reader.openValidationEpisode === 'function' &&
      typeof reader.dispose === 'function' &&
      SHA.test(reader.indexSha256),
    'reader'
  );
  if (continuation) check(typeof own(continuation, ['prepare']).prepare === 'function', 'continuation-dependency');
  if (acquisition) check(typeof own(acquisition, ['prepare']).prepare === 'function', 'acquisition-dependency');
  const lifetime = new AbortController(),
    parentSignal = input.signal as AbortSignal | undefined;
  let closed = false,
    attempted = false,
    selection: GoalBundleStudySelection | undefined,
    boundary: ReturnType<typeof createGoalQualificationBoundaryV2> | undefined;
  const active = () => check(!closed && !lifetime.signal.aborted, 'closed');
  const dispose = () => {
    if (closed) return;
    closed = true;
    lifetime.abort();
    boundary?.revoke();
    reader.dispose();
    parentSignal?.removeEventListener('abort', dispose);
  };
  parentSignal?.addEventListener('abort', dispose, { once: true });
  if (parentSignal?.aborted) dispose();
  const read = async (name: string, validation = false) => {
    active();
    const value = parse(await (validation ? reader.readValidationRoot(name, selection!) : reader.readRoot(name)));
    active();
    return value;
  };
  try {
    const index = reader.index,
      indexSha256 = reader.indexSha256;
    if (version === 3)
      check(
        index.parent === null &&
          !index.artifacts.some((item) => /^(?:continuation|acquisition)(?:[.-]|$)/.test(item.name)),
        'v3-lineage-unsupported'
      );
    const protocol = own(await read('protocol'), ['plan', 'manifest', 'sources', 'protocolSha256', 'parent']);
    const plan = protocol.plan as GoalQualificationPlan,
      manifest = protocol.manifest as GoalBundleArchiveManifest;
    check(
      plan.protocol === (version === 3 ? GOAL_QUALIFICATION_PROTOCOL_V3 : GOAL_QUALIFICATION_PROTOCOL_V2) &&
        manifest.protocol === `goal-qualification-archive-source-v${version}`,
      'protocol-version'
    );
    if (version === 3) check(protocol.parent === null, 'v3-lineage-unsupported');
    check(
      protocol.protocolSha256 === index.protocolSha256 &&
        goalQualificationDigest(plan) === index.planSha256 &&
        plan.source.evaluatorSha256 === index.sourceSha256 &&
        digest(protocol.sources) === index.sourceSha256 &&
        goalQualificationDigest(manifest) === plan.source.manifestSha256,
      'protocol-binding'
    );
    check(
      Object.entries(own(protocol.sources)).every(
        ([name, hash]) => name.length > 0 && name.length <= 1024 && typeof hash === 'string' && SHA.test(hash)
      ),
      'source-inventory'
    );
    const certificate = (await read('certificate')) as unknown as GoalQualificationCertificate;
    check(certificate.certificateSha256 === index.certificateSha256, 'certificate-binding');
    same(certificate.plan, plan, 'certificate-plan');
    const registrationRecord = await read('registration'),
      studyClaim = await read('study-claim'),
      validationClaim = await read('validation-claim');
    let lineage: Json | undefined,
      parentRequest: GoalQualificationEvaluationRequest | undefined,
      inventory: Json | undefined,
      readParentArtifact: ((name: string, signal: AbortSignal) => Promise<Uint8Array>) | undefined;
    if (index.parent) {
      check(continuation, 'continuation-verifier-required');
      check(acquisition, 'acquisition-verifier-required');
      const parent = index.parent,
        parentPins = new Map(parent.artifacts.map((item) => [item.name, item]));
      const parentRead = async (name: string) => {
        active();
        const value = await reader.readParent(name);
        active();
        const pin = parentPins.get(name);
        check(pin && pin.bytes === value.length && pin.sha256 === goalRawBytesSha256(value), 'parent-byte-binding');
        return value;
      };
      const parentRecord = parse(await parentRead('registration')),
        parentPlan = parentRecord.plan as GoalQualificationPlan;
      check(
        goalQualificationDigest(parentPlan) === parent.planSha256 &&
          parentPlan.source.evaluatorSha256 !== index.sourceSha256,
        'parent-plan'
      );
      same(
        plan,
        { ...parentPlan, source: { ...parentPlan.source, evaluatorSha256: index.sourceSha256 } },
        'continuation-economics'
      );
      const parentRegistration = registration(parentRecord, parentPlan, parentPlan.source.evaluatorSha256);
      parentRequest = expectedRequest(parentPlan, 0, 'training', 0);
      check(goalQualificationDigest(parentRequest) === parent.requestSha256, 'parent-first-training');
      const access = parse(await parentRead(`access-${parent.requestSha256}`)),
        failed = parse(await parentRead(`failed-${parent.requestSha256}`));
      own(access, ['kind', 'request', 'registrationSha256', 'selectionSha256', 'recordedAt']);
      own(failed, ['kind', 'requestSha256', 'accessSha256']);
      check(
        access.kind === 'goal-study-evaluation-access-v1' &&
          access.registrationSha256 === parentRegistration.registrationSha256 &&
          access.selectionSha256 === null &&
          failed.kind === 'goal-study-evaluation-failed-v1' &&
          failed.requestSha256 === parent.requestSha256 &&
          failed.accessSha256 === digest(access),
        'parent-failure'
      );
      same(access.request, parentRequest, 'parent-request');
      const inventoryBytes = await parentRead('acquisition-inventory');
      inventory = parse(inventoryBytes, false);
      own(inventory, ['kind', 'requestSha256', 'files']);
      check(
        inventory.kind === 'goal-acquisition-prefix-manifest-v1' &&
          inventory.requestSha256 === parent.requestSha256 &&
          Array.isArray(inventory.files) &&
          inventory.files.length >= 4 &&
          inventory.files.length <= 16003,
        'parent-inventory'
      );
      const mapped = new Map<string, string>(),
        allowed = new Set(['continuation-child', 'acquisition-inventory']);
      let total = 0;
      for (const item of inventory.files) {
        own(item, ['name', 'sha256', 'bytes']);
        check(
          typeof item.name === 'string' &&
            /^(?:registration|access|failed|raw\/[A-Za-z0-9][A-Za-z0-9._-]{0,127})$/.test(item.name) &&
            !mapped.has(item.name) &&
            SHA.test(item.sha256) &&
            Number.isSafeInteger(item.bytes) &&
            item.bytes > 0 &&
            item.bytes <= 32 * 1024 * 1024,
          'parent-inventory-entry'
        );
        const name =
          item.name === 'access'
            ? `access-${parent.requestSha256}`
            : item.name === 'failed'
              ? `failed-${parent.requestSha256}`
              : item.name.startsWith('raw/')
                ? item.name.slice(4)
                : item.name;
        const pin = parentPins.get(name);
        check(
          pin && pin.sha256 === item.sha256 && pin.bytes === item.bytes && !allowed.has(name),
          'parent-inventory-pin'
        );
        mapped.set(item.name, name);
        allowed.add(name);
        total += item.bytes;
      }
      check(
        total <= 512 * 1024 * 1024 &&
          allowed.size === parentPins.size &&
          [...parentPins.keys()].every((name) => allowed.has(name)) &&
          [
            'registration',
            'access',
            'failed',
            'raw/source.json',
            'raw/failure.json',
            'raw/metadata-cache-binding',
          ].every((name) => mapped.has(name)),
        'parent-inventory-complete'
      );
      readParentArtifact = async (name, signal) => {
        check(!signal.aborted, 'aborted');
        if (name === 'manifest') return new Uint8Array(inventoryBytes);
        const logical = mapped.get(name);
        check(logical, 'parent-artifact');
        const value = await parentRead(logical);
        check(!signal.aborted, 'aborted');
        return value;
      };
      // Every parent original remains byte-bound even before the semantic prefix preparer inspects it.
      for (const [logical, name] of mapped)
        if (logical.startsWith('raw/')) {
          const rawBytes = await parentRead(name),
            wrapper = parse(rawBytes);
          own(wrapper, ['kind', 'name', 'requestSha256', 'sha256', 'value']);
          readGoalRawEnvelope(rawBytes, { name, requestSha256: parent.requestSha256, valueSha256: wrapper.sha256 });
        }
      lineage = await read('continuation');
      own(lineage, [
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
      check([502, 503, 504].includes(lineage.failedHttpStatus), 'parent-failed-status');
      same(
        lineage,
        {
          kind: 'goal-study-acquisition-continuation-v1',
          parentPlanSha256: parent.planSha256,
          parentRegistrationSha256: parentRegistration.registrationSha256,
          parentSourceSha256: parentPlan.source.evaluatorSha256,
          parentRequestSha256: parent.requestSha256,
          parentAccessSha256: digest(access),
          parentFailedRecordSha256: digest(failed),
          parentRawManifestSha256: goalRawBytesSha256(inventoryBytes),
          failedHttpStatus: lineage.failedHttpStatus,
          childPlanSha256: index.planSha256,
          childSourceSha256: index.sourceSha256,
        },
        'lineage'
      );
      same(parse(await parentRead('continuation-child')), lineage, 'parent-lineage');
      const publicParent = own(protocol.parent, ['planSha256', 'requestSha256', 'sourceSha256', 'protocolSha256']);
      check(SHA.test(publicParent.protocolSha256), 'parent-protocol');
      const { protocolSha256: _parentProtocol, ...parentBody } = publicParent;
      same(
        parentBody,
        {
          planSha256: parent.planSha256,
          requestSha256: parent.requestSha256,
          sourceSha256: parentPlan.source.evaluatorSha256,
        },
        'public-parent'
      );
      same(studyClaim, claim(parentPlan), 'original-study-claim');
      same(validationClaim, claim(parentPlan), 'original-validation-claim');
    } else {
      check(protocol.parent === null, 'unexpected-parent');
      same(studyClaim, claim(plan), 'study-claim');
      same(validationClaim, claim(plan), 'validation-claim');
    }
    const registered = registration(registrationRecord, plan, index.sourceSha256, lineage),
      trainingCount = plan.candidates.length * 4;
    check(index.episodes.length === trainingCount + 2, 'episode-count');
    let cursor = 0,
      registeredOnce = false;
    boundary = (version === 3 ? createGoalQualificationBoundaryV3 : createGoalQualificationBoundaryV2)({
      protocol: goalQualificationEvidenceProtocol(plan.protocol),
      sourceSha256: index.sourceSha256,
      register: async (p, restored) => {
        active();
        check(!registeredOnce && cursor === 0, 'registration-order');
        same(p, plan, 'registration-plan');
        check(restored, 'restored-required');
        same(restored, certificate, 'restored-certificate');
        registeredOnce = true;
        return registered;
      },
      sealSelection: async (selected, restored) => {
        active();
        check(registeredOnce && cursor === trainingCount && !selection, 'selection-order');
        const original = await read('selection');
        const expected = {
          ...selected,
          kind: 'selection-sealed-before-validation' as const,
          sealSha256: digest({ kind: 'goal-study-selection-v1', planSha256: index.planSha256, ...selected }),
        };
        same(original, expected, 'selection-changed');
        same(restored, expected, 'restored-selection');
        const candidate = plan.candidates.findIndex(
          (value) => goalQualificationDigest(value) === selected.candidateSha256
        );
        check(candidate >= 0, 'selected-candidate');
        const validationRequests = [0, 1].map((i) => {
          const expected = expectedRequest(plan, candidate, 'validation', i),
            entry = index.episodes[trainingCount + i];
          check(
            entry.phase === 'validation' &&
              entry.candidateSha256 === selected.candidateSha256 &&
              entry.episodeIndex === i &&
              entry.requestSha256 === goalQualificationDigest(expected),
            'validation-index'
          );
          return entry.requestSha256;
        });
        selection = freeze({
          kind: 'reverified-training-study-selection-v1' as const,
          indexSha256,
          planSha256: index.planSha256,
          sourceSha256: index.sourceSha256,
          selection: expected,
          validationRequests,
        });
        selections.set(selection, () => !closed && !lifetime.signal.aborted);
        return expected;
      },
      evaluate: async (request, suppliedSelection) => {
        active();
        check(registeredOnce && cursor < index.episodes.length, 'episode-order');
        const entry = index.episodes[cursor],
          training = cursor < trainingCount;
        const candidate = training
          ? Math.floor(cursor / 4)
          : plan.candidates.findIndex(
              (value) => goalQualificationDigest(value) === selection?.selection.candidateSha256
            );
        check(training ? !suppliedSelection : !!selection, 'selection-required');
        if (!training) same(suppliedSelection, selection!.selection, 'selection-changed');
        const expected = expectedRequest(
          plan,
          candidate,
          training ? 'training' : 'validation',
          training ? cursor % 4 : cursor - trainingCount
        );
        same(request, expected, 'request-order');
        const id = goalQualificationDigest(request);
        check(
          entry.requestSha256 === id &&
            entry.phase === request.phase &&
            entry.candidateSha256 === request.candidateSha256 &&
            entry.episodeIndex === request.episodeIndex,
          'episode-index'
        );
        const access = await read(`access-${id}`);
        own(access, ['kind', 'request', 'registrationSha256', 'selectionSha256', 'recordedAt']);
        check(
          access.kind === 'goal-study-evaluation-access-v1' &&
            access.registrationSha256 === registered.registrationSha256 &&
            access.selectionSha256 === (training ? null : selection!.selection.sealSha256),
          'access-binding'
        );
        same(access.request, request, 'access-request');
        const complete = await read(`complete-${id}`, !training);
        own(complete, ['kind', 'accessSha256', 'evidenceSha256', 'evidence', 'rawEvidence', 'rawManifestSha256']);
        check(
          complete.kind === 'goal-study-evaluation-complete-v1' &&
            complete.accessSha256 === digest(access) &&
            complete.evidenceSha256 === goalQualificationDigest(complete.evidence) &&
            complete.rawManifestSha256 === goalQualificationDigest(complete.rawEvidence),
          'completion-binding'
        );
        check(
          Array.isArray(complete.rawEvidence) &&
            complete.rawEvidence.length > 0 &&
            complete.rawEvidence.length <= 16000,
          'receipts'
        );
        const pins = new Map<string, GoalBundleEpisodeReceipt>();
        let previous = '',
          total = 0;
        for (const item of complete.rawEvidence) {
          own(item, ['name', 'sha256', 'bytes']);
          check(
            typeof item.name === 'string' &&
              NAME.test(item.name) &&
              !item.name.includes('..') &&
              item.name > previous &&
              SHA.test(item.sha256) &&
              Number.isSafeInteger(item.bytes) &&
              item.bytes > 0 &&
              item.bytes <= 32 * 1024 * 1024,
            'receipt'
          );
          if (version === 3)
            check(!/^(?:continuation|acquisition)(?:[.-]|$)/.test(item.name), 'v3-lineage-unsupported');
          previous = item.name;
          total += item.bytes;
          pins.set(item.name, item);
        }
        check(total <= 512 * 1024 * 1024, 'raw-budget');
        const episode = training
          ? await reader.openTrainingEpisode(id)
          : await reader.openValidationEpisode(id, selection!);
        check(
          episode.summary.phase === request.phase &&
            episode.summary.requestSha256 === id &&
            episode.summary.planSha256 === index.planSha256 &&
            episode.summary.sourceSha256 === index.sourceSha256 &&
            episode.summary.manifestSha256 === entry.manifestSha256 &&
            episode.summary.files === pins.size,
          'episode-reader-binding'
        );
        const observer = lineage
          ? cursor === 0
            ? await continuation!.prepare({
                lineage,
                parentRequest: parentRequest!,
                inventory: inventory!,
                readParentArtifact: readParentArtifact!,
                signal: lifetime.signal,
              })
            : await acquisition!.prepare({ request, signal: lifetime.signal })
          : undefined;
        active();
        check(!lineage || observer, 'acquisition-observer');
        if (observer) {
          own(observer, ['observeChild', 'complete']);
          check(
            typeof observer.observeChild === 'function' && typeof observer.complete === 'function',
            'acquisition-observer'
          );
        }
        const consumed = new Set<string>();
        let reading = false;
        const wrapped: GoalBundleStudyEpisodeReader = Object.freeze({
          summary: episode.summary,
          dispose: () => episode.dispose(),
          read: async (name: string) => {
            active();
            check(!reading && !consumed.has(name), 'raw-read-order');
            const receipt = pins.get(name);
            check(receipt, 'raw-name');
            reading = true;
            try {
              const raw = await episode.read(name);
              active();
              const value = readGoalRawEnvelope(raw, { name, requestSha256: id, valueSha256: receipt.sha256 });
              check(bytes(canonical(value)).length === receipt.bytes, 'raw-value-size');
              await observer?.observeChild(receipt, value);
              active();
              consumed.add(name);
              return raw;
            } finally {
              reading = false;
            }
          },
        });
        try {
          const recomputed = await evaluateEpisode(
            freeze({
              plan,
              manifest,
              registration: registered,
              request,
              receipts: complete.rawEvidence,
              reader: wrapped,
              ...(selection ? { selection } : {}),
              signal: lifetime.signal,
            })
          );
          active();
          // The causal source consumes semantic evidence. Remaining provenance still has exact raw-wrapper/value checks.
          for (const name of pins.keys()) if (!consumed.has(name)) await wrapped.read(name);
          await observer?.complete();
          active();
          same(recomputed, complete.evidence, 'recomputed-evidence');
          cursor++;
          return recomputed;
        } finally {
          episode.dispose();
        }
      },
    });
    return Object.freeze({
      /** One read-only replay; failures revoke the boundary and never resume with another candidate or partition. */
      async reverify() {
        active();
        check(!attempted, 'already-attempted');
        attempted = true;
        try {
          const result = await boundary!.reverify(certificate);
          active();
          check(cursor === index.episodes.length, 'incomplete-study');
          same(result.certificate, certificate, 'certificate-changed');
          return result;
        } catch (error) {
          dispose();
          throw error;
        }
      },
      dispose,
    });
  } catch (error) {
    dispose();
    throw error;
  }
}
