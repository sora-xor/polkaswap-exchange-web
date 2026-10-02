/** Explicit execution-aware research boundary. Certificates are evidence, never wallet authority. */
import { sha256AsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { copyStrategyConfig, validateStrategy } from './engine';
import { toCodec } from './amounts';
import { readGoalExecutionBot } from './goal-storage';
import { isExactInputQuoteWithinImpactLimit } from './quote-impact';
import { HISTORICAL_GOAL_FEE_POLICY } from './execution-codecs/fee';
import {
  createGoalExactLedger,
  markGoalExactLedger,
  assessGoalExactFill,
  settleGoalExactLedger,
  GOAL_EXACT_POLICY,
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
  type GoalExactMark,
  type GoalExactRatio,
} from './goal-exact-ledger';
import type { GoalExecutionBot } from './goal-execution-types';
import type { StrategyConfig, BotDefinition } from './types';
import { GOAL_LIVE_CLOCK_PROTOCOL } from './goal-live-clock';
import {
  GOAL_TARGET_MODEL_PROTOCOL,
  GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
  goalTargetSourceRuntimeProfiles,
  isGoalCatalogTargetExecutionModel,
  GOAL_TARGET_COST_PROTOCOL,
  readGoalTargetExecutionModel,
  assessGoalTargetFee,
  type GoalTargetExecutionModel,
} from './goal-target-model';
import {
  validateGoalQualificationArrivalModel,
  type GoalQualificationArrivalModel,
  type GoalQualificationClockBlock,
} from './goal-qualification-clock';

import {
  GOAL_QUALIFICATION_CLOCK_V2,
  verifyGoalEpisodeClock,
  goalClockCheckCutoff,
  type GoalEpisodeClockTrace,
  type GoalEpisodeDeadlineReceipt,
} from './goal-qualification-clock-v2';
export const GOAL_QUALIFICATION_PROTOCOL = 'finalized-xyk-qualification-v1' as const;
export const GOAL_QUALIFICATION_PROTOCOL_V2 = 'finalized-xyk-qualification-v2' as const;
export const GOAL_EXECUTION_EVIDENCE_V2 = 'finalized-xyk-execution-validation-v2' as const;
export const GOAL_QUALIFICATION_PROTOCOL_V3 = 'finalized-xyk-qualification-v3' as const;
export const GOAL_EXECUTION_EVIDENCE_V3 = 'finalized-xyk-execution-validation-v3' as const;
const HOUR = 3600000,
  DAY = 24 * HOUR,
  U128 = (1n << 128n) - 1n;
/** New declared observation semantics: existing retrospective development results do not satisfy this policy. */
export const GOAL_QUALIFICATION_POLICY = Object.freeze({
  protocol: GOAL_QUALIFICATION_PROTOCOL,
  goalProtocol: 'finalized-xyk-goal-v1',
  targetPercent: '5',
  maximumDrawdownPercent: '5',
  durationMs: DAY,
  initialFeeReserveCodec: '1000000000000000000',
  maximumInitialKusdCodec: '10000000000000000000',
  dexId: 0,
  source: 'XYKPool',
  filter: 'AllowSelected',
  slippageBasisPoints: 50,
  maximumImpactPercent: '1',
  feePolicyId: HISTORICAL_GOAL_FEE_POLICY.id,
  feePolicySha256: u8aToHex(sha256AsU8a(new TextEncoder().encode(JSON.stringify(HISTORICAL_GOAL_FEE_POLICY)))).slice(2),
  clockProtocol: GOAL_LIVE_CLOCK_PROTOCOL,
  observationIntervalMs: 60000,
  scheduling: 'next-due-from-actual-check-start-coalesced-callbacks',
  maximumSchedulerGapMs: 60000,
  maximumTerminalAgeMs: 60000,
  terminalSelection: 'canonical-asof-fixed-deadline',
  maximumFinalizedStateAgeMs: 60000,
  maximumQuoteAgeMsExclusive: 5000,
  observationBasis: 'explicit-observed-or-modeled-finalized-arrival-trace',
  signals: 'completed-hour-only',
  sizing: 'fixed-codec-lots-equal-ceilings-inventory-capped-protected-reserve-v1',
  pendingInput: 'freeze-at-signal-no-execution-resize',
  fillModel: 'minimum-output-hypothetical-no-market-feedback',
  missingData: 'reject-incomplete-no-replacement',
  stoppedHoldings: 'continue-through-fixed-deadline',
  trainingEpisodes: 4,
  validationEpisodes: 2,
  maximumCandidates: 3,
} as const);
/** V2 retains economic limits and declares deadline-cancelled prefixes explicitly. */
export const GOAL_QUALIFICATION_POLICY_V2 = Object.freeze({
  ...GOAL_QUALIFICATION_POLICY,
  protocol: GOAL_QUALIFICATION_PROTOCOL_V2,
  clockProtocol: GOAL_QUALIFICATION_CLOCK_V2,
  deadline: 'cancel-in-flight-check-retain-completed-prefix',
  missingCurrentHour: 'verified-awaiting-history-observe-without-consuming',
} as const);
/** V3 preserves all economic gates and explicitly separates observed source state from target execution. */
export const GOAL_QUALIFICATION_POLICY_V3 = Object.freeze({
  ...GOAL_QUALIFICATION_POLICY_V2,
  protocol: GOAL_QUALIFICATION_PROTOCOL_V3,
  executionModel: GOAL_TARGET_MODEL_PROTOCOL,
  costProtocol: GOAL_TARGET_COST_PROTOCOL,
} as const);
/** The finite catalog model has a distinct policy identity without changing the V3 economic limits. */
export const GOAL_QUALIFICATION_POLICY_CATALOG_V3 = Object.freeze({
  ...GOAL_QUALIFICATION_POLICY_V3,
  executionModel: GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
} as const);
/** Return the exact version/model policy; omitted V3 models retain the original source130 policy. */
export function goalQualificationPolicy(
  protocol: GoalQualificationPlan['protocol'],
  executionModel?: GoalTargetExecutionModel
) {
  check(
    protocol === GOAL_QUALIFICATION_PROTOCOL ||
      protocol === GOAL_QUALIFICATION_PROTOCOL_V2 ||
      protocol === GOAL_QUALIFICATION_PROTOCOL_V3
  );
  if (protocol === GOAL_QUALIFICATION_PROTOCOL_V3) {
    return executionModel && isGoalCatalogTargetExecutionModel(readGoalTargetExecutionModel(executionModel))
      ? GOAL_QUALIFICATION_POLICY_CATALOG_V3
      : GOAL_QUALIFICATION_POLICY_V3;
  }
  check(executionModel === undefined);
  return protocol === GOAL_QUALIFICATION_PROTOCOL_V2 ? GOAL_QUALIFICATION_POLICY_V2 : GOAL_QUALIFICATION_POLICY;
}
/** Bind an evaluator/evidence version to its plan version; unknown protocols are rejected. */
export function goalQualificationEvidenceProtocol(protocol: GoalQualificationPlan['protocol']) {
  goalQualificationPolicy(protocol);
  if (protocol === GOAL_QUALIFICATION_PROTOCOL_V3) return GOAL_EXECUTION_EVIDENCE_V3;
  return protocol === GOAL_QUALIFICATION_PROTOCOL_V2
    ? GOAL_EXECUTION_EVIDENCE_V2
    : ('finalized-xyk-execution-validation-v1' as const);
}
export interface GoalQualificationRuntimeProfile {
  specVersion: 128 | 129 | 130 | 131;
  transactionVersion: 128 | 129 | 130 | 131;
  metadataSha256: string;
  codeHash: string;
}
export interface GoalQualificationBinding {
  genesisHash: string;
  denominator: string;
  initialKusdCodec: string;
  maxTradeKusdCodec: string;
  maxTradeXorCodec: string;
  strategy: StrategyConfig;
}
export interface GoalQualificationPlan {
  protocol:
    | typeof GOAL_QUALIFICATION_PROTOCOL
    | typeof GOAL_QUALIFICATION_PROTOCOL_V2
    | typeof GOAL_QUALIFICATION_PROTOCOL_V3;
  studyId: string;
  policy:
    | typeof GOAL_QUALIFICATION_POLICY
    | typeof GOAL_QUALIFICATION_POLICY_V2
    | typeof GOAL_QUALIFICATION_POLICY_V3
    | typeof GOAL_QUALIFICATION_POLICY_CATALOG_V3;
  source: { sourceId: string; manifestSha256: string; collectorSha256: string; evaluatorSha256: string };
  runtimeProfiles: readonly GoalQualificationRuntimeProfile[];
  /** Required only in v3. runtimeProfiles continues to describe historical source provenance. */
  executionModel?: GoalTargetExecutionModel;
  arrivalModel: GoalQualificationArrivalModel;
  training: { identitySha256: string; startAtMs: number; endAtMs: number };
  validation: { identitySha256: string; startAtMs: number; endAtMs: number };
  candidates: readonly GoalQualificationBinding[];
}
export interface GoalQualificationSignal {
  index: number;
  checkId: number;
  completedAtMs: number;
  /** Recorded or explicitly modeled receipt of completed-hour evidence; never relabeled block time. */
  availableAtMs: number;
  decisionAtMs: number;
  action: 'hold' | 'stopped' | 'rejected' | 'filled' | 'deadline-cancelled';
  evidenceSha256: string;
}
export interface GoalQualificationValuation {
  kind: 'valuation';
  checkId: number;
  /** Both times use the plan's declared observed-or-modeled provenance. */
  captureStartedAtMs: number;
  receivedAtMs: number;
  mark: GoalExactMark;
  evidenceSha256: string;
  /** Required only by the finite catalog model; joins each source valuation to its quote. */
  runtimeProfileSha256?: string;
}
export interface GoalQualificationFill {
  kind: 'minimum-output-fill';
  signalIndex: number;
  contextReceivedAtMs: number;
  receivedAtMs: number;
  mark: GoalExactMark;
  inputAsset: string;
  inputCodec: string;
  outputAsset: string;
  quotedOutputCodec: string;
  withoutImpactCodec: string;
  minimumOutputCodec: string;
  feeCodec: string;
  queryInfoFeeCodec: string;
  queryDetailsFeeCodec: string;
  runtimeProfileSha256: string;
  /** V3 binds the distinct historical state and execution model as well as the target runtime digest above. */
  sourceRuntimeProfileSha256?: string;
  executionModelSha256?: string;
  quoteEvidenceSha256: string;
  feeEvidenceSha256: string;
}
/** Full bounded accounting trace from the trusted causal evaluator, not a supplied performance summary. */
export interface GoalQualificationEpisodeEvidence {
  protocol:
    | 'finalized-xyk-execution-validation-v1'
    | typeof GOAL_EXECUTION_EVIDENCE_V2
    | typeof GOAL_EXECUTION_EVIDENCE_V3;
  requestSha256: string;
  dataSha256: string;
  opening: { fundedAtMs: number; receivedAtMs: number; mark: GoalExactMark; evidenceSha256: string };
  clock: GoalEpisodeClockTrace;
  deadlineCancellation?: GoalEpisodeDeadlineReceipt | null;
  terminal: {
    accountingAtMs: number;
    mark: GoalExactMark;
    successor: GoalQualificationClockBlock;
    evidenceSha256: string;
  };
  signals: readonly GoalQualificationSignal[];
  events: readonly (GoalQualificationValuation | GoalQualificationFill)[];
}
export interface GoalQualificationEpisodeSummary {
  startAtMs: number;
  endAtMs: number;
  dataSha256: string;
  evidenceSha256: string;
  openingValue: GoalExactRatio;
  endingValue: GoalExactRatio;
  benchmarkEndingValue: GoalExactRatio;
  netReturn: GoalExactRatio;
  excessReturn: GoalExactRatio;
  netChange: GoalExactRatio;
  excessChange: GoalExactRatio;
  maximumDrawdown: GoalExactRatio;
  fills: number;
  feesPaidCodec: string;
  outcome: 'target' | 'loss' | 'expired';
}
export interface GoalQualificationCertificate {
  protocol: GoalQualificationPlan['protocol'];
  plan: GoalQualificationPlan;
  registration: GoalQualificationRegistration;
  selection: GoalQualificationSelection;
  training: readonly { candidateSha256: string; episodes: readonly GoalQualificationEpisodeSummary[] }[];
  validation: readonly GoalQualificationEpisodeSummary[];
  certificateSha256: string;
}
export interface GoalQualificationRegistration {
  planSha256: string;
  registrationSha256: string;
  trainingIdentitySha256: string;
  validationIdentitySha256: string;
  /** The trusted persistent evaluator records this before training, not an untrusted caller flag. */
  kind: 'preregistered-unopened-validation';
}
export interface GoalQualificationSelection {
  registrationSha256: string;
  candidateSha256: string;
  trainingSha256: string;
  sealSha256: string;
  validationIdentitySha256: string;
  kind: 'selection-sealed-before-validation';
}
export interface GoalQualificationEvaluationRequest {
  planSha256: string;
  candidate: GoalQualificationBinding;
  candidateSha256: string;
  phase: 'training' | 'validation';
  partitionIdentitySha256: string;
  startAtMs: number;
  endAtMs: number;
  episodeIndex: number;
}
/**
 * Trusted application dependency, never an AI/tool payload. It owns canonical raw evidence, deterministic
 * causal strategy replay, persistent preregistration and sealed/read-once validation access. No shipped
 * development reader implements this contract. Reverification must replay the same immutable evidence.
 */
export interface GoalQualificationEvaluator {
  protocol: GoalQualificationEpisodeEvidence['protocol'];
  sourceSha256: string;
  register(
    plan: Readonly<GoalQualificationPlan>,
    restored?: Readonly<GoalQualificationCertificate>
  ): Promise<GoalQualificationRegistration>;
  evaluate(
    request: Readonly<GoalQualificationEvaluationRequest>,
    selection?: Readonly<GoalQualificationSelection>
  ): Promise<GoalQualificationEpisodeEvidence>;
  sealSelection(
    input: Readonly<Omit<GoalQualificationSelection, 'sealSha256' | 'kind'>>,
    restored?: Readonly<GoalQualificationSelection>
  ): Promise<GoalQualificationSelection>;
}
export interface GoalQualificationVerification {
  readonly certificateSha256: string;
  readonly policySha256: string;
  readonly binding: Readonly<GoalQualificationBinding>;
  readonly runtimeProfiles: readonly GoalQualificationRuntimeProfile[];
  /** Present only for an owned v3 verification; the live executor must also enforce its monetary fee cap. */
  readonly executionModel?: GoalTargetExecutionModel;
  /** Configuration/evidence validity only. The executor separately checks current runtime and consent. */
  assertCurrent(bot: GoalExecutionBot): void;
}
const owners = new WeakMap<object, (bot: GoalExecutionBot) => void>();
export const GOAL_QUALIFICATION_RELEASE_PROTOCOL = 'polkaswap-goal-release-v1' as const;
export const GOAL_QUALIFICATION_RELEASE_MAX_BYTES = 256 * 1024;
/** A release is an attestation by the trusted application publisher, not a user-importable certificate. */
export interface GoalQualificationRelease {
  protocol: typeof GOAL_QUALIFICATION_RELEASE_PROTOCOL;
  bundleIndexSha256: string;
  certificate: GoalQualificationCertificate;
}
/** These pins must come from shipped application configuration, never page parameters or AI output. */
export interface GoalQualificationReleasePins {
  sha256: string;
  bundleIndexSha256: string;
  certificateSha256: string;
}
const invalid = (): never => {
  throw Error('bots.errors.research');
};
function check(value: unknown): asserts value {
  if (!value) invalid();
}
function copy<T>(raw: T): T {
  let nodes = 0,
    chars = 0;
  const visit = (v: unknown, depth: number): unknown => {
    check(++nodes <= 800000 && depth <= 24);
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'number') {
      check(Number.isSafeInteger(v));
      return v;
    }
    if (typeof v === 'string') {
      chars += v.length;
      check(v.length <= 100000 && chars <= 24000000);
      return v;
    }
    check(v && typeof v === 'object');
    const d = Object.getOwnPropertyDescriptors(v),
      keys = Reflect.ownKeys(d);
    if (Array.isArray(v)) {
      check(Object.getPrototypeOf(v) === Array.prototype && v.length <= 30000 && keys.length === v.length + 1);
      return Object.freeze(
        Array.from({ length: v.length }, (_, i) => {
          check(d[i]?.enumerable && 'value' in d[i]);
          return visit(d[i].value, depth + 1);
        })
      );
    }
    check([Object.prototype, null].includes(Object.getPrototypeOf(v)) && keys.length <= 64);
    return Object.freeze(
      Object.fromEntries(
        keys.map((k) => {
          check(typeof k === 'string' && d[k].enumerable && 'value' in d[k]);
          return [k, visit(d[k].value, depth + 1)];
        })
      )
    );
  };
  return visit(raw, 0) as T;
}
function fields(v: object, names: readonly string[]) {
  const keys = Object.keys(v);
  check(keys.length === names.length && names.every((k) => keys.includes(k)));
}
function canonical(v: unknown): string {
  return Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
}
export function goalQualificationDigest(value: unknown): string {
  return u8aToHex(sha256AsU8a(new TextEncoder().encode(canonical(copy(value))))).slice(2);
}
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);
function sha(v: unknown) {
  check(typeof v === 'string' && /^[0-9a-f]{64}$/.test(v));
}
function time(v: unknown) {
  check(Number.isSafeInteger(v) && Number(v) >= 0);
}
function amount(v: unknown, positive = true): bigint {
  check(typeof v === 'string' && /^(0|[1-9]\d{0,38})$/.test(v));
  const n = BigInt(v);
  check(n <= U128 && (!positive || n > 0n));
  return n;
}
function fraction(n: bigint, d: bigint): GoalExactRatio {
  check(d > 0n);
  let a = n < 0n ? -n : n,
    b = d;
  while (b) [a, b] = [b, a % b];
  return { numerator: String(n / (a || 1n)), denominator: String(d / (a || 1n)) };
}
function difference(end: GoalExactRatio, base: GoalExactRatio) {
  return fraction(
    BigInt(end.numerator) * BigInt(base.denominator) - BigInt(base.numerator) * BigInt(end.denominator),
    BigInt(end.denominator) * BigInt(base.denominator)
  );
}
function returnRatio(end: GoalExactRatio, base: GoalExactRatio) {
  return fraction(
    BigInt(end.numerator) * BigInt(base.denominator) - BigInt(base.numerator) * BigInt(end.denominator),
    BigInt(end.denominator) * BigInt(base.numerator)
  );
}
function excessRatio(end: GoalExactRatio, held: GoalExactRatio, base: GoalExactRatio) {
  return fraction(
    (BigInt(end.numerator) * BigInt(held.denominator) - BigInt(held.numerator) * BigInt(end.denominator)) *
      BigInt(base.denominator),
    BigInt(end.denominator) * BigInt(held.denominator) * BigInt(base.numerator)
  );
}
function average(
  rows: readonly GoalQualificationEpisodeSummary[],
  key: 'netReturn' | 'excessReturn' | 'netChange' | 'excessChange'
) {
  let n = 0n,
    d = 1n;
  for (const row of rows) {
    n = n * BigInt(row[key].denominator) + BigInt(row[key].numerator) * d;
    d *= BigInt(row[key].denominator);
    const r = fraction(n, d);
    n = BigInt(r.numerator);
    d = BigInt(r.denominator);
  }
  return fraction(n, d * BigInt(rows.length));
}
function compare(a: GoalExactRatio, b: GoalExactRatio) {
  return BigInt(a.numerator) * BigInt(b.denominator) - BigInt(b.numerator) * BigInt(a.denominator);
}
function eligible(rows: readonly GoalQualificationEpisodeSummary[]) {
  return (
    rows.some((r) => r.fills > 0) &&
    BigInt(average(rows, 'netReturn').numerator) > 0n &&
    BigInt(average(rows, 'excessReturn').numerator) > 0n &&
    BigInt(average(rows, 'netChange').numerator) > 0n &&
    BigInt(average(rows, 'excessChange').numerator) > 0n &&
    rows.every((r) => BigInt(r.maximumDrawdown.numerator) * 20n <= BigInt(r.maximumDrawdown.denominator))
  );
}
function binding(raw: GoalQualificationBinding): GoalQualificationBinding {
  fields(raw, ['genesisHash', 'denominator', 'initialKusdCodec', 'maxTradeKusdCodec', 'maxTradeXorCodec', 'strategy']);
  check(raw.genesisHash === GOAL_EXACT_POLICY.genesisHash);
  amount(raw.denominator);
  const initial = amount(raw.initialKusdCodec),
    limit = amount(raw.maxTradeKusdCodec);
  amount(raw.maxTradeXorCodec);
  check(initial <= 10n ** 19n && limit < initial);
  const strategy = copyStrategyConfig(raw.strategy);
  check(
    same(strategy, raw.strategy) &&
      strategy.kind !== 'ai' &&
      strategy.prompt === '' &&
      !(strategy.kind === 'sma' && strategy.signalTiming === 'live-price')
  );
  check(
    strategy.intervalMs >= HOUR &&
      strategy.intervalMs <= DAY &&
      strategy.intervalMs % HOUR === 0 &&
      toCodec(strategy.amount, 18) === raw.maxTradeKusdCodec
  );
  validateStrategy({
    strategy,
    assetIn: { address: KUSD, symbol: 'KUSD', decimals: 18 },
    assetOut: { address: XOR, symbol: 'XOR', decimals: 18 },
  } as BotDefinition);
  return raw;
}
/** Structural sizing/strategy parser only; it does not mint qualification or authenticate evidence. */
export function readGoalQualificationBinding(raw: unknown): GoalQualificationBinding {
  return binding(copy(raw) as GoalQualificationBinding);
}
function plan(
  raw: GoalQualificationPlan,
  version = GOAL_QUALIFICATION_PROTOCOL as GoalQualificationPlan['protocol']
): GoalQualificationPlan {
  const p = copy(raw);
  fields(p, [
    'protocol',
    'studyId',
    'policy',
    'source',
    'runtimeProfiles',
    'arrivalModel',
    'training',
    'validation',
    'candidates',
    ...(version === GOAL_QUALIFICATION_PROTOCOL_V3 ? ['executionModel'] : []),
  ]);
  check(p.protocol === version && same(p.policy, goalQualificationPolicy(version, p.executionModel)));
  validateGoalQualificationArrivalModel(p.arrivalModel);
  check(typeof p.studyId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(p.studyId));
  fields(p.source, ['sourceId', 'manifestSha256', 'collectorSha256', 'evaluatorSha256']);
  check(typeof p.source.sourceId === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(p.source.sourceId));
  for (const key of ['manifestSha256', 'collectorSha256', 'evaluatorSha256'] as const) sha(p.source[key]);
  const model = version === GOAL_QUALIFICATION_PROTOCOL_V3 ? readGoalTargetExecutionModel(p.executionModel) : undefined;
  const catalog = model && isGoalCatalogTargetExecutionModel(model);
  // The new model pins one exact ordered set; other versions retain their single-runtime contract.
  check(Array.isArray(p.runtimeProfiles) && p.runtimeProfiles.length === (catalog ? 3 : 1));
  for (const r of p.runtimeProfiles) {
    fields(r, ['specVersion', 'transactionVersion', 'metadataSha256', 'codeHash']);
    check((catalog ? [128, 129, 130] : [130, 131]).includes(r.specVersion) && r.transactionVersion === r.specVersion);
    sha(r.metadataSha256);
    check(/^0x[0-9a-f]{64}$/.test(r.codeHash));
  }
  check(new Set(p.runtimeProfiles.map(goalQualificationDigest)).size === p.runtimeProfiles.length);
  if (model) check(same(p.runtimeProfiles, goalTargetSourceRuntimeProfiles(model)));
  for (const part of [p.training, p.validation]) {
    fields(part, ['identitySha256', 'startAtMs', 'endAtMs']);
    sha(part.identitySha256);
    time(part.startAtMs);
    time(part.endAtMs);
    check(part.startAtMs >= HOUR && part.startAtMs % HOUR === 0 && part.endAtMs % HOUR === 0);
  }
  // Preserve the established 4 full training episodes +20h tail,2h embargo,2 validation episodes +1h tail.
  check(
    p.training.endAtMs - p.training.startAtMs === 116 * HOUR &&
      p.validation.startAtMs === p.training.endAtMs + 2 * HOUR &&
      p.validation.endAtMs - p.validation.startAtMs === 49 * HOUR &&
      p.training.identitySha256 !== p.validation.identitySha256
  );
  check(p.candidates.length >= 1 && p.candidates.length <= 3);
  p.candidates.forEach(binding);
  check(new Set(p.candidates.map(goalQualificationDigest)).size === p.candidates.length);
  const first = p.candidates[0];
  check(
    p.candidates.every(
      (b) =>
        b.genesisHash === first.genesisHash &&
        b.denominator === first.denominator &&
        b.initialKusdCodec === first.initialKusdCodec
    )
  );
  return p;
}
/** Recompute exact economics on the recorded/modeled live scheduler's actual check timeline. */
function episode(
  request: GoalQualificationEvaluationRequest,
  raw: GoalQualificationEpisodeEvidence,
  profiles: readonly GoalQualificationRuntimeProfile[],
  arrivalModel: GoalQualificationArrivalModel,
  protocol: GoalQualificationPlan['protocol'],
  executionModel?: GoalTargetExecutionModel
): GoalQualificationEpisodeSummary {
  const e = copy(raw);
  const v3 = protocol === GOAL_QUALIFICATION_PROTOCOL_V3;
  const v2 = protocol !== GOAL_QUALIFICATION_PROTOCOL;
  const model = v3 ? readGoalTargetExecutionModel(executionModel) : undefined;
  const catalog = model && isGoalCatalogTargetExecutionModel(model);
  fields(e, [
    'protocol',
    'requestSha256',
    'dataSha256',
    'opening',
    'clock',
    'terminal',
    'signals',
    'events',
    ...(v2 ? ['deadlineCancellation'] : []),
  ]);
  check(
    e.protocol === goalQualificationEvidenceProtocol(protocol) && e.requestSha256 === goalQualificationDigest(request)
  );
  check(e.clock.protocol === goalQualificationPolicy(protocol).clockProtocol);
  sha(e.dataSha256);
  const checks = verifyGoalEpisodeClock(e.clock, arrivalModel, {
    startAtMs: request.startAtMs,
    endAtMs: request.endAtMs,
  });
  // Keep the first match, as find did, even if a future clock verifier permits duplicate IDs.
  const checksById = new Map<number, (typeof checks)[number]>();
  for (const scheduled of checks) if (!checksById.has(scheduled.id)) checksById.set(scheduled.id, scheduled);
  const cancellation = e.deadlineCancellation;
  const cancelled = checks.find((c) => 'cancelledAtMs' in c);
  if (cancellation) {
    fields(cancellation, ['checkId', 'stage', 'startedAtMs', 'plannedReceivedAtMs', 'cancelledAtMs', 'evidenceSha256']);
    check(v2 && cancelled && cancellation.checkId === cancelled.id && cancellation.cancelledAtMs === request.endAtMs);
    check(
      cancellation.plannedReceivedAtMs > cancellation.startedAtMs &&
        cancellation.plannedReceivedAtMs - cancellation.startedAtMs <= (cancellation.stage === 'history' ? 60000 : 4999)
    );
    time(cancellation.startedAtMs);
    time(cancellation.plannedReceivedAtMs);
    sha(cancellation.evidenceSha256);
    check(
      cancellation.startedAtMs >= cancelled.checkedAtMs &&
        cancellation.startedAtMs < request.endAtMs &&
        cancellation.plannedReceivedAtMs >= request.endAtMs &&
        ['history', 'valuation', 'quote'].includes(cancellation.stage)
    );
  }
  const omittedValuation = cancellation && cancellation.stage !== 'quote' ? cancellation.checkId : null;
  const expectedValuations = checks.length - (omittedValuation === null ? 0 : 1);
  check(e.signals.length === 24 && e.events.length >= expectedValuations && e.events.length <= checks.length + 24);
  const knownBlocks = new Map<number, GoalQualificationClockBlock>(),
    knownHashes = new Map<string, number>();
  for (const event of e.clock.events)
    if (event.kind === 'callback') {
      knownBlocks.set(event.block.height, event.block);
      knownHashes.set(event.block.hash, event.block.height);
    }
  const sameKnownState = (height: number, hash: string, timestampMs: number) => {
    const known = knownBlocks.get(height),
      knownHeight = knownHashes.get(hash);
    check(
      (!known || (known.hash === hash && known.timestampMs === timestampMs)) &&
        (knownHeight === undefined || knownHeight === height)
    );
  };

  fields(e.opening, ['fundedAtMs', 'receivedAtMs', 'mark', 'evidenceSha256']);
  sha(e.opening.evidenceSha256);
  time(e.opening.receivedAtMs);
  check(
    e.opening.fundedAtMs === request.startAtMs &&
      e.opening.receivedAtMs <= request.startAtMs &&
      request.startAtMs - e.opening.receivedAtMs < 5000 &&
      e.opening.mark.timestampMs <= e.opening.receivedAtMs &&
      e.opening.mark.denominator === request.candidate.denominator
  );
  sameKnownState(e.opening.mark.blockNumber, e.opening.mark.blockHash, e.opening.mark.timestampMs);
  e.signals.forEach((s, index) => {
    fields(s, ['index', 'checkId', 'completedAtMs', 'availableAtMs', 'decisionAtMs', 'action', 'evidenceSha256']);
    check(s.index === index && s.completedAtMs === request.startAtMs + index * HOUR);
    time(s.availableAtMs);
    time(s.decisionAtMs);
    sha(s.evidenceSha256);
    const scheduled = checksById.get(s.checkId);
    check(scheduled);
    check(
      s.availableAtMs >= s.completedAtMs &&
        s.decisionAtMs >= s.availableAtMs &&
        s.decisionAtMs >= scheduled.checkedAtMs &&
        s.decisionAtMs <= goalClockCheckCutoff(scheduled) &&
        s.decisionAtMs < s.completedAtMs + HOUR
    );
    check(['hold', 'stopped', 'rejected', 'filled', ...(v2 ? ['deadline-cancelled'] : [])].includes(s.action));
    check(
      (s.action === 'deadline-cancelled') ===
        Boolean(cancellation?.stage === 'quote' && cancellation.checkId === s.checkId)
    );
  });
  const config = {
    goalId: 'qualification-episode',
    startedAtMs: request.startAtMs,
    initialKusdCodec: request.candidate.initialKusdCodec,
    maxTradeKusdCodec: request.candidate.maxTradeKusdCodec,
    maxTradeXorCodec: request.candidate.maxTradeXorCodec,
  };
  let ledger = createGoalExactLedger(config, e.opening.mark),
    benchmark = createGoalExactLedger(config, e.opening.mark),
    lastAt = request.startAtMs,
    lastKind = 'valuation';
  const fills = new Set<number>(),
    valuations = new Map<number, GoalQualificationValuation>(),
    runtimeHashes = profiles.map(goalQualificationDigest);
  const sourceProfilesByBlock = new Map<string, string>();
  for (const event of e.events) {
    check(event.mark.denominator === request.candidate.denominator);
    sameKnownState(event.mark.blockNumber, event.mark.blockHash, event.mark.timestampMs);
    time(event.receivedAtMs);
    const at = event.receivedAtMs;
    check(
      at >= lastAt &&
        at < request.endAtMs &&
        !(at === lastAt && lastKind === 'minimum-output-fill' && event.kind === 'valuation')
    );
    check(event.mark.timestampMs <= at && at - event.mark.timestampMs <= 60000);
    if (event.kind === 'valuation') {
      fields(event, [
        'kind',
        'checkId',
        'captureStartedAtMs',
        'receivedAtMs',
        'mark',
        'evidenceSha256',
        ...(catalog ? ['runtimeProfileSha256'] : []),
      ]);
      if (catalog) {
        check(runtimeHashes.includes(event.runtimeProfileSha256!));
        const prior = sourceProfilesByBlock.get(event.mark.blockHash);
        check(prior === undefined || prior === event.runtimeProfileSha256);
        sourceProfilesByBlock.set(event.mark.blockHash, event.runtimeProfileSha256!);
      }
      sha(event.evidenceSha256);
      const scheduled = checksById.get(event.checkId);
      check(scheduled && !valuations.has(event.checkId) && event.checkId !== omittedValuation);
      time(event.captureStartedAtMs);
      check(
        event.captureStartedAtMs >= scheduled.checkedAtMs &&
          at >= event.captureStartedAtMs &&
          at <= goalClockCheckCutoff(scheduled) &&
          at - event.captureStartedAtMs < 5000
      );
      // Capture may return a newer finalized state than the callback; never an older one.
      check(
        event.mark.blockNumber >= scheduled.arrival.block.height &&
          (event.mark.blockNumber !== scheduled.arrival.block.height ||
            event.mark.blockHash === scheduled.arrival.block.hash)
      );
      ledger = markGoalExactLedger(ledger, { expectedRevision: ledger.revision, accountingAtMs: at, mark: event.mark });
      benchmark = markGoalExactLedger(benchmark, {
        expectedRevision: benchmark.revision,
        accountingAtMs: at,
        mark: event.mark,
      });
      valuations.set(event.checkId, event);
    } else {
      fields(event, [
        'kind',
        'signalIndex',
        'contextReceivedAtMs',
        'receivedAtMs',
        'mark',
        'inputAsset',
        'inputCodec',
        'outputAsset',
        'quotedOutputCodec',
        'withoutImpactCodec',
        'minimumOutputCodec',
        'feeCodec',
        'queryInfoFeeCodec',
        'queryDetailsFeeCodec',
        'runtimeProfileSha256',
        'quoteEvidenceSha256',
        'feeEvidenceSha256',
        ...(v3 ? ['sourceRuntimeProfileSha256', 'executionModelSha256'] : []),
      ]);
      check(
        event.kind === 'minimum-output-fill' &&
          Number.isSafeInteger(event.signalIndex) &&
          event.signalIndex >= 0 &&
          event.signalIndex < 24 &&
          !fills.has(event.signalIndex)
      );
      const signal = e.signals[event.signalIndex],
        scheduled = checksById.get(signal.checkId)!;
      check(
        signal.action === 'filled' &&
          at >= signal.decisionAtMs &&
          at <= goalClockCheckCutoff(scheduled) &&
          valuations.has(signal.checkId)
      );
      check(event.signalIndex === 23 || at < e.signals[event.signalIndex + 1].decisionAtMs);
      time(event.contextReceivedAtMs);
      check(
        event.contextReceivedAtMs >= signal.decisionAtMs &&
          event.contextReceivedAtMs <= at &&
          at - event.contextReceivedAtMs < 5000
      );
      check(
        (event.inputAsset === KUSD && event.outputAsset === XOR) ||
          (event.inputAsset === XOR && event.outputAsset === KUSD)
      );
      amount(event.inputCodec);
      const reserve = 10n ** 18n - BigInt(ledger.feesPaidCodec);
      const spendable =
        event.inputAsset === KUSD ? BigInt(ledger.holdings.kusdCodec) : BigInt(ledger.holdings.xorCodec) - reserve;
      const lot = BigInt(
        event.inputAsset === KUSD ? request.candidate.maxTradeKusdCodec : request.candidate.maxTradeXorCodec
      );
      check(spendable > 0n && event.inputCodec === String(lot < spendable ? lot : spendable));
      const out = amount(event.quotedOutputCodec);
      amount(event.minimumOutputCodec);
      check(event.minimumOutputCodec === String((out * 9950n) / 10000n));
      check(isExactInputQuoteWithinImpactLimit(event.quotedOutputCodec, event.withoutImpactCodec, '1'));
      amount(event.feeCodec);
      if (model) {
        const fee = assessGoalTargetFee({
          model,
          queryInfoFeeCodec: event.queryInfoFeeCodec,
          queryDetailsFeeCodec: event.queryDetailsFeeCodec,
        });
        check(fee.withinLiveCap && event.feeCodec === fee.modeledFeeCodec);
        check(
          runtimeHashes.includes(event.sourceRuntimeProfileSha256!) &&
            (!catalog ||
              (event.sourceRuntimeProfileSha256 === valuations.get(signal.checkId)!.runtimeProfileSha256 &&
                same(event.mark, valuations.get(signal.checkId)!.mark))) &&
            event.runtimeProfileSha256 === goalQualificationDigest(model.targetRuntimeProfile) &&
            event.executionModelSha256 === goalQualificationDigest(model)
        );
      } else {
        check(event.feeCodec === event.queryInfoFeeCodec && event.feeCodec === event.queryDetailsFeeCodec);
        check(runtimeHashes.includes(event.runtimeProfileSha256));
      }
      sha(event.quoteEvidenceSha256);
      sha(event.feeEvidenceSha256);
      const fill = {
        inputAsset: event.inputAsset,
        inputCodec: event.inputCodec,
        outputAsset: event.outputAsset,
        minimumOutputCodec: event.minimumOutputCodec,
        feeCeilingCodec: event.feeCodec,
      };
      const assessed = assessGoalExactFill(ledger, {
        expectedRevision: ledger.revision,
        accountingAtMs: at,
        mark: event.mark,
        fill,
      });
      check(!assessed.rejection);
      ledger = settleGoalExactLedger(assessed.state, {
        expectedRevision: assessed.state.revision,
        accountingAtMs: at,
        mark: event.mark,
        orderId: `signal-${event.signalIndex}`,
        receipt: {
          blockHash: event.mark.blockHash,
          blockNumber: event.mark.blockNumber,
          extrinsicHash: `0x${goalQualificationDigest({ requestSha256: e.requestSha256, signalIndex: event.signalIndex })}`,
          extrinsicIndex: event.signalIndex,
        },
        fill,
        success: true,
        actualOutputCodec: event.minimumOutputCodec,
        actualFeeCodec: event.feeCodec,
      }).state;
      check(!ledger.attention.length);
      benchmark = markGoalExactLedger(benchmark, {
        expectedRevision: benchmark.revision,
        accountingAtMs: at,
        mark: event.mark,
      });
      fills.add(event.signalIndex);
    }
    lastAt = at;
    lastKind = event.kind;
  }
  check(
    valuations.size === expectedValuations && e.signals.every((s) => (s.action === 'filled') === fills.has(s.index))
  );
  for (const signal of e.signals) check(valuations.get(signal.checkId)!.receivedAtMs <= signal.decisionAtMs);
  const terminal = e.terminal;
  fields(terminal, ['accountingAtMs', 'mark', 'successor', 'evidenceSha256']);
  sha(terminal.evidenceSha256);
  fields(terminal.successor, ['height', 'hash', 'parentHash', 'timestampMs']);
  time(terminal.successor.timestampMs);
  check(
    terminal.accountingAtMs === request.endAtMs &&
      terminal.mark.denominator === request.candidate.denominator &&
      terminal.mark.timestampMs <= request.endAtMs &&
      request.endAtMs - terminal.mark.timestampMs <= 60000 &&
      terminal.successor.height === terminal.mark.blockNumber + 1 &&
      terminal.successor.parentHash === terminal.mark.blockHash &&
      /^0x[0-9a-f]{64}$/.test(terminal.successor.hash) &&
      terminal.successor.hash !== terminal.mark.blockHash &&
      terminal.successor.timestampMs > request.endAtMs
  );
  sameKnownState(terminal.mark.blockNumber, terminal.mark.blockHash, terminal.mark.timestampMs);
  sameKnownState(terminal.successor.height, terminal.successor.hash, terminal.successor.timestampMs);
  ledger = markGoalExactLedger(ledger, {
    expectedRevision: ledger.revision,
    accountingAtMs: request.endAtMs,
    mark: terminal.mark,
  });
  benchmark = markGoalExactLedger(benchmark, {
    expectedRevision: benchmark.revision,
    accountingAtMs: request.endAtMs,
    mark: terminal.mark,
  });
  check(ledger.outcome !== 'active');
  return copy({
    startAtMs: request.startAtMs,
    endAtMs: request.endAtMs,
    dataSha256: e.dataSha256,
    evidenceSha256: goalQualificationDigest(e),
    openingValue: ledger.openingValue,
    endingValue: ledger.latestValue,
    benchmarkEndingValue: benchmark.latestValue,
    netReturn: returnRatio(ledger.latestValue, ledger.openingValue),
    excessReturn: excessRatio(ledger.latestValue, benchmark.latestValue, ledger.openingValue),
    netChange: difference(ledger.latestValue, ledger.openingValue),
    excessChange: difference(ledger.latestValue, benchmark.latestValue),
    maximumDrawdown: ledger.maximumDrawdownRatio,
    fills: fills.size,
    feesPaidCodec: ledger.feesPaidCodec,
    outcome: ledger.outcome,
  });
}
function botBinding(raw: GoalExecutionBot): GoalQualificationBinding {
  const b = readGoalExecutionBot(raw);
  return {
    genesisHash: b.network,
    denominator: b.goalExecution.execution.expectedDenominator,
    initialKusdCodec: b.exactGoalState.initial.kusdCodec,
    maxTradeKusdCodec: b.exactGoalState.limits.kusdCodec,
    maxTradeXorCodec: b.exactGoalState.limits.xorCodec,
    strategy: copyStrategyConfig(b.strategy),
  };
}
/** Reject structural imitations of the locally owned verifier, including true-returning hooks. */
export function assertGoalQualificationVerification(
  value: unknown,
  bot: GoalExecutionBot
): asserts value is GoalQualificationVerification {
  check(value && typeof value === 'object');
  const verify = owners.get(value);
  check(verify);
  verify(bot);
}
/** Match each actual live decoding profile, not merely a spec-version number or opaque qualification digest. */
export function assertGoalQualificationRuntime(
  value: GoalQualificationVerification,
  profile: GoalQualificationRuntimeProfile
): void {
  check(owners.has(value));
  const supplied = copy(profile);
  check(value.runtimeProfiles.some((p) => same(p, supplied)));
}

