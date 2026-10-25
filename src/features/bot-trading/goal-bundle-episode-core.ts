/** Internal shared raw episode mechanics. Only fixed V2/browser and V3/Node composition roots install drivers. */
import {
  GOAL_QUALIFICATION_PROTOCOL_V2,
  GOAL_QUALIFICATION_POLICY_V2,
  GOAL_QUALIFICATION_PROTOCOL_V3,
  goalQualificationPolicy,
  goalQualificationDigest,
  readGoalQualificationBinding,
  type GoalQualificationPlan,
  type GoalQualificationRegistration,
  type GoalQualificationEvaluationRequest,
  type GoalQualificationSelection,
} from './goal-qualification';
import { type GoalEpisodeEvidenceSource, type GoalEpisodeMarkEvidence } from './goal-episode-evaluator';
import { GOAL_EXACT_POLICY, GOAL_EXACT_KUSD as KUSD, GOAL_EXACT_XOR as XOR } from './goal-exact-ledger';
import { buildGoalQualificationClockV2 } from './goal-callback-builder-v2';
import {
  goalClockCheckCutoff,
  GoalEpisodeDeadlineCancellation,
  type GoalEpisodeDeadlineReceipt,
  type GoalEpisodeClockCheck,
} from './goal-qualification-clock-v2';
import {
  assertGoalBundleMetadata,
  assertGoalBundleValidationMetadata,
  type GoalBundleMetadataBinding,
  getGoalBundleVerifiedMetadataCatalog,
  type GoalBundleAnyMetadataVerification,
} from './goal-bundle-metadata';
import { verifyGoalHistoryArtifact } from './goal-bundle-history';
import {
  verifyGoalBundleOpening,
  verifyGoalBundleValuation,
  verifyGoalBundleTerminal,
  verifyGoalBundleCatalogOpening,
  verifyGoalBundleCatalogValuation,
  verifyGoalBundleCatalogTerminal,
  type GoalBundleValuationBinding,
  type GoalBundleCatalogValuationBinding,
} from './goal-bundle-market';
import { verifyGoalBundleQuote } from './goal-bundle-quote';
import {
  readGoalTargetExecutionModel,
  isGoalCatalogTargetExecutionModel,
  goalTargetSourceRuntimeProfiles,
} from './goal-target-model';
import { getGoalBundleVerifiedMarketState } from './goal-bundle-market';
import type { verifyGoalTargetBundleQuote } from '../../../scripts/bots/goal-target-bundle-quote';
import { readGoalRawEnvelope, goalRawEvidenceDigest } from './goal-raw-envelope';
import { assertGoalBundleStudySelection, type GoalBundleStudySelection } from './goal-bundle-study';
import type { GoalValidationBundleBinding } from './goal-bundle-reader';

const HOUR = 3600000,
  DAY = 24 * HOUR,
  SHA = /^[0-9a-f]{64}$/;
