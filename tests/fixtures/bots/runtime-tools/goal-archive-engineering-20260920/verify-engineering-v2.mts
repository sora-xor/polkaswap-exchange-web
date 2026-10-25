/** Offline engineering integrity/accounting check only. Never creates qualification or performs network I/O. */
import { createHash } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as runnerNamespace from './run-engineering-v2.mts';
import * as ledgerNamespace from '../../../../../src/features/bot-trading/goal-exact-ledger';
import * as qualificationNamespace from '../../../../../src/features/bot-trading/goal-qualification';
import * as clockNamespace from '../../../../../src/features/bot-trading/goal-qualification-clock-v2';
import * as builderNamespace from '../../../../../scripts/bots/goal-qualification-clock-builder-v2';
import * as impactNamespace from '../../../../../src/features/bot-trading/quote-impact';
import type { GoalExactRatio } from '../../../../../src/features/bot-trading/goal-exact-ledger';
import type {
  GoalQualificationEvaluationRequest,
  GoalQualificationEpisodeEvidence,
  GoalQualificationRuntimeProfile,
  GoalQualificationPlan,
  GoalQualificationValuation,
} from '../../../../../src/features/bot-trading/goal-qualification';
import type {
  GoalQualificationArrivalModel,
  GoalQualificationClockBlock,
} from '../../../../../src/features/bot-trading/goal-qualification-clock';
import type {
  GoalArchiveEngineeringResult,
  GoalArchiveDevelopmentInput,
} from '../../../../../scripts/bots/goal-qualification-archive-reader';
const runner = (Reflect.get(runnerNamespace, 'default') ?? runnerNamespace) as typeof runnerNamespace;
const ledger = (Reflect.get(ledgerNamespace, 'default') ?? ledgerNamespace) as typeof ledgerNamespace;
const qualification = (Reflect.get(qualificationNamespace, 'default') ??
  qualificationNamespace) as typeof qualificationNamespace;
const clock = (Reflect.get(clockNamespace, 'default') ?? clockNamespace) as typeof clockNamespace;
const builder = (Reflect.get(builderNamespace, 'default') ?? builderNamespace) as typeof builderNamespace;
const impact = (Reflect.get(impactNamespace, 'default') ?? impactNamespace) as typeof impactNamespace;
const {
  createGoalExactLedger,
  markGoalExactLedger,
  assessGoalExactFill,
  settleGoalExactLedger,
  GOAL_EXACT_KUSD: KUSD,
  GOAL_EXACT_XOR: XOR,
} = ledger;
const {
  goalQualificationDigest,
  GOAL_QUALIFICATION_PROTOCOL_V2,
  GOAL_QUALIFICATION_POLICY_V2,
  goalQualificationEvidenceProtocol,
  goalQualificationPolicy,
  readGoalQualificationBinding,
} = qualification;
const { verifyGoalEpisodeClock, goalClockCheckCutoff } = clock;
const { isExactInputQuoteWithinImpactLimit } = impact;
const HOUR = 3600000,
  U128 = (1n << 128n) - 1n;
const BASE = dirname(fileURLToPath(import.meta.url)),
  ROOT = resolve(BASE, '../../../../..');