/** Require an owned verification and enforce its declared monetary cap before and after wallet signing. */
export function assertGoalQualificationFee(value: GoalQualificationVerification, feeCodec: string): void {
  check(owners.has(value));
  const fee = amount(feeCodec);
  if (value.executionModel) {
    const model = readGoalTargetExecutionModel(value.executionModel);
    check(fee <= BigInt(model.costPolicy.maximumLiveFeeCodec));
  }
}

/** A validated v3 plan admits only its modeled execution target; its historical provenance stays unchanged. */
function executionProfiles(p: GoalQualificationPlan): readonly GoalQualificationRuntimeProfile[] {
  return p.protocol === GOAL_QUALIFICATION_PROTOCOL_V3
    ? Object.freeze([readGoalTargetExecutionModel(p.executionModel).targetRuntimeProfile])
    : p.runtimeProfiles;
}

/** Validate the small release's accounting summaries; the publisher separately replays all original raw evidence. */
function releaseCertificate(raw: GoalQualificationCertificate): GoalQualificationCertificate {
  const c = copy(raw);
  fields(c, ['protocol', 'plan', 'registration', 'selection', 'training', 'validation', 'certificateSha256']);
  check(c.protocol === GOAL_QUALIFICATION_PROTOCOL_V2 || c.protocol === GOAL_QUALIFICATION_PROTOCOL_V3);
  const p = plan(c.plan, c.protocol);
  const { certificateSha256, ...body } = c;
  sha(certificateSha256);
  check(goalQualificationDigest(body) === certificateSha256);
  fields(c.registration, [
    'planSha256',
    'registrationSha256',
    'trainingIdentitySha256',
    'validationIdentitySha256',
    'kind',
  ]);
  check(
    c.registration.kind === 'preregistered-unopened-validation' &&
      c.registration.planSha256 === goalQualificationDigest(p) &&
      c.registration.trainingIdentitySha256 === p.training.identitySha256 &&
      c.registration.validationIdentitySha256 === p.validation.identitySha256
  );
  sha(c.registration.registrationSha256);
  const rows = (input: readonly GoalQualificationEpisodeSummary[], phase: 'training' | 'validation') => {
    check(Array.isArray(input) && input.length === (phase === 'training' ? 4 : 2));
    input.forEach((r, i) => {
      fields(r, [
        'startAtMs',
        'endAtMs',
        'dataSha256',
        'evidenceSha256',
        'openingValue',
        'endingValue',
        'benchmarkEndingValue',
        'netReturn',
        'excessReturn',
        'netChange',
        'excessChange',
        'maximumDrawdown',
        'fills',
        'feesPaidCodec',
        'outcome',
      ]);
      check(r.startAtMs === p[phase].startAtMs + i * DAY && r.endAtMs === r.startAtMs + DAY);
      sha(r.dataSha256);
      sha(r.evidenceSha256);
      for (const key of [
        'openingValue',
        'endingValue',
        'benchmarkEndingValue',
        'netReturn',
        'excessReturn',
        'netChange',
        'excessChange',
        'maximumDrawdown',
      ] as const) {
        const value = r[key];
        fields(value, ['numerator', 'denominator']);
        check(
          typeof value.numerator === 'string' &&
            /^-?(?:0|[1-9]\d{0,1023})$/.test(value.numerator) &&
            typeof value.denominator === 'string' &&
            /^[1-9]\d{0,1023}$/.test(value.denominator)
        );
        check(same(value, fraction(BigInt(value.numerator), BigInt(value.denominator))));
      }
      check(
        BigInt(r.openingValue.numerator) > 0n &&
          BigInt(r.endingValue.numerator) >= 0n &&
          BigInt(r.benchmarkEndingValue.numerator) > 0n &&
          BigInt(r.maximumDrawdown.numerator) >= 0n &&
          compare(r.maximumDrawdown, { numerator: '1', denominator: '1' }) <= 0n &&
          Number.isSafeInteger(r.fills) &&
          r.fills >= 0 &&
          r.fills <= 10000 &&
          ['target', 'loss', 'expired'].includes(r.outcome)
      );
      check(amount(r.feesPaidCodec, false) <= BigInt(p.policy.initialFeeReserveCodec));
      if (p.protocol === GOAL_QUALIFICATION_PROTOCOL_V3)
        check(
          BigInt(r.feesPaidCodec) ===
            BigInt(r.fills) * BigInt(readGoalTargetExecutionModel(p.executionModel).costPolicy.maximumLiveFeeCodec)
        );
      check(
        same(r.netReturn, returnRatio(r.endingValue, r.openingValue)) &&
          same(r.excessReturn, excessRatio(r.endingValue, r.benchmarkEndingValue, r.openingValue)) &&
          same(r.netChange, difference(r.endingValue, r.openingValue)) &&
          same(r.excessChange, difference(r.endingValue, r.benchmarkEndingValue))
      );
    });
  };
  check(Array.isArray(c.training) && c.training.length === p.candidates.length);
  c.training.forEach((item, i) => {
    fields(item, ['candidateSha256', 'episodes']);
    check(item.candidateSha256 === goalQualificationDigest(p.candidates[i]));
    rows(item.episodes, 'training');
  });
  const ranked = c.training
    .filter((item) => eligible(item.episodes))
    .sort((a, b) => {
      const excess = compare(average(b.episodes, 'excessReturn'), average(a.episodes, 'excessReturn'));
      if (excess) return excess > 0n ? 1 : -1;
      const net = compare(average(b.episodes, 'netReturn'), average(a.episodes, 'netReturn'));
      return net ? (net > 0n ? 1 : -1) : a.candidateSha256.localeCompare(b.candidateSha256);
    });
  fields(c.selection, [
    'registrationSha256',
    'candidateSha256',
    'trainingSha256',
    'sealSha256',
    'validationIdentitySha256',
    'kind',
  ]);
  check(
    ranked.length > 0 &&
      c.selection.kind === 'selection-sealed-before-validation' &&
      c.selection.registrationSha256 === c.registration.registrationSha256 &&
      c.selection.candidateSha256 === ranked[0].candidateSha256 &&
      c.selection.trainingSha256 === goalQualificationDigest(c.training) &&
      c.selection.validationIdentitySha256 === p.validation.identitySha256
  );
  sha(c.selection.sealSha256);
  rows(c.validation, 'validation');
  check(eligible(c.validation));
  return c;
}

