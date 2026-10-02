/** Causal read-only episode replay. Evidence is hypothetical and grants no wallet authority. */
import {
  GOAL_QUALIFICATION_POLICY,
  GOAL_QUALIFICATION_PROTOCOL,
  GOAL_QUALIFICATION_PROTOCOL_V2,
  GOAL_QUALIFICATION_PROTOCOL_V3,
  goalQualificationPolicy,
  goalQualificationEvidenceProtocol,
  goalQualificationDigest,
  readGoalQualificationBinding,
  type GoalQualificationEpisodeEvidence,
  type GoalQualificationEvaluationRequest,
  type GoalQualificationEvaluator,
  type GoalQualificationPlan,
  type GoalQualificationRuntimeProfile,
  type GoalQualificationSelection,
} from './goal-qualification';
import { type GoalQualificationClockBlock } from './goal-qualification-clock';
import {
  verifyGoalEpisodeClock,
  goalClockCheckCutoff,
  GoalEpisodeDeadlineCancellation,
  type GoalEpisodeDeadlineReceipt,
  type GoalEpisodeClockCheck as GoalQualificationClockCheck,
  type GoalEpisodeClockTrace as GoalQualificationClockTrace,
} from './goal-qualification-clock-v2';
import {
  createGoalExactLedger,
  markGoalExactLedger,
  assessGoalExactFill,
  settleGoalExactLedger,
  GOAL_EXACT_POLICY,
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
  type GoalExactMark,
  type GoalExactLedgerState,
} from './goal-exact-ledger';
import { evaluateGoalCompletedSignal } from './goal-signals';
import { isExactInputQuoteWithinImpactLimit } from './quote-impact';
import type { GoalExecutionBot } from './goal-execution-types';
import type { StrategyState } from './types';
import type { IndexedPoolHistoryWithEvidence } from './pool-history';
import {
  readGoalTargetExecutionModel,
  assessGoalTargetFee,
  goalTargetSourceRuntimeProfiles,
  isGoalCatalogTargetExecutionModel,
} from './goal-target-model';

/** Canonical source identity and modeled/recorded receipt clocks are separate from chain time. */
export interface GoalEpisodeMarkEvidence {
  sourceManifestSha256: string;
  genesisHash: string;
  block: GoalQualificationClockBlock;
  mark: GoalExactMark;
  runtimeProfile: GoalQualificationRuntimeProfile;
  captureStartedAtMs: number;
  receivedAtMs: number;
  evidenceSha256: string;
}
export interface GoalEpisodeHistoryEvidence {
  history: IndexedPoolHistoryWithEvidence;
  availableAtMs: number;
  evidenceSha256: string;
}
/** Metadata-only publication waiting; no future candle values are exposed. */
export interface GoalEpisodeAwaitingHistoryEvidence {
  kind: 'awaiting-history';
  completedAtMs: number;
  checkedAtMs: number;
  notBeforeMs: number;
  evidenceSha256: string;
}
/** Fixed at signal time; an evidence source may not resize or reverse this request. */
export interface GoalEpisodePendingInput {
  assetIn: string;
  assetOut: string;
  amountInCodec: string;
  expectedDenominator: string;
}
/**
 * Trusted source projection of the existing raw-decoder quote and bounded-envelope fee joins.
 * The source retains raw receipts and proves exact call/minimum/envelope binding; matching JSON
 * alone does not authenticate an archive response. Pool fees are already in the quoted output.
 */