type Data = Readonly<Record<string, unknown>>;
/** Exact original archive manifest. Validation consumption additionally requires the private study selection. */
export interface GoalBundleArchiveManifest {
  protocol: 'goal-qualification-archive-source-v2' | 'goal-qualification-archive-source-v3';
  sourceId: string;
  genesisHash: string;
  denominator: string;
  warmupHours: 200;
  captureModel: {
    kind: 'fixed-pinned-capture-delays-v1';
    historyReadMs: number;
    indexerPublicationDelayMs: number;
    markReadMs: number;
    quoteAndFeeReadMs: number;
  };
  partitions: Record<
    'training' | 'validation',
    {
      identitySha256: string;
      blocksSha256: string;
      receiptSha256: string;
      source: GoalBundleAnyMetadataVerification['provenance']['source'];
    }
  >;
  accessAuditSha256: string;
  operationalIngestionSha256: readonly string[];
  maximumHttpRequests: number;
  maximumResponseBytes: number;
}
/** Original completion records bind canonical value bytes, not wrapper file bytes. */
export interface GoalBundleEpisodeReceipt {
  name: string;
  sha256: string;
  bytes: number;
}
export interface GoalBundleEpisodeInput {
  plan: GoalQualificationPlan;
  manifest: GoalBundleArchiveManifest;
  registration: GoalQualificationRegistration;
  request: GoalQualificationEvaluationRequest;
  metadataBinding: GoalBundleMetadataBinding;
  metadata: GoalBundleAnyMetadataVerification;
  receipts: readonly GoalBundleEpisodeReceipt[];
}
/** Existing training entrypoint input; validation still requires a separate private admission. */
export type GoalBundleTrainingInput = GoalBundleEpisodeInput;
/** Admission stays separate from serialized evidence and is checked again throughout replay. */
export interface GoalBundleValidationAdmission {
  selection: GoalBundleStudySelection;
  binding: GoalValidationBundleBinding;
}
/** Read only the named original wrapper; the caller additionally pins its exact file bytes. */
export interface GoalBundleEpisodeDependencies {
  readArtifact(name: string, signal: AbortSignal): Promise<Uint8Array>;
  signal?: AbortSignal;
}
/** @internal Trusted Node composition only. Never accepted by a public episode entrypoint. */
export interface GoalBundleTargetQuoteDriver {
  verify(
    binding: Parameters<typeof verifyGoalTargetBundleQuote>[0],
    bytes: Parameters<typeof verifyGoalTargetBundleQuote>[1]
  ): ReturnType<typeof verifyGoalTargetBundleQuote>;
}
function check(value: unknown, reason: string): asserts value {
  if (!value) throw Error(`goal-bundle-episode:${reason}`);
}
function own(value: unknown, fields?: readonly string[]): Data {
  check(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      [Object.prototype, null].includes(Object.getPrototypeOf(value)),
    'object'
  );
  const d = Object.getOwnPropertyDescriptors(value);
  check(
    Reflect.ownKeys(d).every((key) => typeof key === 'string' && d[key].enumerable && 'value' in d[key]),
    'own-data'
  );
  if (fields) check(Object.keys(d).length === fields.length && fields.every((key) => Object.hasOwn(d, key)), 'fields');
  return value as Data;
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function copy<T>(value: T): T {
  goalRawEvidenceDigest(value);
  return freeze(JSON.parse(JSON.stringify(value))) as T;
}
function same(a: unknown, b: unknown, reason: string): void {
  check(goalRawEvidenceDigest(a) === goalRawEvidenceDigest(b), reason);
}
function canonical(value: unknown): string {
  return Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical((value as Data)[key])}`)
          .join(',')}}`
      : JSON.stringify(value);
}
const encodedLength = (value: unknown) => new TextEncoder().encode(canonical(value)).length;

/**
 * Reproduce original v2 source ordering and every retained evidence join. The private owned metadata
 * capability is required before artifact access; training-only replay grants no admission or selection seal.
 */
export function createGoalBundleTrainingSourceCore(
  raw: GoalBundleTrainingInput,
  dependencies: GoalBundleEpisodeDependencies,
  target?: GoalBundleTargetQuoteDriver
): GoalEpisodeEvidenceSource {
  return createSource(raw, dependencies, 'training', () => undefined, undefined, target);
}

/** Open only the exact selected validation request after the original study selection is recomputed. */
export function createGoalBundleValidationSourceCore(
  raw: GoalBundleEpisodeInput,
  dependencies: GoalBundleEpisodeDependencies,
  admission: GoalBundleValidationAdmission,
  target?: GoalBundleTargetQuoteDriver
): GoalEpisodeEvidenceSource {
  own(raw, ['plan', 'manifest', 'registration', 'request', 'metadataBinding', 'metadata', 'receipts']);
  const authorized = own(admission, ['selection', 'binding']),
    binding = copy(
      own(authorized.binding, ['indexSha256', 'planSha256', 'sourceSha256', 'candidateSha256', 'requestSha256'])
    ) as unknown as GoalValidationBundleBinding;
  check(
    Object.values(binding).every((value) => typeof value === 'string' && SHA.test(value)),
    'selection-binding'
  );
  const selection = authorized.selection as GoalBundleStudySelection;
  assertGoalBundleStudySelection(selection, binding);
  const { metadata, ...untrusted } = raw,
    input = copy(untrusted);
  check(
    binding.planSha256 === goalQualificationDigest(input.plan) &&
      binding.planSha256 === input.request.planSha256 &&
      binding.sourceSha256 === input.plan.source.evaluatorSha256 &&
      binding.candidateSha256 === input.request.candidateSha256 &&
      binding.requestSha256 === goalQualificationDigest(input.request),
    'selection-request'
  );
  const assertAdmitted = () => {
    assertGoalBundleStudySelection(selection, binding);
    assertGoalBundleValidationMetadata(metadata, input.metadataBinding, { selection, binding });
  };
  return createSource(raw, dependencies, 'validation', assertAdmitted, selection.selection, target);
}