/** Encode a release only from an existing owned verification; the release command obtains it by full raw replay. */
export function encodeGoalQualificationRelease(input: {
  certificate: GoalQualificationCertificate;
  verification: GoalQualificationVerification;
  bundleIndexSha256: string;
}): Uint8Array {
  check(owners.has(input.verification));
  const certificate = releaseCertificate(input.certificate);
  sha(input.bundleIndexSha256);
  check(
    input.verification.certificateSha256 === certificate.certificateSha256 &&
      input.verification.policySha256 === goalQualificationDigest(certificate.plan.policy) &&
      goalQualificationDigest(input.verification.binding) === certificate.selection.candidateSha256 &&
      same(input.verification.runtimeProfiles, executionProfiles(certificate.plan)) &&
      (certificate.protocol === GOAL_QUALIFICATION_PROTOCOL_V3
        ? same(input.verification.executionModel, certificate.plan.executionModel)
        : input.verification.executionModel === undefined)
  );
  const release: GoalQualificationRelease = {
    protocol: GOAL_QUALIFICATION_RELEASE_PROTOCOL,
    bundleIndexSha256: input.bundleIndexSha256,
    certificate,
  };
  const bytes = new TextEncoder().encode(canonical(release) + '\n');
  check(bytes.byteLength <= GOAL_QUALIFICATION_RELEASE_MAX_BYTES);
  return bytes;
}

