/** Recheck original admission clocks after computation and again before a commit.
 * A fresh result remains research output; this module grants no order authority.
 */
import {
  isValidatedAccumulationAdmissionResult,
  type ValidatedAccumulationAdmissionResult,
} from './accumulation-admission-result';
import type { SubprocessClock } from './accumulation-subprocess';

const HOUR = 3_600_000;
const NS_PER_MS = 1_000_000n;

export interface AccumulationCompletionAssessment {
  kind: 'accumulation-completion-clock-v1';
  status: 'fresh-research-buy' | 'unusable-buy' | 'no-buy';
  originalAction: 'buy' | 'wait' | null;
  originalSelectedInputKusd: number | null;
  inputSha256: string;
  outputSha256: string;
  /** Actual parent observation; never substituted into original receipt fields. */
  checkedAt: SubprocessClock;
  /** Conservative wall time advanced by elapsed monotonic time since the child invocation. */
  effectiveAtMs: number;
  selectionInputAtMs: number;
  completionAtMs: number;
  originalContextReceivedAtMs: number;
  originalQuoteReceivedAtMs: number | null;
  originalFeeReceivedAtMs: number | null;
  originalExpiresAtMs: number | null;
  originalDeadlineMs: number;
  reasons: string[];
  freshnessPassed: boolean;
  journalStillCurrentVerified: false;
  sourceAcquisitionVerified: false;
  qualificationAuthority: false;
  orderAuthority: false;
  financialActions: false;
}

function check(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(`accumulation-completion-clock:${reason}`);
}
function integer(value: unknown): number {
  check(typeof value === 'number' && Number.isSafeInteger(value) && value >= 0, 'integer');
  return value;
}
function clock(value: SubprocessClock): SubprocessClock {
  check(value && Object.getPrototypeOf(value) === Object.prototype, 'clock-object');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  check(
    Reflect.ownKeys(descriptors).length === 2 &&
      ['wallMs', 'monotonicNs'].every((key) => descriptors[key]?.enumerable && 'value' in descriptors[key]),
    'clock-fields'
  );
  const wallMs = integer(descriptors.wallMs.value),
    monotonicNs = descriptors.monotonicNs.value;
  check(typeof monotonicNs === 'string' && /^(0|[1-9]\d{0,24})$/.test(monotonicNs), 'monotonic-clock');
  return Object.freeze({ wallMs, monotonicNs });
}
/** Round elapsed nanoseconds upward so a submillisecond remainder cannot extend a quote lifetime. */
function elapsedMs(later: bigint, earlier: bigint): number {
  check(later >= earlier, 'monotonic-clock-regressed');
  return integer(Number((later - earlier + NS_PER_MS - 1n) / NS_PER_MS));
}

function assess(
  result: ValidatedAccumulationAdmissionResult,
  suppliedClock: SubprocessClock
): AccumulationCompletionAssessment {
  check(isValidatedAccumulationAdmissionResult(result), 'validated-result-ownership-required');
  const checkedAt = clock(suppliedClock),
    { packet, episode } = result.request;
  const started = result.actualClocks.started,
    finished = result.actualClocks.finished;
  const reasons: string[] = [];
  const currentNs = BigInt(checkedAt.monotonicNs),
    finishedNs = BigInt(finished.monotonicNs),
    startedNs = BigInt(started.monotonicNs);
  let effectiveAtMs = Math.max(checkedAt.wallMs, finished.wallMs);
  if (currentNs < finishedNs || currentNs < startedNs) reasons.push('monotonic-clock-regressed');
  else
    effectiveAtMs = Math.max(
      effectiveAtMs,
      integer(started.wallMs + elapsedMs(currentNs, startedNs)),
      integer(finished.wallMs + elapsedMs(currentNs, finishedNs))
    );
  if (checkedAt.wallMs < finished.wallMs) reasons.push('observed-wall-clock-regressed');
  if (started.wallMs < packet.decisionAtMs) reasons.push('evaluation-start-before-input');
  if (finished.wallMs < packet.decisionAtMs) reasons.push('completion-before-input');
  const deadline = integer(episode.deadlineMs);
  if (effectiveAtMs >= deadline) reasons.push('goal-deadline');
  if (Math.floor(effectiveAtMs / HOUR) !== Math.floor(packet.decisionAtMs / HOUR))
    reasons.push('completed-hour-changed');
  if (effectiveAtMs - packet.contextReceivedAtMs >= 5000) reasons.push('context-expired');
  if (effectiveAtMs - packet.block.timestampMs > 60_000) reasons.push('block-stale');
  const originalAction = result.decision?.action ?? null;
  const quote = result.selectedCandidate?.quote ?? null;
  if (originalAction === 'buy') {
    check(quote !== null, 'selected-quote-required');
    if (effectiveAtMs - quote.quoteReceivedAtMs >= 5000) reasons.push('quote-expired');
    if (effectiveAtMs >= quote.expiresAtMs) reasons.push('acceptance-expired');
  }
  const freshnessPassed = originalAction === 'buy' && reasons.length === 0;
  return Object.freeze({
    kind: 'accumulation-completion-clock-v1',
    status: originalAction !== 'buy' ? 'no-buy' : freshnessPassed ? 'fresh-research-buy' : 'unusable-buy',
    originalAction,
    originalSelectedInputKusd: result.decision?.selected_input_kusd ?? null,
    inputSha256: result.inputSha256,
    outputSha256: result.outputSha256,
    checkedAt,
    effectiveAtMs,
    selectionInputAtMs: packet.decisionAtMs,
    completionAtMs: finished.wallMs,
    originalContextReceivedAtMs: packet.contextReceivedAtMs,
    originalQuoteReceivedAtMs: quote?.quoteReceivedAtMs ?? null,
    originalFeeReceivedAtMs: quote?.feeReceivedAtMs ?? null,
    originalExpiresAtMs: quote?.expiresAtMs ?? null,
    originalDeadlineMs: deadline,
    reasons: Object.freeze(reasons) as unknown as string[],
    freshnessPassed,
    journalStillCurrentVerified: false,
    sourceAcquisitionVerified: false,
    qualificationAuthority: false,
    orderAuthority: false,
    financialActions: false,
  });
}

/** Capture the real parent clock for an observed invocation. Repeat immediately before freeze/commit.
 * Never backdate this check to a historical decision or use it to renew a receipt.
 */
export function assessAccumulationAdmissionCompletion(
  result: ValidatedAccumulationAdmissionResult
): AccumulationCompletionAssessment {
  return assess(result, { wallMs: Date.now(), monotonicNs: process.hrtime.bigint().toString() });
}

/** Explicit pure synthetic clock seam; production entry points always read the actual parent clock. */
export function assessAccumulationAdmissionCompletionForTesting(
  result: ValidatedAccumulationAdmissionResult,
  at: SubprocessClock
): AccumulationCompletionAssessment {
  return assess(result, at);
}