function createSource(
  raw: GoalBundleEpisodeInput,
  dependencies: GoalBundleEpisodeDependencies,
  phase: 'training' | 'validation',
  assertAdmitted: () => void,
  admittedSelection?: Readonly<GoalQualificationSelection>,
  target?: GoalBundleTargetQuoteDriver
): GoalEpisodeEvidenceSource {
  assertAdmitted();
  own(raw, ['plan', 'manifest', 'registration', 'request', 'metadataBinding', 'metadata', 'receipts']);
  const { metadata, ...untrusted } = raw;
  const input = copy(untrusted),
    { plan, manifest, registration, request, metadataBinding, receipts } = input;
  assertGoalBundleMetadata(metadata, metadataBinding);
  check(request.phase === phase && metadataBinding.partition === phase, 'validation-unsupported');
  const executionModel = target ? readGoalTargetExecutionModel(plan.executionModel) : undefined;
  check(
    plan.protocol === (target ? GOAL_QUALIFICATION_PROTOCOL_V3 : GOAL_QUALIFICATION_PROTOCOL_V2) &&
      manifest.protocol === (target ? 'goal-qualification-archive-source-v3' : 'goal-qualification-archive-source-v2'),
    'protocol'
  );
  same(
    plan.policy,
    target ? goalQualificationPolicy(plan.protocol, executionModel) : GOAL_QUALIFICATION_POLICY_V2,
    'policy'
  );
  if (executionModel) same(plan.runtimeProfiles, goalTargetSourceRuntimeProfiles(executionModel), 'source-runtime');
  const catalogModel = executionModel && isGoalCatalogTargetExecutionModel(executionModel);
  const catalogMetadata =
    'kind' in metadata && metadata.kind === 'goal-bundle-catalog-metadata-v2' ? metadata : undefined;
  check(Boolean(catalogModel) === Boolean(catalogMetadata), 'metadata-model');
  const catalog = catalogMetadata ? getGoalBundleVerifiedMetadataCatalog(catalogMetadata) : undefined;
  if (catalogModel && catalog) same(catalog.catalogSha256, executionModel.catalogSha256, 'model-catalog');
  const binding = readGoalQualificationBinding(request.candidate),
    partition = manifest.partitions[phase];
  check(
    manifest.genesisHash === GOAL_EXACT_POLICY.genesisHash &&
      manifest.genesisHash === binding.genesisHash &&
      manifest.denominator === binding.denominator &&
      manifest.warmupHours === 200,
    'manifest'
  );
  check(
    manifest.sourceId === plan.source.sourceId && goalQualificationDigest(manifest) === plan.source.manifestSha256,
    'manifest-identity'
  );
  check(
    SHA.test(manifest.accessAuditSha256) &&
      manifest.operationalIngestionSha256.length <= 32 &&
      manifest.operationalIngestionSha256.every((v) => SHA.test(v)),
    'access-audit'
  );
  check(
    partition.blocksSha256 === metadataBinding.blocksSha256 &&
      partition.receiptSha256 === metadataBinding.verificationSha256 &&
      metadata.provenance.genesisHash === manifest.genesisHash,
    'metadata-identity'
  );
  same(partition.source, metadata.provenance.source, 'metadata-source');
  check(
    partition.identitySha256 === plan[phase].identitySha256 &&
      request.partitionIdentitySha256 === partition.identitySha256 &&
      request.planSha256 === goalQualificationDigest(plan),
    'request'
  );
  check(
    registration.kind === 'preregistered-unopened-validation' &&
      registration.planSha256 === request.planSha256 &&
      SHA.test(registration.registrationSha256) &&
      registration.trainingIdentitySha256 === plan.training.identitySha256 &&
      registration.validationIdentitySha256 === plan.validation.identitySha256,
    'registration'
  );
  check(
    request.candidateSha256 === goalQualificationDigest(binding) &&
      plan.candidates.some((v) => goalQualificationDigest(v) === request.candidateSha256),
    'candidate'
  );
  check(
    Number.isSafeInteger(request.episodeIndex) &&
      request.episodeIndex >= 0 &&
      request.episodeIndex < (phase === 'training' ? 4 : 2) &&
      request.startAtMs === plan[phase].startAtMs + request.episodeIndex * DAY &&
      request.endAtMs === request.startAtMs + DAY &&
      request.endAtMs <= plan[phase].endAtMs &&
      request.startAtMs % HOUR === 0,
    'episode'
  );
  check(plan.arrivalModel.kind === 'modeled-finalized-callbacks', 'model');
  const arrival = plan.arrivalModel,
    timing = manifest.captureModel;
  check(timing.kind === 'fixed-pinned-capture-delays-v1', 'capture-model');
  for (const n of [timing.historyReadMs, timing.indexerPublicationDelayMs, timing.markReadMs, timing.quoteAndFeeReadMs])
    check(Number.isSafeInteger(n) && n >= 0 && n <= 60000, 'capture-model');
  check(
    timing.markReadMs > 0 &&
      timing.markReadMs < 5000 &&
      timing.quoteAndFeeReadMs > 0 &&
      timing.quoteAndFeeReadMs < 5000 &&
      timing.historyReadMs + timing.markReadMs + timing.quoteAndFeeReadMs <= arrival.checkDurationMs,
    'capture-model'
  );
  check(
    Number.isSafeInteger(manifest.maximumHttpRequests) &&
      manifest.maximumHttpRequests > 0 &&
      manifest.maximumHttpRequests <= 10000 &&
      Number.isSafeInteger(manifest.maximumResponseBytes) &&
      manifest.maximumResponseBytes > 0 &&
      manifest.maximumResponseBytes <= 256 * 1024 * 1024,
    'budgets'
  );
  const blocks = metadata.blocks;
  check(blocks.length >= 3 && blocks.length <= 100000, 'blocks');
  const asof = (atMs: number) => {
    let low = 0,
      high = blocks.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (blocks[middle].timestampMs <= atMs) low = middle + 1;
      else high = middle;
    }
    check(low > 0 && low < blocks.length, 'missing-metadata-coverage');
    return { index: low - 1, block: blocks[low - 1], successor: blocks[low] };
  };
  const delay = arrival.finalityDelayMs + arrival.callbackDelayMs;
  const first = asof(request.startAtMs - delay - 1).index,
    last = asof(request.endAtMs - delay - 1).index + 1;
  const clock = buildGoalQualificationClockV2({
    episode: { startAtMs: request.startAtMs, endAtMs: request.endAtMs },
    model: arrival,
    source: {
      sourceId: manifest.sourceId,
      genesisHash: manifest.genesisHash,
      manifestSha256: plan.source.manifestSha256,
      preregistrationSha256: registration.registrationSha256,
    },
    blocks: blocks.slice(first, last + 1),
  });
  const deps = own(dependencies, ['readArtifact', ...(Object.hasOwn(dependencies, 'signal') ? ['signal'] : [])]);
  check(
    typeof deps.readArtifact === 'function' && (deps.signal === undefined || deps.signal instanceof AbortSignal),
    'dependencies'
  );
  const readArtifact = deps.readArtifact as GoalBundleEpisodeDependencies['readArtifact'],
    signal = deps.signal as AbortSignal | undefined;
  const pins = new Map<string, GoalBundleEpisodeReceipt>(),
    consumed = new Set<string>(),
    names = new Set<string>();
  check(Array.isArray(receipts) && receipts.length > 0 && receipts.length <= 16000, 'receipts');
  let retainedBytes = 0;
  for (const receipt of receipts) {
    own(receipt, ['name', 'sha256', 'bytes']);
    const targetRpc = target && /^target-rpc-[1-9]\d*-[1-9]\d*\.json$/.test(receipt.name);
    if (targetRpc) {
      const [checkId, id] = receipt.name.slice('target-rpc-'.length, -'.json'.length).split('-').map(Number);
      check(
        Number.isSafeInteger(checkId) && checkId <= clock.checks.length && Number.isSafeInteger(id) && id <= 269,
        'target-receipt-name'
      );
    }
    const semantic =
      targetRpc ||
      /^(?:source|opening|terminal|complete-source|deadline-cancelled-stage|history-pending-[1-9]\d*|history-[1-9]\d*|valuation-[1-9]\d*|quote-context-[1-9]\d*|quote-[1-9]\d*|fee-[1-9]\d*|market-schema-[1-9]\d*|market-state-[1-9]\d*)\.json$/.test(
        receipt.name
      );
    const acquisition =
      /^(?:composition-metadata|metadata-cache-binding|cache-[1-9]\d*|acquisition-[1-9]\d*-\d+-[1-9]\d*|acquisition-prefix-(?:market|history)-\d+)$/.test(
        receipt.name
      );
    check(
      (semantic || acquisition) &&
        receipt.name.length <= 128 &&
        !names.has(receipt.name) &&
        SHA.test(receipt.sha256) &&
        Number.isSafeInteger(receipt.bytes) &&
        receipt.bytes > 0 &&
        receipt.bytes <= 32 * 1024 * 1024 - 1024,
      'receipt'
    );
    retainedBytes += receipt.bytes;
    check(retainedBytes <= 512 * 1024 * 1024, 'retention-budget');
    names.add(receipt.name);
    // Acquisition provenance is owned by the surrounding study reader; it is not extra economic evidence.
    if (semantic) pins.set(receipt.name, receipt);
  }
  const requestSha256 = goalQualificationDigest(request);
  const fresh = () => {
    assertAdmitted();
    check(!signal?.aborted, 'aborted');
  };
  const pin = (name: string) => {
    const found = pins.get(name);
    check(found, 'missing-receipt');
    return { name, valueSha256: found.sha256 };
  };
  const read = async (name: string) => {
    fresh();
    const identity = pin(name),
      receipt = pins.get(name)!;
    check(!consumed.has(name), 'duplicate-read');
    consumed.add(name);
    const controller = new AbortController(),
      abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    const timer = setTimeout(abort, 30000);
    try {
      const bytes = await new Promise<Uint8Array>((resolve, reject) => {
        const cancel = () => reject(Error('goal-bundle-episode:aborted'));
        controller.signal.addEventListener('abort', cancel, { once: true });
        Promise.resolve()
          .then(() => {
            check(!controller.signal.aborted, 'aborted');
            return readArtifact(name, controller.signal);
          })
          .then(
            (value) => {
              controller.signal.removeEventListener('abort', cancel);
              controller.signal.aborted ? cancel() : resolve(value);
            },
            (error) => {
              controller.signal.removeEventListener('abort', cancel);
              reject(error);
            }
          );
        if (controller.signal.aborted) cancel();
      });
      fresh();
      check(bytes instanceof Uint8Array && bytes.length > 0 && bytes.length <= 32 * 1024 * 1024, 'artifact-size');
      const detached = new Uint8Array(bytes),
        value = readGoalRawEnvelope(detached, { ...identity, requestSha256 });
      check(encodedLength(value) === receipt.bytes, 'receipt-bytes');
      return { bytes: detached, value, identity };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      controller.abort();
    }
  };
  type Packet = Awaited<ReturnType<typeof read>>;
  let requests = 0,
    responseBytes = 0,
    active = false,
    opened = false,
    closed = false,
    stopped = false;
  let cancellation: GoalEpisodeDeadlineReceipt | undefined;
  const count = (value: unknown) => {
    check(Array.isArray(value), 'rpc-count');
    for (const row of value) {
      const body = own(row);
      check(typeof body.responseBody === 'string', 'rpc-count');
      requests++;
      responseBytes += new TextEncoder().encode(body.responseBody).length;
      check(
        requests <= manifest.maximumHttpRequests && responseBytes <= manifest.maximumResponseBytes,
        'source-budget'
      );
    }
  };
  const invoke = async <T>(
    stage: string,
    supplied: GoalQualificationEvaluationRequest,
    action: () => Promise<T>
  ): Promise<T> => {
    check(!stopped && !active && !closed && (!cancellation || stage === 'terminal'), 'concurrent-or-closed');
    same(supplied, request, 'request-changed');
    check(stage === 'open' ? !opened : opened, 'not-open');
    active = true;
    try {
      fresh();
      return await action();
    } catch (error) {
      if (error instanceof GoalEpisodeDeadlineCancellation) cancellation = error.receipt;
      else stopped = true;
      throw error;
    } finally {
      active = false;
    }
  };
  const cancelStage = async (
    stage: GoalEpisodeDeadlineReceipt['stage'],
    scheduled: GoalEpisodeClockCheck,
    startedAtMs: number,
    plannedReceivedAtMs: number
  ) => {
    if (plannedReceivedAtMs < request.endAtMs) return;
    check(
      'cancelledAtMs' in scheduled && scheduled.id === clock.checks.length && startedAtMs < request.endAtMs,
      'deadline-cancellation'
    );
    const body = { checkId: scheduled.id, stage, startedAtMs, plannedReceivedAtMs, cancelledAtMs: request.endAtMs };
    const packet = await read('deadline-cancelled-stage.json');
    same(packet.value, { ...body, completed: false, transactionSubmitted: false }, 'deadline-cancellation');
    throw new GoalEpisodeDeadlineCancellation({ ...body, evidenceSha256: packet.identity.valueSha256 });
  };
  let schema: Packet | undefined,
    shard = 0,
    markCount = 0;
  const cache = new Map<number, { verified: Readonly<GoalEpisodeMarkEvidence>; rawSha256: string }>();
  const mark = async (
    selected: GoalBundleValuationBinding['block'],
    name: string,
    captureStartedAtMs: number,
    receivedAtMs: number,
    ageAtMs = receivedAtMs
  ) => {
    check(
      selected.timestampMs <= captureStartedAtMs &&
        captureStartedAtMs <= receivedAtMs &&
        ageAtMs >= selected.timestampMs &&
        ageAtMs - selected.timestampMs <= 60000,
      'stale-state'
    );
    let known = cache.get(selected.height);
    if (!known) {
      if (!schema || markCount === 64) {
        schema = await read(`market-schema-${++shard}.json`);
        markCount = 0;
        count(own(schema.value.evidence).blockEvidence);
      }
      const state = await read(`market-state-${selected.height}.json`),
        projection = await read(name);
      const storageRows = state.value.storageEvidence;
      check(
        Array.isArray(storageRows) && storageRows.length === 1 && own(storageRows[0]).id === markCount + 1,
        'shard-order'
      );
      const expected = {
        requestSha256,
        sourceManifestSha256: plan.source.manifestSha256,
        genesisHash: manifest.genesisHash,
        denominator: binding.denominator,
        runtimeProfiles: plan.runtimeProfiles,
        block: selected,
        captureStartedAtMs,
        receivedAtMs,
        timingKind: timing.kind,
        schema: schema.identity,
        state: state.identity,
        valuation: projection.identity,
      };
      const bytes = { schemaBytes: schema.bytes, stateBytes: state.bytes, valuationBytes: projection.bytes };
      let verified: Readonly<GoalEpisodeMarkEvidence>;
      if (catalogMetadata && catalog) {
        const catalogBinding: GoalBundleCatalogValuationBinding = {
          ...expected,
          source: catalogMetadata.provenance.source,
        };
        const dependencies = { catalog, metadata: catalogMetadata };
        verified =
          name === 'opening.json'
            ? verifyGoalBundleCatalogOpening(catalogBinding, bytes, dependencies)
            : name === 'terminal.json'
              ? verifyGoalBundleCatalogTerminal(catalogBinding, bytes, request.endAtMs, dependencies)
              : verifyGoalBundleCatalogValuation(catalogBinding, bytes, dependencies);
      } else {
        check(!('kind' in metadata), 'metadata-model');
        const legacyBinding: GoalBundleValuationBinding = { ...expected, source: metadata.provenance.source };
        verified =
          name === 'opening.json'
            ? verifyGoalBundleOpening(legacyBinding, bytes)
            : name === 'terminal.json'
              ? verifyGoalBundleTerminal(legacyBinding, bytes, request.endAtMs)
              : verifyGoalBundleValuation(legacyBinding, bytes);
      }
      count(state.value.blockEvidence);
      count(state.value.storageEvidence);
      markCount++;
      known = { verified, rawSha256: state.identity.valueSha256 };
      cache.set(selected.height, known);
      return verified;
    }
    same(selected, known.verified.block, 'cached-block');
    const packet = await read(name),
      projection = { ...known.verified, captureStartedAtMs, receivedAtMs };
    const { evidenceSha256: _prior, ...body } = projection;
    same(packet.value, { ...body, rawSha256: known.rawSha256, timingKind: timing.kind }, 'cached-projection');
    return freeze({ ...body, evidenceSha256: packet.identity.valueSha256 });
  };
  const suppliedCheck = (value: GoalEpisodeClockCheck) => {
    const detached = copy(value),
      expected = clock.checks[detached.id - 1];
    check(expected, 'check');
    same(detached, expected, 'check-changed');
    return expected;
  };
  const histories = new Map<number, number>(),
    valuations = new Map<number, Readonly<GoalEpisodeMarkEvidence>>(),
    quotes = new Set<number>();
  let lastValuation = 0;
  const source: GoalEpisodeEvidenceSource = {
    open: (value, selection) =>
      invoke('open', value, async () => {
        if (phase === 'training') check(selection === undefined, 'validation-unsupported');
        else {
          check(admittedSelection && selection, 'validation-not-sealed');
          same(selection, admittedSelection, 'selection-changed');
          check(
            selection.kind === 'selection-sealed-before-validation' &&
              selection.registrationSha256 === registration.registrationSha256 &&
              selection.candidateSha256 === request.candidateSha256 &&
              selection.validationIdentitySha256 === request.partitionIdentitySha256 &&
              SHA.test(selection.sealSha256),
            'validation-not-sealed'
          );
        }
        const packet = await read('source.json');
        same(
          packet.value,
          {
            manifest,
            request,
            registration,
            selection: selection ?? null,
            metadataReceiptSha256: partition.receiptSha256,
            blocksSha256: partition.blocksSha256,
            clock,
            observedHistoricalArrivals: false,
            observedFill: false,
            transactionSubmitted: false,
          },
          'source-projection'
        );
        const captureStartedAtMs = request.startAtMs - timing.markReadMs;
        const opening = await mark(
          asof(captureStartedAtMs - arrival.finalityDelayMs).block,
          'opening.json',
          captureStartedAtMs,
          request.startAtMs
        );
        opened = true;
        return freeze({ dataSha256: plan.source.manifestSha256, clock: clock.trace, opening });
      }),
    history: (value, raw) =>
      invoke('history', value, async () => {
        const item = copy(raw),
          scheduled = suppliedCheck(item.check);
        check(
          scheduled.id === lastValuation + 1 &&
            !histories.has(scheduled.id) &&
            item.completedAtMs === Math.floor(scheduled.checkedAtMs / HOUR) * HOUR,
          'history-order'
        );
        const successor = asof(item.completedAtMs - 1).successor;
        const notBeforeMs =
          Math.floor(successor.timestampMs / 1000) * 1000 +
          999 +
          arrival.finalityDelayMs +
          timing.indexerPublicationDelayMs;
        if (scheduled.checkedAtMs < notBeforeMs) {
          const pending = {
            kind: 'awaiting-history' as const,
            completedAtMs: item.completedAtMs,
            checkedAtMs: scheduled.checkedAtMs,
            notBeforeMs,
          };
          const packet = await read(`history-pending-${scheduled.id}.json`);
          same(packet.value, { ...pending, successor, marketValuesRead: false }, 'history-pending');
          return freeze({ ...pending, evidenceSha256: packet.identity.valueSha256 });
        }
        await cancelStage('history', scheduled, scheduled.checkedAtMs, scheduled.checkedAtMs + timing.historyReadMs);
        const packet = await read(`history-${scheduled.id}.json`);
        const verified = verifyGoalHistoryArtifact(
          packet.bytes,
          { ...packet.identity, requestSha256 },
          {
            checkId: scheduled.id,
            checkedAtMs: scheduled.checkedAtMs,
            cutoffAtMs: goalClockCheckCutoff(scheduled),
            completedAtMs: item.completedAtMs,
            genesisHash: manifest.genesisHash,
            denominator: binding.denominator,
            historyReadMs: timing.historyReadMs,
            finalityDelayMs: arrival.finalityDelayMs,
            indexerPublicationDelayMs: timing.indexerPublicationDelayMs,
          },
          {
            firstHeight: metadata.firstHeight,
            lastHeight: metadata.lastHeight,
            blockAtHeight: (height) => blocks[height - metadata.firstHeight],
          }
        );
        count(packet.value.rpcEvidence);
        histories.set(scheduled.id, verified.availableAtMs);
        return verified;
      }),
    valuation: (value, raw) =>
      invoke('valuation', value, async () => {
        const item = copy(raw),
          scheduled = suppliedCheck(item.check);
        check(scheduled.id === lastValuation + 1, 'valuation-order');
        const captureStartedAtMs = histories.get(scheduled.id) ?? scheduled.checkedAtMs;
        check(item.notBeforeMs === captureStartedAtMs, 'capture-clock');
        const receivedAtMs = captureStartedAtMs + timing.markReadMs;
        await cancelStage('valuation', scheduled, captureStartedAtMs, receivedAtMs);
        check(receivedAtMs <= goalClockCheckCutoff(scheduled), 'capture-crossed-check');
        const selected = asof(captureStartedAtMs - arrival.finalityDelayMs).block;
        check(
          selected.height >= scheduled.arrival.block.height &&
            (selected.height !== scheduled.arrival.block.height || selected.hash === scheduled.arrival.block.hash),
          'state-before-callback'
        );
        const context = await mark(selected, `valuation-${scheduled.id}.json`, captureStartedAtMs, receivedAtMs);
        valuations.set(scheduled.id, context);
        lastValuation = scheduled.id;
        return context;
      }),
    quote: (value, raw) =>
      invoke('quote', value, async () => {
        const item = copy(raw),
          scheduled = suppliedCheck(item.check),
          valuation = valuations.get(scheduled.id);
        check(valuation && scheduled.id === lastValuation && !quotes.has(scheduled.id), 'quote-order');
        same(valuation, item.valuation, 'quote-valuation');
        check(
          Number.isSafeInteger(item.signalIndex) &&
            item.signalIndex >= 0 &&
            item.signalIndex < 24 &&
            item.decisionAtMs === valuation.receivedAtMs &&
            Math.floor(item.decisionAtMs / HOUR) * HOUR === request.startAtMs + item.signalIndex * HOUR &&
            histories.has(scheduled.id),
          'signal-hour'
        );
        const pending = item.pending;
        check(
          pending.expectedDenominator === binding.denominator &&
            ((pending.assetIn === KUSD && pending.assetOut === XOR) ||
              (pending.assetIn === XOR && pending.assetOut === KUSD)),
          'pending'
        );
        check(
          /^[1-9]\d{0,38}$/.test(pending.amountInCodec) &&
            BigInt(pending.amountInCodec) <=
              BigInt(pending.assetIn === KUSD ? binding.maxTradeKusdCodec : binding.maxTradeXorCodec),
          'input-changed'
        );
        const receivedAtMs = item.decisionAtMs + timing.quoteAndFeeReadMs;
        await cancelStage('quote', scheduled, item.decisionAtMs, receivedAtMs);
        check(
          receivedAtMs <= goalClockCheckCutoff(scheduled) && receivedAtMs - valuation.mark.timestampMs <= 60000,
          'quote-crossed-check'
        );
        const quote = await read(`quote-${scheduled.id}.json`),
          fee = target && !pins.has(`fee-${scheduled.id}.json`) ? undefined : await read(`fee-${scheduled.id}.json`),
          context = await read(`quote-context-${scheduled.id}.json`);
        if (target && executionModel) {
          const raw = quote.value.receipts;
          check(Array.isArray(raw) && raw.length > 0 && raw.length <= 269, 'target-receipts');
          const rpc: Array<Parameters<GoalBundleTargetQuoteDriver['verify']>[1]['rpc'][number]> = [];
          for (const row of raw) {
            const id = own(row).id;
            check(Number.isSafeInteger(id) && (id as number) >= 1 && (id as number) <= 269, 'target-receipt-id');
            const packet = await read(`target-rpc-${scheduled.id}-${id}.json`);
            rpc.push({ ...packet.identity, bytes: packet.bytes });
          }
          const known = cache.get(valuation.block.height);
          check(known && known.verified.block.hash === valuation.block.hash, 'target-source-state');
          const verified = await target.verify(
            {
              requestSha256,
              checkId: scheduled.id,
              finalizedSource: partition.source.finalizedSource,
              valuation,
              pending,
              decisionAtMs: item.decisionAtMs,
              quoteAndFeeReadMs: timing.quoteAndFeeReadMs,
              cutoffAtMs: goalClockCheckCutoff(scheduled),
              timingKind: timing.kind,
              feePolicyId: plan.policy.feePolicyId,
              feePolicySha256: plan.policy.feePolicySha256,
              quote: quote.identity,
              ...(fee ? { fee: fee.identity } : {}),
              context: context.identity,
              executionModel,
              budget: { maxTradeKusdCodec: binding.maxTradeKusdCodec, maxTradeXorCodec: binding.maxTradeXorCodec },
              sourceState: getGoalBundleVerifiedMarketState(known.verified),
            },
            { quoteBytes: quote.bytes, contextBytes: context.bytes, ...(fee ? { feeBytes: fee.bytes } : {}), rpc }
          );
          fresh();
          check(
            Number.isSafeInteger(verified.counts.httpRequests) &&
              verified.counts.httpRequests === raw.length &&
              Number.isSafeInteger(verified.counts.responseBytes) &&
              verified.counts.responseBytes >= 0,
            'target-counts'
          );
          requests += verified.counts.httpRequests;
          responseBytes += verified.counts.responseBytes;
          check(
            requests <= manifest.maximumHttpRequests && responseBytes <= manifest.maximumResponseBytes,
            'source-budget'
          );
          quotes.add(scheduled.id);
          return verified.result;
        }
        check(fee, 'missing-fee');
        const verified = verifyGoalBundleQuote(
          {
            requestSha256,
            checkId: scheduled.id,
            finalizedSource: partition.source.finalizedSource,
            valuation,
            pending,
            decisionAtMs: item.decisionAtMs,
            quoteAndFeeReadMs: timing.quoteAndFeeReadMs,
            cutoffAtMs: goalClockCheckCutoff(scheduled),
            timingKind: timing.kind,
            feePolicyId: plan.policy.feePolicyId,
            feePolicySha256: plan.policy.feePolicySha256,
            quote: quote.identity,
            fee: fee.identity,
            context: context.identity,
          },
          { quoteBytes: quote.bytes, feeBytes: fee.bytes, contextBytes: context.bytes }
        );
        count(quote.value.rpcEvidence);
        count(fee.value.rpcEvidence);
        quotes.add(scheduled.id);
        return verified;
      }),
    terminal: (value) =>
      invoke('terminal', value, async () => {
        check(
          lastValuation === clock.checks.length - (cancellation && cancellation.stage !== 'quote' ? 1 : 0),
          'incomplete-valuations'
        );
        const selected = asof(request.endAtMs),
          captureStartedAtMs = request.endAtMs + arrival.finalityDelayMs;
        const context = await mark(
          selected.block,
          'terminal.json',
          captureStartedAtMs,
          captureStartedAtMs + timing.markReadMs,
          request.endAtMs
        );
        const complete = await read('complete-source.json');
        same(
          complete.value,
          {
            requestSha256,
            requests,
            responseBytes,
            marks: cache.size,
            quotes: quotes.size,
            terminalSuccessor: selected.successor,
            observedHistoricalArrivals: false,
            observedFill: false,
            transactionSubmitted: false,
          },
          'source-completion'
        );
        check(consumed.size === pins.size, 'unused-receipts');
        closed = true;
        schema = undefined;
        return freeze({ context, successor: selected.successor });
      }),
  };
  return Object.freeze(source);
}