export interface GoalEpisodeQuoteEvidence {
  context: GoalEpisodeMarkEvidence;
  receivedAtMs: number;
  pending: GoalEpisodePendingInput;
  quotedOutputCodec: string;
  withoutImpactCodec: string;
  minimumOutputCodec: string;
  feeCodec: string;
  queryInfoFeeCodec: string;
  queryDetailsFeeCodec: string;
  feeAsset: string;
  feePolicyId: string;
  feePolicySha256: string;
  quoteEvidenceSha256: string;
  feeEvidenceSha256: string;
  dexId: 0;
  liquiditySource: 'XYKPool';
  filter: 'AllowSelected';
  slippageBasisPoints: 50;
  observedFill: false;
  transactionSubmitted: false;
  feeAdequacyVerified: false;
  /** V3 only: context remains historical source state while these fields bind modeled target execution. */
  executionRuntimeProfile?: GoalQualificationRuntimeProfile;
  executionModelSha256?: string;
}
/** V3-only, raw target API None result. Rejected without a fill or fee; never a transport failure. */
export interface GoalEpisodeUnavailableQuoteEvidence {
  kind: 'target-runtime-route-unavailable';
  context: GoalEpisodeMarkEvidence;
  receivedAtMs: number;
  pending: GoalEpisodePendingInput;
  quoteEvidenceSha256: string;
  executionRuntimeProfile: GoalQualificationRuntimeProfile;
  executionModelSha256: string;
  dexId: 0;
  liquiditySource: 'XYKPool';
  filter: 'AllowSelected';
  slippageBasisPoints: 50;
  observedFill: false;
  transactionSubmitted: false;
  feeAdequacyVerified: false;
}
export type GoalEpisodeQuoteResult = GoalEpisodeQuoteEvidence | GoalEpisodeUnavailableQuoteEvidence;
export interface GoalEpisodeEvidenceSource {
  /** Persistent preregistration, sealed validation access and immutable raw provenance are upstream duties. */
  open(
    request: Readonly<GoalQualificationEvaluationRequest>,
    selection?: Readonly<GoalQualificationSelection>
  ): Promise<{
    dataSha256: string;
    clock: GoalQualificationClockTrace;
    opening: GoalEpisodeMarkEvidence;
  }>;
  history(
    request: Readonly<GoalQualificationEvaluationRequest>,
    input: Readonly<{
      check: GoalQualificationClockCheck;
      completedAtMs: number;
    }>
  ): Promise<GoalEpisodeHistoryEvidence | GoalEpisodeAwaitingHistoryEvidence>;
  valuation(
    request: Readonly<GoalQualificationEvaluationRequest>,
    input: Readonly<{
      check: GoalQualificationClockCheck;
      notBeforeMs: number;
    }>
  ): Promise<GoalEpisodeMarkEvidence>;
  quote(
    request: Readonly<GoalQualificationEvaluationRequest>,
    input: Readonly<{
      check: GoalQualificationClockCheck;
      signalIndex: number;
      decisionAtMs: number;
      pending: GoalEpisodePendingInput;
      valuation: GoalEpisodeMarkEvidence;
    }>
  ): Promise<GoalEpisodeQuoteResult>;
  terminal(request: Readonly<GoalQualificationEvaluationRequest>): Promise<{
    context: GoalEpisodeMarkEvidence;
    successor: GoalQualificationClockBlock;
  }>;
}
/** The v1 constructors never expose v2 pending-history or cancellation traces. */
export interface GoalEpisodeEvidenceSourceV1 extends GoalEpisodeEvidenceSource {
  open(...args: Parameters<GoalEpisodeEvidenceSource['open']>): Promise<
    Omit<Awaited<ReturnType<GoalEpisodeEvidenceSource['open']>>, 'clock'> & {
      clock: import('./goal-qualification-clock').GoalQualificationClockTrace;
    }
  >;
  history(...args: Parameters<GoalEpisodeEvidenceSource['history']>): Promise<GoalEpisodeHistoryEvidence>;
  quote(...args: Parameters<GoalEpisodeEvidenceSource['quote']>): Promise<GoalEpisodeQuoteEvidence>;
}
export interface GoalEpisodeEvaluatorOptions {
  plan: GoalQualificationPlan;
  source: GoalEpisodeEvidenceSource;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const HASH = /^0x[0-9a-f]{64}$/;
const SHA = /^[0-9a-f]{64}$/;
const fail = (): never => {
  throw new Error('bots.errors.research');
};
function check(value: unknown): asserts value {
  if (!value) fail();
}
function fields(value: unknown, names: readonly string[]): void {
  check(value && typeof value === 'object' && !Array.isArray(value));
  const keys = Object.keys(value);
  check(keys.length === names.length && names.every((name) => keys.includes(name)));
}
function time(value: unknown): asserts value is number {
  check(Number.isSafeInteger(value) && Number(value) >= 0);
}
function sha(value: unknown): asserts value is string {
  check(typeof value === 'string' && SHA.test(value));
}
function amount(value: unknown): bigint {
  check(typeof value === 'string' && /^[1-9]\d{0,38}$/.test(value));
  const parsed = BigInt(value);
  check(parsed < 1n << 128n);
  return parsed;
}
/** Bounded detached own-data copy before any await or hash; never invokes accessors/toJSON. */
function snapshot<T>(raw: T): T {
  let nodes = 0,
    chars = 0;
  const visit = (value: unknown, depth: number): unknown => {
    check(++nodes <= 800000 && depth <= 24);
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      check(Number.isSafeInteger(value));
      return value;
    }
    if (typeof value === 'string') {
      chars += value.length;
      check(value.length <= 100000 && chars <= 24_000_000);
      return value;
    }
    check(value && typeof value === 'object');
    const descriptors = Object.getOwnPropertyDescriptors(value),
      keys = Reflect.ownKeys(descriptors);
    if (Array.isArray(value)) {
      check(
        Object.getPrototypeOf(value) === Array.prototype && value.length <= 30000 && keys.length === value.length + 1
      );
      return Object.freeze(
        Array.from({ length: value.length }, (_, index) => {
          check(descriptors[index]?.enumerable && 'value' in descriptors[index]);
          return visit(descriptors[index].value, depth + 1);
        })
      );
    }
    check([Object.prototype, null].includes(Object.getPrototypeOf(value)) && keys.length <= 128);
    return Object.freeze(
      Object.fromEntries(
        keys.map((key) => {
          check(typeof key === 'string' && descriptors[key].enumerable && 'value' in descriptors[key]);
          return [key, visit(descriptors[key].value, depth + 1)];
        })
      )
    );
  };
  return visit(raw, 0) as T;
}
const same = (a: unknown, b: unknown) => goalQualificationDigest(a) === goalQualificationDigest(b);