function check(value: unknown, reason = 'invalid-evidence'): asserts value {
  if (!value) throw Error(`Engineering verification: ${reason}`);
}
function fields(value: object, expected: readonly string[]) {
  check(value && typeof value === 'object' && !Array.isArray(value));
  check(Reflect.ownKeys(value).length === expected.length && expected.every((key) => Object.hasOwn(value, key)));
}
const canonical = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
          .join(',')}}`
      : JSON.stringify(value);
const digestBytes = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
function copy<T>(value: T): T {
  goalQualificationDigest(value); // Shared own-data, accessor, shape and size limits.
  return JSON.parse(canonical(value));
}
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
/** Recompute exact economics on the recorded/modeled live scheduler's actual check timeline. */
export function replayEngineeringTrace(
  request: GoalQualificationEvaluationRequest,
  raw: GoalQualificationEpisodeEvidence,
  profiles: readonly GoalQualificationRuntimeProfile[],
  arrivalModel: GoalQualificationArrivalModel,
  protocol: GoalQualificationPlan['protocol']
) {
  check(protocol === GOAL_QUALIFICATION_PROTOCOL_V2);
  check(request.endAtMs - request.startAtMs === 86400000);
  readGoalQualificationBinding(request.candidate);
  const e = copy(raw);
  const v2 = protocol === GOAL_QUALIFICATION_PROTOCOL_V2;
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
    const scheduled = checks.find((c) => c.id === s.checkId);
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
    goalId: 'engineering-summary',
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
      fields(event, ['kind', 'checkId', 'captureStartedAtMs', 'receivedAtMs', 'mark', 'evidenceSha256']);
      sha(event.evidenceSha256);
      const scheduled = checks.find((c) => c.id === event.checkId);
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
      ]);
      check(
        event.kind === 'minimum-output-fill' &&
          Number.isSafeInteger(event.signalIndex) &&
          event.signalIndex >= 0 &&
          event.signalIndex < 24 &&
          !fills.has(event.signalIndex)
      );
      const signal = e.signals[event.signalIndex],
        scheduled = checks.find((c) => c.id === signal.checkId)!;
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
      check(event.feeCodec === event.queryInfoFeeCodec && event.feeCodec === event.queryDetailsFeeCodec);
      check(runtimeHashes.includes(event.runtimeProfileSha256));
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
    holdings: ledger.holdings,
    deficit: ledger.deficit,
    benchmarkHoldings: benchmark.holdings,
    benchmarkFeesPaidCodec: benchmark.feesPaidCodec,
    actualTransactions: 0,
    qualificationEligible: false,
    fillModel: 'minimum-output-hypothetical-no-market-feedback',
  });
}
interface EngineeringProtocol {
  kind: 'already-exposed-goal-engineering-protocol-v2';
  input: Omit<GoalArchiveDevelopmentInput, 'engineeringReceipt' | 'blocks'>;
  sources: Record<string, string>;
  files: Record<string, { path: string; sha256: string }>;
  exposureAudit: Record<string, unknown>;
  network: { maximumStarts: number; minimumIntervalMs: number };
}
interface RawReceipt {
  name: string;
  sha256: string;
  bytes: number;
}
const within = (root: string, path: string) => {
  const part = relative(root, path);
  check(part && !part.startsWith('..') && !isAbsolute(part), 'path-outside-root');
  return part;
};
async function record<T>(path: string): Promise<{ value: T; sha256: string; bytes: number }> {
  const data = await runner.bytes(path);
  return {
    value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)) as T,
    sha256: digestBytes(data),
    bytes: data.length,
  };
}

/** Verify a completed immutable engineering directory and recompute economics; reads local files only. */
export async function verifyEngineeringDirectory(base = BASE, root = ROOT) {
  const run = resolve(base, 'episode-v2');
  // A complete receipt is mandatory before reading any protocol-bound market evidence.
  const completeFile = await record<Record<string, unknown>>(resolve(run, 'complete.json'));
  const complete = completeFile.value;
  check(
    complete.complete === true && complete.qualificationEligible === false && complete.transactionSubmitted === false,
    'not-complete-engineering'
  );
  const names = await readdir(run);
  check(
    !['failure.json', 'raw-manifest-incomplete.json', 'preparation-failed.json'].some((name) => names.includes(name)),
    'failed-attempt'
  );
  const protocolFile = await record<EngineeringProtocol>(resolve(run, 'protocol.json'));
  const protocol = protocolFile.value;
  check(
    protocol.kind === 'already-exposed-goal-engineering-protocol-v2' &&
      protocol.input.plan.protocol === GOAL_QUALIFICATION_PROTOCOL_V2 &&
      canonical(protocol.input.plan.policy) === canonical(GOAL_QUALIFICATION_POLICY_V2),
    'protocol'
  );
  const preparedFile = await record<Record<string, unknown>>(resolve(run, 'prepared.json'));
  const prepared = preparedFile.value;
  const accessFile = await record<Record<string, unknown>>(resolve(run, 'access.json'));
  const access = accessFile.value;
  check(
    protocolFile.sha256 === digestBytes(canonical(protocol)) &&
      prepared.ready === true &&
      prepared.marketDataRead === false &&
      prepared.qualificationEligible === false &&
      prepared.protocolSha256 === protocolFile.sha256 &&
      access.protocolSha256 === protocolFile.sha256 &&
      access.kind === 'already-exposed-engineering-access-v1' &&
      access.qualificationEligible === false &&
      access.transactionSubmitted === false,
    'access-binding'
  );
  const { plan, request, manifest } = protocol.input;
  check(
    goalQualificationDigest(plan) === request.planSha256 &&
      goalQualificationDigest(request.candidate) === request.candidateSha256 &&
      plan.candidates.length === 1 &&
      canonical(plan.candidates[0]) === canonical(request.candidate) &&
      request.phase === 'training' &&
      request.episodeIndex === 0 &&
      request.startAtMs === plan.training.startAtMs &&
      request.endAtMs === plan.training.endAtMs &&
      request.partitionIdentitySha256 === plan.training.identitySha256 &&
      goalQualificationDigest(manifest) === plan.source.manifestSha256 &&
      manifest.protocol === 'goal-qualification-archive-source-v2' &&
      manifest.accessAuditSha256 === goalQualificationDigest(protocol.exposureAudit) &&
      protocol.exposureAudit.qualificationEligible === false,
    'input-binding'
  );
  check(
    Object.keys(protocol.sources).length === prepared.sourceFiles &&
      digestBytes(canonical(protocol.sources)) === plan.source.evaluatorSha256,
    'source-manifest'
  );
  for (const [path, hash] of Object.entries(protocol.sources)) {
    const resolved = resolve(root, path);
    check(
      within(root, resolved) === path &&
        (/^(?:src|scripts)\/.*\.(?:ts|mts)$/.test(path) ||
          ['package.json', 'tsconfig.json', 'yarn.lock'].includes(path) ||
          [resolve(base, 'run-engineering-v2.mts'), resolve(base, 'runtime-tsconfig.json')].includes(resolved)),
      'source-path'
    );
    check(digestBytes(await runner.bytes(resolved)) === hash, 'source-changed');
  }
  const fixedFiles: Record<string, string> = {
    'run-protocol': resolve(base, 'callback-collection/run-protocol.json'),
    verification: resolve(base, 'collector-complete-verification.json'),
    'raw-manifest': resolve(base, 'callback-raw-manifest.json'),
    'blocks-development': resolve(base, 'callback-development-blocks.json'),
  };
  fields(protocol.files, Object.keys(fixedFiles));
  for (const [name, file] of Object.entries(protocol.files)) {
    check(file.path === fixedFiles[name], 'input-path');
    check(digestBytes(await runner.bytes(file.path)) === file.sha256, 'input-changed');
  }
  for (const [name, path] of Object.entries({
    previousPreparationFailureSha256: 'episode-v1/preparation-failed.json',
    previousProtocolSha256: 'episode-v1/protocol.json',
    openingPreflightSha256: 'opening-preflight-v1/complete.json',
    engineeringMetadataProtocolSha256: 'protocol.json',
  }))
    check(digestBytes(await runner.bytes(resolve(base, path))) === protocol.exposureAudit[name], 'exposure-changed');
  const rawFile = await record<{ complete: boolean; rows: RawReceipt[]; bytes: number; httpStarts: number }>(
    resolve(run, 'raw-manifest.json')
  );
  const raw = rawFile.value;
  check(
    raw.complete === true &&
      Array.isArray(raw.rows) &&
      raw.rows.length > 0 &&
      raw.rows.length <= 16000 &&
      raw.rows.length === complete.rawReceipts &&
      raw.bytes === complete.rawBytes &&
      raw.httpStarts === complete.httpStarts &&
      Number.isSafeInteger(raw.httpStarts) &&
      raw.httpStarts >= 0 &&
      raw.httpStarts <= protocol.network.maximumStarts,
    'raw-manifest'
  );
  const rawNames = new Set(await readdir(resolve(run, 'raw'))),
    hashes = new Set<string>();
  check(rawNames.size === raw.rows.length, 'raw-file-count');
  let rawBytes = 0;
  for (const row of raw.rows) {
    fields(row, ['name', 'sha256', 'bytes']);
    check(/^[a-zA-Z0-9_.-]+\.json$/.test(row.name) && rawNames.delete(row.name), 'raw-name');
    sha(row.sha256);
    check(Number.isSafeInteger(row.bytes) && row.bytes > 0 && row.bytes <= 32 * 1024 ** 2, 'raw-size');
    const data = await runner.bytes(resolve(run, 'raw', row.name));
    check(data.length === row.bytes && digestBytes(data) === row.sha256, 'raw-bytes');
    rawBytes += data.length;
    check(rawBytes <= 512 * 1024 ** 2, 'raw-budget');
    hashes.add(row.sha256);
  }
  check(rawBytes === raw.bytes, 'raw-total');
  const resultFile = await record<GoalArchiveEngineeringResult>(resolve(run, 'result.json'));
  const result = resultFile.value;
  fields(result, ['kind', 'qualificationEligible', 'exposure', 'engineeringReceipt', 'trace', 'traceSha256']);
  check(
    result.kind === 'goal-archive-engineering-result-v1' &&
      result.qualificationEligible === false &&
      result.exposure === 'already-exposed' &&
      result.traceSha256 === goalQualificationDigest(result.trace) &&
      complete.traceSha256 === result.traceSha256 &&
      result.trace.events.length === complete.events &&
      result.trace.signals.length === complete.signals,
    'ineligible-trace-binding'
  );
  const expectedReceipt = {
    kind: 'already-exposed-engineering-run-v1',
    planSha256: request.planSha256,
    requestSha256: goalQualificationDigest(request),
    manifestSha256: plan.source.manifestSha256,
    exposureAuditSha256: goalQualificationDigest(protocol.exposureAudit),
    protocolRecordedBeforeRunSha256: protocolFile.sha256,
  };
  check(
    canonical(result.engineeringReceipt) === canonical(expectedReceipt) &&
      result.trace.dataSha256 === plan.source.manifestSha256,
    'engineering-receipt'
  );
  const checks = verifyGoalEpisodeClock(result.trace.clock, plan.arrivalModel, {
    startAtMs: request.startAtMs,
    endAtMs: request.endAtMs,
  });
  const metadata = (await record<GoalQualificationClockBlock[]>(protocol.files['blocks-development'].path)).value;
  check(plan.arrivalModel.kind === 'modeled-finalized-callbacks', 'modeled-clock-required');
  const rebuilt = builder.buildGoalQualificationClockV2({
    episode: { startAtMs: request.startAtMs, endAtMs: request.endAtMs },
    model: plan.arrivalModel,
    source: {
      sourceId: manifest.sourceId,
      genesisHash: manifest.genesisHash,
      manifestSha256: plan.source.manifestSha256,
      preregistrationSha256: protocolFile.sha256,
    },
    blocks: runner.selectClockCoverage(
      metadata,
      request.startAtMs,
      request.endAtMs,
      plan.arrivalModel.finalityDelayMs + plan.arrivalModel.callbackDelayMs
    ),
  });
  check(
    prepared.clockTraceSha256 === rebuilt.traceSha256 &&
      canonical(rebuilt.trace) === canonical(result.trace.clock) &&
      prepared.checks === checks.length &&
      canonical(prepared.cancelledChecks) === canonical(checks.filter((c) => 'cancelledAtMs' in c)),
    'prepared-clock'
  );
  const evidenceHashes = [
    result.trace.opening.evidenceSha256,
    result.trace.terminal.evidenceSha256,
    ...(result.trace.deadlineCancellation ? [result.trace.deadlineCancellation.evidenceSha256] : []),
    ...result.trace.events.flatMap((e) =>
      e.kind === 'valuation' ? [e.evidenceSha256] : [e.quoteEvidenceSha256, e.feeEvidenceSha256]
    ),
  ];
  check(
    evidenceHashes.every((hash) => hashes.has(hash)),
    'trace-raw-reference'
  );
  const source = (await record<Record<string, unknown>>(resolve(run, 'raw/source.json'))).value;
  check(
    source.kind === 'already-exposed-engineering-source-v1' &&
      source.qualificationEligible === false &&
      source.observedHistoricalArrivals === false &&
      source.observedFill === false &&
      source.transactionSubmitted === false &&
      canonical(source.engineeringReceipt) === canonical(expectedReceipt) &&
      canonical(source.request) === canonical(request) &&
      canonical(source.manifest) === canonical(manifest),
    'raw-source-binding'
  );
  const summary = replayEngineeringTrace(request, result.trace, plan.runtimeProfiles, plan.arrivalModel, plan.protocol);
  return {
    kind: 'already-exposed-engineering-verification-v1',
    verified: true,
    qualificationEligible: false,
    actualTransactions: 0,
    networkRequests: 0,
    scope: 'immutable-file-integrity-and-exact-ledger-replay; not raw-RPC-decoder reexecution or qualification',
    inputs: {
      protocolSha256: protocolFile.sha256,
      preparedSha256: preparedFile.sha256,
      accessSha256: accessFile.sha256,
      rawManifestSha256: rawFile.sha256,
      resultSha256: resultFile.sha256,
      completeSha256: completeFile.sha256,
      traceSha256: result.traceSha256,
    },
    rawReceipts: raw.rows.length,
    rawBytes,
    summary,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  check(process.argv.length === 3 && process.argv[2] === '--verify', 'use --verify');
  const verification = await verifyEngineeringDirectory();
  const receipt = await runner.save(resolve(BASE, 'episode-v2/verification.json'), {
    ...verification,
    verifierSha256: digestBytes(await runner.bytes(fileURLToPath(import.meta.url))),
  });
  console.log(
    JSON.stringify({
      verified: true,
      qualificationEligible: false,
      actualTransactions: 0,
      verificationSha256: receipt.sha256,
    })
  );
}