/**
 * Explicit release-trust boundary. Only the trusted composition supplies pins from its shipped manifest.
 * The release publisher has already performed full raw replay; the browser checks the exact pinned artifact,
 * unchanged policy, summaries, selection and all economic gates. This does not authenticate arbitrary pins,
 * perform fresh historical replay, admit another runtime, allocate funds or authorize a wallet.
 */
export function verifyPinnedGoalQualificationRelease(raw: Uint8Array, trusted: GoalQualificationReleasePins) {
  const pins = copy(trusted);
  fields(pins, ['sha256', 'bundleIndexSha256', 'certificateSha256']);
  Object.values(pins).forEach(sha);
  check(raw instanceof Uint8Array && raw.byteLength > 0 && raw.byteLength <= GOAL_QUALIFICATION_RELEASE_MAX_BYTES);
  const bytes = new Uint8Array(raw);
  check(u8aToHex(sha256AsU8a(bytes)).slice(2) === pins.sha256);
  const release = copy(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))) as GoalQualificationRelease;
  fields(release, ['protocol', 'bundleIndexSha256', 'certificate']);
  check(
    release.protocol === GOAL_QUALIFICATION_RELEASE_PROTOCOL && release.bundleIndexSha256 === pins.bundleIndexSha256
  );
  const certificate = releaseCertificate(release.certificate);
  check(certificate.certificateSha256 === pins.certificateSha256);
  const selected = certificate.plan.candidates.find(
    (c) => goalQualificationDigest(c) === certificate.selection.candidateSha256
  )!;
  let revoked = false;
  const assertCurrent = (bot: GoalExecutionBot) => {
    check(
      !revoked &&
        same(botBinding(bot), selected) &&
        bot.goalExecution.qualificationDigest === certificate.certificateSha256 &&
        bot.goalExecution.policyDigest === goalQualificationDigest(certificate.plan.policy)
    );
  };
  const verification = Object.freeze({
    certificateSha256: certificate.certificateSha256,
    policySha256: goalQualificationDigest(certificate.plan.policy),
    binding: selected,
    runtimeProfiles: executionProfiles(certificate.plan),
    ...(certificate.protocol === GOAL_QUALIFICATION_PROTOCOL_V3
      ? { executionModel: readGoalTargetExecutionModel(certificate.plan.executionModel) }
      : {}),
    assertCurrent,
  });
  owners.set(verification, assertCurrent);
  return Object.freeze({
    certificate,
    verification,
    dispose() {
      revoked = true;
      owners.delete(verification);
    },
  });
}