/** Plan/request identity checks complement the outer qualifier's registration and partition gate. */
function requestCopy(
  input: GoalQualificationEvaluationRequest,
  plan: GoalQualificationPlan
): GoalQualificationEvaluationRequest {
  const request = snapshot(input);
  fields(request, [
    'planSha256',
    'candidate',
    'candidateSha256',
    'phase',
    'partitionIdentitySha256',
    'startAtMs',
    'endAtMs',
    'episodeIndex',
  ]);
  check(request.phase === 'training' || request.phase === 'validation');
  const candidate = readGoalQualificationBinding(request.candidate),
    partition = plan[request.phase];
  time(request.startAtMs);
  time(request.endAtMs);
  time(request.episodeIndex);
  check(
    request.planSha256 === goalQualificationDigest(plan) &&
      request.candidateSha256 === goalQualificationDigest(candidate)
  );
  check(
    plan.candidates.some((allowed) => same(allowed, candidate)) &&
      request.partitionIdentitySha256 === partition.identitySha256
  );
  check(
    request.episodeIndex < (request.phase === 'training' ? 4 : 2) &&
      request.startAtMs === partition.startAtMs + request.episodeIndex * DAY &&
      request.endAtMs === request.startAtMs + DAY &&
      request.endAtMs <= partition.endAtMs &&
      request.startAtMs % HOUR === 0
  );
  return request;
}

/** Internal structural bot view only; never leaves this module or establishes qualification/consent. */
function signalBot(
  request: GoalQualificationEvaluationRequest,
  ledger: GoalExactLedgerState,
  state: StrategyState,
  consumed: number | null
): GoalExecutionBot {
  const binding = request.candidate;
  const assetIn = { address: KUSD, symbol: 'KUSD', decimals: 18 },
    assetOut = { address: XOR, symbol: 'XOR', decimals: 18 };
  check(ledger.deficit.kusdCodec === '0' && ledger.deficit.xorCodec === '0');
  return {
    version: 1,
    id: 'qualification-episode',
    name: 'Read-only episode',
    mode: 'live',
    status: 'running',
    account: 'read-only-research-no-account',
    network: binding.genesisHash,
    assetIn,
    assetOut,
    strategy: binding.strategy,
    policy: {
      maxTradeCodec: { [KUSD]: binding.maxTradeKusdCodec, [XOR]: binding.maxTradeXorCodec },
      slippagePercent: '0.5',
      maxPriceImpactPercent: '1',
      feeAsset: assetOut,
      feeBudgetCodec: GOAL_EXACT_POLICY.initialFeeReserveCodec,
      sessionDurationMs: DAY,
    },
    portfolio: {
      initial: { [KUSD]: ledger.initial.kusdCodec, [XOR]: ledger.initial.xorCodec },
      holdings: { [KUSD]: ledger.holdings.kusdCodec, [XOR]: ledger.holdings.xorCodec },
      feesPaidCodec: ledger.feesPaidCodec,
      trades: ledger.trades,
    },
    state,
    provider: 'custom',
    model: '',
    endpoint: '',
    createdAt: request.startAtMs,
    sessionExpiresAt: request.endAtMs,
    activity: [],
    equity: [],
    apiUsage: { inputTokens: 0, outputTokens: 0, requests: 0 },
    goal: {
      title: 'Read-only episode',
      targetReturnPercent: '5',
      maxLossPercent: '5',
      durationMs: DAY,
      valuationAsset: 'output',
      lossMetric: 'drawdown',
    },
    goalExecution: {
      protocol: 'finalized-xyk-goal-v1',
      execution: { protocol: 'finalized-xyk-native-fee-v1', expectedDenominator: binding.denominator },
      goalId: ledger.goalId,
      consentDigest: request.candidateSha256,
      qualificationDigest: request.candidateSha256,
      policyDigest: request.planSha256,
    },
    goalControl: { revision: 0 },
    goalSignal: { completedAtMs: consumed },
    exactGoalState: ledger,
  };
}