/**
 * Construct only inside the trusted application composition root. No evaluator is enabled by default.
 * The supplied dependency must perform causal replay from canonical raw evidence and persist validation
 * access/seals across reloads. A JSON payload cannot supply it. This boundary independently recomputes
 * accounting, completeness and economic acceptance; it cannot authenticate arbitrary caller-authored data.
 */
export function createGoalQualificationBoundary(evaluator: GoalQualificationEvaluator) {
  return createBoundary(evaluator, GOAL_QUALIFICATION_PROTOCOL);
}
/** Explicit v2 installation; a v1 constructor never accepts a v2 evaluator or plan. */
export function createGoalQualificationBoundaryV2(evaluator: GoalQualificationEvaluator) {
  return createBoundary(evaluator, GOAL_QUALIFICATION_PROTOCOL_V2);
}
/** Explicit target-runtime research boundary. Its trusted producer must replay the separate raw v3 model. */
export function createGoalQualificationBoundaryV3(evaluator: GoalQualificationEvaluator) {
  return createBoundary(evaluator, GOAL_QUALIFICATION_PROTOCOL_V3);
}
function createBoundary(evaluator: GoalQualificationEvaluator, protocol: GoalQualificationPlan['protocol']) {
  check(evaluator?.protocol === goalQualificationEvidenceProtocol(protocol));
  sha(evaluator.sourceSha256);
  const attempted = new Set<string>();
  const capabilities = new Set<GoalQualificationVerification>();
  let revoked = false;
  const execute = async (input: GoalQualificationPlan, restored?: GoalQualificationCertificate) => {
    check(!revoked);
    const p = plan(input, protocol),
      planSha256 = goalQualificationDigest(p);
    check(p.source.evaluatorSha256 === evaluator.sourceSha256);
    if (!restored) {
      check(!attempted.has(planSha256));
      attempted.add(planSha256);
    }
    const registration = copy(await evaluator.register(p, restored));
    check(!revoked);
    fields(registration, [
      'planSha256',
      'registrationSha256',
      'trainingIdentitySha256',
      'validationIdentitySha256',
      'kind',
    ]);
    check(
      registration.kind === 'preregistered-unopened-validation' &&
        registration.planSha256 === planSha256 &&
        registration.trainingIdentitySha256 === p.training.identitySha256 &&
        registration.validationIdentitySha256 === p.validation.identitySha256
    );
    sha(registration.registrationSha256);
    const run = async (
      candidate: GoalQualificationBinding,
      phase: 'training' | 'validation',
      selection?: GoalQualificationSelection
    ) => {
      const partition = p[phase],
        summaries: GoalQualificationEpisodeSummary[] = [];
      for (let i = 0; i < (phase === 'training' ? 4 : 2); i++) {
        const request = copy({
          planSha256,
          candidate,
          candidateSha256: goalQualificationDigest(candidate),
          phase,
          partitionIdentitySha256: partition.identitySha256,
          startAtMs: partition.startAtMs + i * DAY,
          endAtMs: partition.startAtMs + (i + 1) * DAY,
          episodeIndex: i,
        });
        const trace = await evaluator.evaluate(request, selection);
        check(!revoked);
        summaries.push(episode(request, trace, p.runtimeProfiles, p.arrivalModel, protocol, p.executionModel));
      }
      return copy(summaries);
    };
    const training: { candidateSha256: string; episodes: readonly GoalQualificationEpisodeSummary[] }[] = [];
    for (const candidate of p.candidates)
      training.push({
        candidateSha256: goalQualificationDigest(candidate),
        episodes: await run(candidate, 'training'),
      });
    const ranked = training
      .filter((t) => eligible(t.episodes))
      .sort((a, b) => {
        const excess = compare(average(b.episodes, 'excessReturn'), average(a.episodes, 'excessReturn'));
        if (excess) return excess > 0n ? 1 : -1;
        const net = compare(average(b.episodes, 'netReturn'), average(a.episodes, 'netReturn'));
        return net ? (net > 0n ? 1 : -1) : a.candidateSha256.localeCompare(b.candidateSha256);
      });
    check(ranked.length > 0);
    const candidateSha256 = ranked[0].candidateSha256;
    const selectionInput = copy({
      registrationSha256: registration.registrationSha256,
      candidateSha256,
      trainingSha256: goalQualificationDigest(training),
      validationIdentitySha256: p.validation.identitySha256,
    });
    const selection = copy(await evaluator.sealSelection(selectionInput, restored?.selection));
    check(!revoked);
    fields(selection, [
      'registrationSha256',
      'candidateSha256',
      'trainingSha256',
      'sealSha256',
      'validationIdentitySha256',
      'kind',
    ]);
    check(selection.kind === 'selection-sealed-before-validation');
    sha(selection.sealSha256);
    for (const key of Object.keys(selectionInput) as (keyof typeof selectionInput)[])
      check(selection[key] === selectionInput[key]);
    if (restored) check(same(registration, restored.registration) && same(selection, restored.selection));
    const selected = p.candidates.find((c) => goalQualificationDigest(c) === candidateSha256)!;
    const validation = await run(selected, 'validation', selection);
    check(eligible(validation));
    const body = copy({
      protocol,
      plan: p,
      registration,
      selection,
      training,
      validation,
    });
    const certificate = copy({ ...body, certificateSha256: goalQualificationDigest(body) });
    if (restored) check(same(certificate, restored));
    const assertCurrent = (bot: GoalExecutionBot) => {
      check(
        !revoked &&
          same(botBinding(bot), selected) &&
          bot.goalExecution.qualificationDigest === certificate.certificateSha256 &&
          bot.goalExecution.policyDigest === goalQualificationDigest(p.policy)
      );
    };
    const verification = Object.freeze({
      certificateSha256: certificate.certificateSha256,
      policySha256: goalQualificationDigest(p.policy),
      binding: selected,
      runtimeProfiles: executionProfiles(p),
      ...(protocol === GOAL_QUALIFICATION_PROTOCOL_V3
        ? { executionModel: readGoalTargetExecutionModel(p.executionModel) }
        : {}),
      assertCurrent,
    });
    owners.set(verification, assertCurrent);
    capabilities.add(verification);
    return Object.freeze({ certificate, verification });
  };
  return Object.freeze({
    qualify: (input: GoalQualificationPlan) => execute(input),
    /** Restoring an untrusted certificate always reruns the trusted immutable evidence corridor. */
    reverify: (input: GoalQualificationCertificate) => {
      const certificate = copy(input);
      fields(certificate, [
        'protocol',
        'plan',
        'registration',
        'selection',
        'training',
        'validation',
        'certificateSha256',
      ]);
      check(certificate.protocol === protocol);
      sha(certificate.certificateSha256);
      const { certificateSha256, ...body } = certificate;
      check(goalQualificationDigest(body) === certificateSha256);
      return execute(certificate.plan, certificate);
    },
    /** Explicit local invalidation; no serialized flag can reverse this boundary's revocation. */
    revoke: () => {
      revoked = true;
      for (const capability of capabilities) owners.delete(capability);
      capabilities.clear();
    },
  });
}