/** Validate all observed block identities, including overlaps with the separately supplied callback trace. */
function blockRegistry(clock: GoalQualificationClockTrace) {
  const blocks = new Map<number, GoalQualificationClockBlock>(),
    hashes = new Map<string, number>(),
    children = new Map<string, number>(),
    heights: number[] = [];
  const add = (b: GoalQualificationClockBlock) => {
    fields(b, ['height', 'hash', 'parentHash', 'timestampMs']);
    time(b.height);
    time(b.timestampMs);
    check(
      b.height > 0 &&
        b.height <= 0xffffffff &&
        typeof b.hash === 'string' &&
        HASH.test(b.hash) &&
        typeof b.parentHash === 'string' &&
        HASH.test(b.parentHash) &&
        b.hash !== b.parentHash &&
        b.hash !== GOAL_EXACT_POLICY.genesisHash &&
        (b.height === 1) === (b.parentHash === GOAL_EXACT_POLICY.genesisHash)
    );
    const known = blocks.get(b.height);
    check((!known || same(known, b)) && (!hashes.has(b.hash) || hashes.get(b.hash) === b.height));
    check(
      (!hashes.has(b.parentHash) || hashes.get(b.parentHash) === b.height - 1) &&
        (!children.has(b.hash) || children.get(b.hash) === b.height + 1) &&
        (!children.has(b.parentHash) || children.get(b.parentHash) === b.height)
    );
    let lo = 0,
      hi = heights.length;
    while (lo < hi) {
      const mid = lo + Math.floor((hi - lo) / 2);
      if (heights[mid] < b.height) lo = mid + 1;
      else hi = mid;
    }
    const before = blocks.get(heights[lo - 1]),
      after = blocks.get(heights[lo] === b.height ? heights[lo + 1] : heights[lo]);
    check((!before || before.timestampMs < b.timestampMs) && (!after || after.timestampMs > b.timestampMs));
    const parent = blocks.get(b.height - 1),
      child = blocks.get(b.height + 1);
    check((!parent || parent.hash === b.parentHash) && (!child || child.parentHash === b.hash));
    if (!known) heights.splice(lo, 0, b.height);
    blocks.set(b.height, b);
    hashes.set(b.hash, b.height);
    children.set(b.parentHash, b.height);
  };
  for (const event of clock.events) if (event.kind === 'callback') add(event.block);
  return {
    add,
    indexed(history: IndexedPoolHistoryWithEvidence) {
      for (const boundary of history.boundaries)
        for (const observed of [boundary.closing, boundary.successor]) {
          const known = blocks.get(observed.height);
          check(
            (!known ||
              (known.hash === observed.hash && Math.floor(known.timestampMs / 1000) === observed.timestampSeconds)) &&
              (!hashes.has(observed.hash) || hashes.get(observed.hash) === observed.height)
          );
        }
    },
  };
}

/** Build the evaluate member for a trusted persistent qualification source; no registration is fabricated here. */
export function createGoalEpisodeEvaluator(
  options: GoalEpisodeEvaluatorOptions
): Pick<GoalQualificationEvaluator, 'evaluate'> {
  return createEpisodeEvaluator(options, GOAL_QUALIFICATION_PROTOCOL);
}
/** Explicit v2 replay supports honest deadline-cancelled prefixes and deferred hourly publication. */
export function createGoalEpisodeEvaluatorV2(
  options: GoalEpisodeEvaluatorOptions
): Pick<GoalQualificationEvaluator, 'evaluate'> {
  return createEpisodeEvaluator(options, GOAL_QUALIFICATION_PROTOCOL_V2);
}
/** Target-runtime replay retains source-state identity and charges an independently declared native-fee cap. */
export function createGoalEpisodeEvaluatorV3(
  options: GoalEpisodeEvaluatorOptions
): Pick<GoalQualificationEvaluator, 'evaluate'> {
  return createEpisodeEvaluator(options, GOAL_QUALIFICATION_PROTOCOL_V3);
}
function createEpisodeEvaluator(
  options: GoalEpisodeEvaluatorOptions,
  protocol: GoalQualificationPlan['protocol']
): Pick<GoalQualificationEvaluator, 'evaluate'> {
  check(options && typeof options === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(options)));
  const descriptors = Object.getOwnPropertyDescriptors(options);
  check(
    Reflect.ownKeys(descriptors).length === 2 &&
      ['plan', 'source'].every((key) => descriptors[key]?.enumerable && 'value' in descriptors[key])
  );
  const plan = snapshot(descriptors.plan.value as GoalQualificationPlan),
    source = descriptors.source.value as GoalEpisodeEvidenceSource;
  check(source && typeof source === 'object');
  check(plan.protocol === protocol && same(plan.policy, goalQualificationPolicy(protocol, plan.executionModel)));
  const v3 = protocol === GOAL_QUALIFICATION_PROTOCOL_V3;
  const v2 = protocol !== GOAL_QUALIFICATION_PROTOCOL;
  const executionModel = v3 ? readGoalTargetExecutionModel(plan.executionModel) : undefined;
  const catalog = executionModel && isGoalCatalogTargetExecutionModel(executionModel);
  if (executionModel) check(same(plan.runtimeProfiles, goalTargetSourceRuntimeProfiles(executionModel)));
  else check(!Object.hasOwn(plan, 'executionModel'));
  check(plan.candidates.length > 0 && plan.candidates.length <= 3);
  plan.candidates.forEach(readGoalQualificationBinding);
  check(plan.runtimeProfiles.length > 0 && plan.runtimeProfiles.length <= (catalog ? 3 : 2));
  for (const profile of plan.runtimeProfiles) {
    fields(profile, ['specVersion', 'transactionVersion', 'metadataSha256', 'codeHash']);
    check(
      (catalog ? [128, 129, 130] : [130, 131]).includes(profile.specVersion) &&
        profile.transactionVersion === profile.specVersion &&
        HASH.test(profile.codeHash)
    );
    sha(profile.metadataSha256);
  }
  // The detached plan is immutable; source contexts still receive a fresh digest per observation.
  const allowedRuntimeProfileDigests = new Set(plan.runtimeProfiles.map(goalQualificationDigest));
  sha(plan.source.manifestSha256);
  const methods = ['open', 'history', 'valuation', 'quote', 'terminal'] as const;
  const calls = Object.fromEntries(
    methods.map((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(source, name);
      check(descriptor && 'value' in descriptor && typeof descriptor.value === 'function');
      return [name, descriptor.value.bind(source)];
    })
  ) as unknown as GoalEpisodeEvidenceSource;
  let busy = false;
  const evaluate: GoalQualificationEvaluator['evaluate'] = async (input, suppliedSelection) => {
    check(!busy);
    const request = requestCopy(input, plan),
      requestSha256 = goalQualificationDigest(request);
    const selection = suppliedSelection === undefined ? undefined : snapshot(suppliedSelection);
    if (request.phase === 'validation') {
      check(
        selection &&
          selection.kind === 'selection-sealed-before-validation' &&
          selection.candidateSha256 === request.candidateSha256 &&
          selection.validationIdentitySha256 === request.partitionIdentitySha256
      );
      sha(selection.sealSha256);
    } else check(selection === undefined);
    busy = true;
    try {
      const opened = snapshot(await calls.open(request, selection));
      fields(opened, ['dataSha256', 'clock', 'opening']);
      sha(opened.dataSha256);
      check(opened.clock.protocol === plan.policy.clockProtocol);
      const checks = verifyGoalEpisodeClock(opened.clock, plan.arrivalModel, {
        startAtMs: request.startAtMs,
        endAtMs: request.endAtMs,
      });
      const registry = blockRegistry(opened.clock);
      const sourceProfilesByBlock = new Map<string, string>();
      const context = (raw: GoalEpisodeMarkEvidence, retrospective = false) => {
        const value = snapshot(raw);
        fields(value, [
          'sourceManifestSha256',
          'genesisHash',
          'block',
          'mark',
          'runtimeProfile',
          'captureStartedAtMs',
          'receivedAtMs',
          'evidenceSha256',
        ]);
        check(
          value.sourceManifestSha256 === plan.source.manifestSha256 &&
            value.genesisHash === request.candidate.genesisHash
        );
        const profileDigest = goalQualificationDigest(value.runtimeProfile);
        check(allowedRuntimeProfileDigests.has(profileDigest));
        if (catalog) {
          const prior = sourceProfilesByBlock.get(value.block.hash);
          check(prior === undefined || prior === profileDigest);
          sourceProfilesByBlock.set(value.block.hash, profileDigest);
        }
        sha(value.evidenceSha256);
        time(value.captureStartedAtMs);
        time(value.receivedAtMs);
        check(value.receivedAtMs >= value.captureStartedAtMs && value.receivedAtMs - value.captureStartedAtMs < 5000);
        registry.add(value.block);
        fields(value.mark, [
          'blockHash',
          'blockNumber',
          'timestampMs',
          'denominator',
          'kusdReserveCodec',
          'xorReserveCodec',
        ]);
        check(
          value.mark.blockHash === value.block.hash &&
            value.mark.blockNumber === value.block.height &&
            value.mark.timestampMs === value.block.timestampMs &&
            value.mark.denominator === request.candidate.denominator
        );
        amount(value.mark.kusdReserveCodec);
        amount(value.mark.xorReserveCodec);
        check(
          value.mark.timestampMs <= value.receivedAtMs &&
            (retrospective || value.receivedAtMs - value.mark.timestampMs <= 60000)
        );
        return value;
      };
      const opening = context(opened.opening);
      check(opening.receivedAtMs <= request.startAtMs && request.startAtMs - opening.receivedAtMs < 5000);
      let ledger = createGoalExactLedger(
        {
          goalId: 'qualification-episode',
          startedAtMs: request.startAtMs,
          initialKusdCodec: request.candidate.initialKusdCodec,
          maxTradeKusdCodec: request.candidate.maxTradeKusdCodec,
          maxTradeXorCodec: request.candidate.maxTradeXorCodec,
        },
        opening.mark
      );
      let state: StrategyState = { lastEvaluatedAt: 0, lastTradeAt: 0 },
        consumed: number | null = null;
      const signals: GoalQualificationEpisodeEvidence['signals'][number][] = [],
        events: GoalQualificationEpisodeEvidence['events'][number][] = [];
      let deadlineCancellation: GoalEpisodeDeadlineReceipt | null = null;
      for (const scheduled of checks) {
        try {
          const completedAtMs = Math.floor(scheduled.checkedAtMs / HOUR) * HOUR;
          const needed = consumed === null || completedAtMs > consumed;
          const readHistory =
            needed && ledger.outcome === 'active'
              ? snapshot(await calls.history(request, snapshot({ check: scheduled, completedAtMs })))
              : undefined;
          const pendingHistory = readHistory && 'kind' in readHistory ? readHistory : undefined;
          if (pendingHistory) {
            fields(pendingHistory, ['kind', 'completedAtMs', 'checkedAtMs', 'notBeforeMs', 'evidenceSha256']);
            check(
              v2 &&
                pendingHistory.kind === 'awaiting-history' &&
                pendingHistory.completedAtMs === completedAtMs &&
                pendingHistory.checkedAtMs === scheduled.checkedAtMs &&
                pendingHistory.notBeforeMs > scheduled.checkedAtMs
            );
            time(pendingHistory.notBeforeMs);
            sha(pendingHistory.evidenceSha256);
          }
          const history = readHistory && !('kind' in readHistory) ? readHistory : undefined;
          if (history) {
            fields(history, ['history', 'availableAtMs', 'evidenceSha256']);
            time(history.availableAtMs);
            sha(history.evidenceSha256);
            check(
              history.availableAtMs >= scheduled.checkedAtMs &&
                history.availableAtMs <= goalClockCheckCutoff(scheduled) &&
                history.availableAtMs >= completedAtMs
            );
            registry.indexed(history.history);
          }
          const valuation = context(
            await calls.valuation(
              request,
              snapshot({ check: scheduled, notBeforeMs: history?.availableAtMs ?? scheduled.checkedAtMs })
            )
          );
          check(
            valuation.captureStartedAtMs >= (history?.availableAtMs ?? scheduled.checkedAtMs) &&
              valuation.receivedAtMs <= goalClockCheckCutoff(scheduled) &&
              valuation.receivedAtMs < request.endAtMs
          );
          check(
            valuation.block.height >= scheduled.arrival.block.height &&
              (valuation.block.height !== scheduled.arrival.block.height ||
                valuation.block.hash === scheduled.arrival.block.hash)
          );
          const decisionAtMs = valuation.receivedAtMs;
          // V2 still records a fresh valuation across an hour boundary. Old-hour history then
          // yields the shared awaiting-history result and cannot consume the newly current hour.
          if (!v2) check(Math.floor(decisionAtMs / HOUR) * HOUR === completedAtMs);
          const decision = history
            ? evaluateGoalCompletedSignal({
                bot: signalBot(request, ledger, state, consumed),
                binding: request.candidate,
                history: history.history,
                receivedAtMs: history.availableAtMs,
                now: decisionAtMs,
              })
            : undefined;
          ledger = markGoalExactLedger(ledger, {
            expectedRevision: ledger.revision,
            accountingAtMs: decisionAtMs,
            mark: valuation.mark,
          });
          const priorEvent = events.at(-1);
          check(
            !priorEvent ||
              decisionAtMs > priorEvent.receivedAtMs ||
              (decisionAtMs === priorEvent.receivedAtMs && priorEvent.kind === 'valuation')
          );
          events.push({
            kind: 'valuation',
            checkId: scheduled.id,
            captureStartedAtMs: valuation.captureStartedAtMs,
            receivedAtMs: decisionAtMs,
            mark: valuation.mark,
            evidenceSha256: valuation.evidenceSha256,
            ...(catalog ? { runtimeProfileSha256: goalQualificationDigest(valuation.runtimeProfile) } : {}),
          });
          if (!needed) continue;
          if (ledger.outcome === 'active' && (pendingHistory || decision?.kind === 'awaiting-history')) {
            check(v2);
            continue;
          }
          check(completedAtMs === request.startAtMs + signals.length * HOUR && signals.length < 24);
          if (decision && decision.kind !== 'awaiting-history') {
            check(decision.kind === 'decision' && decision.completedAtMs === completedAtMs);
            state = { ...decision.state };
          }
          consumed = completedAtMs;
          const signal: GoalQualificationEpisodeEvidence['signals'][number] = {
            index: signals.length,
            checkId: scheduled.id,
            completedAtMs,
            availableAtMs: history?.availableAtMs ?? decisionAtMs,
            decisionAtMs,
            action: ledger.outcome !== 'active' ? 'stopped' : 'hold',
            evidenceSha256: goalQualificationDigest({
              source: history?.evidenceSha256 ?? valuation.evidenceSha256,
              valuation: valuation.evidenceSha256,
              decision: decision ?? null,
              outcome: ledger.outcome,
            }),
          };
          signals.push(signal);
          if (
            ledger.outcome !== 'active' ||
            !decision ||
            decision.kind !== 'decision' ||
            decision.proposal.action === 'hold'
          )
            continue;
          check(decision.inputCodec !== null);
          const pending = snapshot({
            assetIn: decision.proposal.action === 'buy' ? KUSD : XOR,
            assetOut: decision.proposal.action === 'buy' ? XOR : KUSD,
            amountInCodec: decision.inputCodec,
            expectedDenominator: request.candidate.denominator,
          });
          const quote = snapshot(
            await calls.quote(
              request,
              snapshot({ check: scheduled, signalIndex: signal.index, decisionAtMs, pending, valuation })
            )
          );
          const unavailable = 'kind' in quote;
          if (unavailable) check(v3 && quote.kind === 'target-runtime-route-unavailable');
          fields(
            quote,
            unavailable
              ? [
                  'kind',
                  'context',
                  'receivedAtMs',
                  'pending',
                  'quoteEvidenceSha256',
                  'executionRuntimeProfile',
                  'executionModelSha256',
                  'dexId',
                  'liquiditySource',
                  'filter',
                  'slippageBasisPoints',
                  'observedFill',
                  'transactionSubmitted',
                  'feeAdequacyVerified',
                ]
              : [
                  'context',
                  'receivedAtMs',
                  'pending',
                  'quotedOutputCodec',
                  'withoutImpactCodec',
                  'minimumOutputCodec',
                  'feeCodec',
                  'queryInfoFeeCodec',
                  'queryDetailsFeeCodec',
                  'feeAsset',
                  'feePolicyId',
                  'feePolicySha256',
                  'quoteEvidenceSha256',
                  'feeEvidenceSha256',
                  'dexId',
                  'liquiditySource',
                  'filter',
                  'slippageBasisPoints',
                  'observedFill',
                  'transactionSubmitted',
                  'feeAdequacyVerified',
                  ...(v3 ? ['executionRuntimeProfile', 'executionModelSha256'] : []),
                ]
          );
          const quoteContext = context(quote.context);
          check(
            same(quoteContext.mark, valuation.mark) &&
              same(quoteContext.block, valuation.block) &&
              same(quoteContext.runtimeProfile, valuation.runtimeProfile)
          );
          if (executionModel)
            check(
              same(quote.executionRuntimeProfile, executionModel.targetRuntimeProfile) &&
                quote.executionModelSha256 === goalQualificationDigest(executionModel)
            );
          time(quote.receivedAtMs);
          check(
            quoteContext.captureStartedAtMs >= valuation.captureStartedAtMs &&
              quoteContext.receivedAtMs >= decisionAtMs &&
              quote.receivedAtMs >= quoteContext.receivedAtMs &&
              quote.receivedAtMs - quoteContext.receivedAtMs < 5000 &&
              quote.receivedAtMs <= goalClockCheckCutoff(scheduled) &&
              quote.receivedAtMs < request.endAtMs &&
              quote.receivedAtMs - quoteContext.mark.timestampMs <= 60000
          );
          check(
            same(quote.pending, pending) &&
              quote.dexId === 0 &&
              quote.liquiditySource === 'XYKPool' &&
              quote.filter === 'AllowSelected' &&
              quote.slippageBasisPoints === 50 &&
              quote.observedFill === false &&
              quote.transactionSubmitted === false &&
              quote.feeAdequacyVerified === false
          );
          sha(quote.quoteEvidenceSha256);
          if ('kind' in quote) {
            signal.evidenceSha256 = goalQualificationDigest({ decisionEvidenceSha256: signal.evidenceSha256, quote });
            signal.action = 'rejected';
            continue;
          }
          check(
            quote.feeAsset === XOR &&
              quote.feePolicyId === GOAL_QUALIFICATION_POLICY.feePolicyId &&
              quote.feePolicySha256 === GOAL_QUALIFICATION_POLICY.feePolicySha256
          );
          sha(quote.quoteEvidenceSha256);
          sha(quote.feeEvidenceSha256);
          const output = amount(quote.quotedOutputCodec),
            without = amount(quote.withoutImpactCodec);
          amount(quote.minimumOutputCodec);
          amount(quote.feeCodec);
          check(
            output <= without &&
              quote.minimumOutputCodec === String((output * 9950n) / 10000n) &&
              quote.feeCodec === quote.queryInfoFeeCodec &&
              quote.feeCodec === quote.queryDetailsFeeCodec
          );
          signal.evidenceSha256 = goalQualificationDigest({ decisionEvidenceSha256: signal.evidenceSha256, quote });
          signal.action = 'rejected';
          let modeledFeeCodec = quote.feeCodec;
          if (executionModel) {
            const cost = assessGoalTargetFee({
              model: executionModel,
              queryInfoFeeCodec: quote.queryInfoFeeCodec,
              queryDetailsFeeCodec: quote.queryDetailsFeeCodec,
            });
            if (!cost.withinLiveCap) continue;
            modeledFeeCodec = cost.modeledFeeCodec;
          }
          if (!isExactInputQuoteWithinImpactLimit(quote.quotedOutputCodec, quote.withoutImpactCodec, '1')) continue;
          const fill = {
            inputAsset: pending.assetIn,
            inputCodec: pending.amountInCodec,
            outputAsset: pending.assetOut,
            minimumOutputCodec: quote.minimumOutputCodec,
            feeCeilingCodec: modeledFeeCodec,
          };
          const assessed = assessGoalExactFill(ledger, {
            expectedRevision: ledger.revision,
            accountingAtMs: quote.receivedAtMs,
            mark: quoteContext.mark,
            fill,
          });
          if (assessed.rejection) continue;
          ledger = settleGoalExactLedger(assessed.state, {
            expectedRevision: assessed.state.revision,
            accountingAtMs: quote.receivedAtMs,
            mark: quoteContext.mark,
            orderId: `signal-${signal.index}`,
            receipt: {
              blockHash: quoteContext.mark.blockHash,
              blockNumber: quoteContext.mark.blockNumber,
              extrinsicHash: `0x${goalQualificationDigest({ requestSha256, signalIndex: signal.index })}`,
              extrinsicIndex: signal.index,
            },
            fill,
            success: true,
            actualOutputCodec: quote.minimumOutputCodec,
            actualFeeCodec: modeledFeeCodec,
          }).state;
          check(ledger.attention.length === 0);
          state = { ...state, lastTradeAt: quote.receivedAtMs };
          signal.action = 'filled';
          events.push({
            kind: 'minimum-output-fill',
            signalIndex: signal.index,
            contextReceivedAtMs: quoteContext.receivedAtMs,
            receivedAtMs: quote.receivedAtMs,
            mark: quoteContext.mark,
            inputAsset: pending.assetIn,
            inputCodec: pending.amountInCodec,
            outputAsset: pending.assetOut,
            quotedOutputCodec: quote.quotedOutputCodec,
            withoutImpactCodec: quote.withoutImpactCodec,
            minimumOutputCodec: quote.minimumOutputCodec,
            feeCodec: modeledFeeCodec,
            queryInfoFeeCodec: quote.queryInfoFeeCodec,
            queryDetailsFeeCodec: quote.queryDetailsFeeCodec,
            runtimeProfileSha256: goalQualificationDigest(
              executionModel ? executionModel.targetRuntimeProfile : quoteContext.runtimeProfile
            ),
            ...(executionModel
              ? {
                  sourceRuntimeProfileSha256: goalQualificationDigest(quoteContext.runtimeProfile),
                  executionModelSha256: goalQualificationDigest(executionModel),
                }
              : {}),
            quoteEvidenceSha256: quote.quoteEvidenceSha256,
            feeEvidenceSha256: quote.feeEvidenceSha256,
          });
        } catch (error) {
          if (!(error instanceof GoalEpisodeDeadlineCancellation)) throw error;
          const receipt = snapshot(error.receipt);
          fields(receipt, [
            'checkId',
            'stage',
            'startedAtMs',
            'plannedReceivedAtMs',
            'cancelledAtMs',
            'evidenceSha256',
          ]);
          check(
            v2 &&
              'cancelledAtMs' in scheduled &&
              scheduled === checks.at(-1) &&
              receipt.checkId === scheduled.id &&
              receipt.cancelledAtMs === request.endAtMs &&
              receipt.startedAtMs >= scheduled.checkedAtMs &&
              receipt.startedAtMs < request.endAtMs &&
              receipt.plannedReceivedAtMs >= request.endAtMs &&
              ['history', 'valuation', 'quote'].includes(receipt.stage)
          );
          check(
            receipt.plannedReceivedAtMs > receipt.startedAtMs &&
              receipt.plannedReceivedAtMs - receipt.startedAtMs <= (receipt.stage === 'history' ? 60000 : 4999)
          );
          time(receipt.startedAtMs);
          time(receipt.plannedReceivedAtMs);
          sha(receipt.evidenceSha256);
          const hasMark = events.some((event) => event.kind === 'valuation' && event.checkId === scheduled.id);
          check(hasMark === (receipt.stage === 'quote'));
          if (receipt.stage === 'quote') {
            const signal = signals.at(-1);
            check(signal && signal.checkId === scheduled.id && signal.action !== 'filled');
            signal.action = 'deadline-cancelled';
            signal.evidenceSha256 = goalQualificationDigest({ prior: signal.evidenceSha256, cancellation: receipt });
          }
          deadlineCancellation = receipt;
          break;
        }
      }
      const expectedValuations =
        checks.length - (deadlineCancellation && deadlineCancellation.stage !== 'quote' ? 1 : 0);
      check(
        signals.length === 24 && events.filter((event) => event.kind === 'valuation').length === expectedValuations
      );
      const terminal = snapshot(await calls.terminal(request));
      fields(terminal, ['context', 'successor']);
      const finalContext = context(terminal.context, true);
      registry.add(terminal.successor);
      check(
        finalContext.mark.timestampMs <= request.endAtMs &&
          request.endAtMs - finalContext.mark.timestampMs <= 60000 &&
          terminal.successor.height === finalContext.block.height + 1 &&
          terminal.successor.parentHash === finalContext.block.hash &&
          terminal.successor.timestampMs > request.endAtMs
      );
      ledger = markGoalExactLedger(ledger, {
        expectedRevision: ledger.revision,
        accountingAtMs: request.endAtMs,
        mark: finalContext.mark,
      });
      check(ledger.outcome !== 'active');
      return snapshot({
        protocol: goalQualificationEvidenceProtocol(protocol),
        ...(v2 ? { deadlineCancellation } : {}),
        requestSha256,
        dataSha256: opened.dataSha256,
        opening: {
          fundedAtMs: request.startAtMs,
          receivedAtMs: opening.receivedAtMs,
          mark: opening.mark,
          evidenceSha256: opening.evidenceSha256,
        },
        clock: opened.clock,
        terminal: {
          accountingAtMs: request.endAtMs,
          mark: finalContext.mark,
          successor: terminal.successor,
          evidenceSha256: finalContext.evidenceSha256,
        },
        signals,
        events,
      });
    } finally {
      busy = false;
    }
  };
  return Object.freeze({ evaluate });
}
