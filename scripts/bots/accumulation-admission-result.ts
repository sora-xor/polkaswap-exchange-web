/** Pure validation of a pinned offline admission invocation; no subprocess, model read or trading authority. */
import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve } from 'node:path';
import { canonicalAccumulationJournalJson as canonical } from './accumulation-journal-store';
import type {
  AccumulationSubprocessReceipt,
  AccumulationSubprocessRequest,
  SubprocessClock,
} from './accumulation-subprocess';
import type { AccumulationCandidate, AccumulationVerifiedPacket } from './accumulation-evidence-bridge';

const MODEL_SHA = '59c55ea8eb27b9efcf6e14cff95f3a56f73f2e65d9e66c82bad7b1a5b5fff355';
const SOURCES = Object.freeze({
  'scripts/bots/accumulation_admission_runner.py': '25de2ff4e4e9dbe6b7e57d0d444ad5d1a6f4ff16ba78b3455cd7975bc7bd3e16',
  'scripts/bots/accumulation_admission_policy.py': '899d66482c90348684faca6f557224fddf4118ef8932a36b735bd4c935a4d44d',
  'scripts/bots/accumulation_stopping_model.py': '26f2d6bc93490338da6488d081271a83bf3d24203fc26b4c2e216abbb234e7a6',
});
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const DENOMINATOR = '100000000000000000000000000000000000000';
const HOUR = 3600000,
  UNIT = 10n ** 18n,
  MAX = (1n << 128n) - 1n;
const SHA = /^[0-9a-f]{64}$/,
  HASH = /^0x[0-9a-f]{64}$/,
  ID = /^[a-zA-Z0-9_-]{1,96}$/;
const owned = new WeakSet<object>();
type Data = Record<string, unknown>;
type Ratio = { numerator: string; denominator: string };
type Fraction = { n: bigint; d: bigint };
export interface AccumulationAdmissionResultTrust {
  repositoryRoot: string;
  pythonExecutable: string;
  registrationSha256: string;
  pythonSha256: string;
  sourceBindings: { path: string; sha256: string }[];
  modelSha256: string;
  expectedInputSha256: string;
  expectedEpisode: {
    episodeId: string;
    journalPrefixSha256: string;
    journalRevision: number;
    projectionSha256: string;
  };
  expectedPacketSha256: string;
  limits: AccumulationSubprocessRequest['limits'];
}
export interface AccumulationAdmissionCandidateMath {
  input_kusd: number;
  admitted: boolean;
  reasons: string[];
  post_entry_value_xor: Ratio | null;
  expected_terminal_xor: string | null;
  expected_growth_xor: string | null;
  expected_excess_xor: string | null;
  passing_paths: number;
  ambiguous_paths: number;
  failed_attempt_value_xor: Ratio | null;
}
export interface AccumulationAdmissionMathDecision {
  action: 'buy' | 'wait';
  selected_input_kusd: number | null;
  reason: string;
  expected_wait_terminal_xor: string | null;
  candidates: AccumulationAdmissionCandidateMath[];
  scenario_count: number;
  wait_passing_paths: number;
  wait_ambiguous_paths: number;
  seed: number;
}
export interface ValidatedAccumulationAdmissionResult {
  kind: 'validated-accumulation-admission-result-v1';
  status: 'evaluated' | 'incomplete';
  inputSha256: string;
  outputSha256: string;
  receiptSha256: string;
  modelSha256: string;
  decision: AccumulationAdmissionMathDecision | null;
  candidateOutcomes: AccumulationCandidate[];
  selectedCandidate: AccumulationCandidate | null;
  actualClocks: { started: SubprocessClock; spawned: SubprocessClock; finished: SubprocessClock; elapsedNs: string };
  request: { kind: 'accumulation-admission-request-v1'; packet: AccumulationVerifiedPacket; episode: Data };
  result: Data;
  retainedReceipt: AccumulationSubprocessReceipt;
  trustedBindings: AccumulationAdmissionResultTrust;
  receiptProvenance: 'trusted-parent-receipt-required';
  forecastRecomputed: false;
  postComputationFreshnessVerified: false;
  journalStillCurrentVerified: false;
  qualificationAuthority: false;
  orderAuthority: false;
  financialActions: false;
}
/** Invalid transport/result bytes do not become a wait, a retry or an order. */
export class AccumulationAdmissionResultError extends Error {
  constructor(readonly reason: string) {
    super(`accumulation-admission-result:${reason}`);
  }
}
function check(value: unknown, reason: string): asserts value {
  if (!value) throw new AccumulationAdmissionResultError(reason);
}
function digest(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}
function copy<T>(value: T): T {
  return JSON.parse(canonical(value));
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function equal(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}
function fields(value: unknown, keys: string): Data {
  check(value && typeof value === 'object' && !Array.isArray(value), 'object');
  const row = value as Data,
    names = keys.split(' ');
  check(Object.keys(row).length === names.length && names.every((k) => Object.hasOwn(row, k)), 'fields');
  return row;
}
function integer(value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): number {
  check(typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum, 'integer');
  return value;
}
function hash(value: unknown, block = false): string {
  check(typeof value === 'string' && (block ? HASH : SHA).test(value), 'hash');
  return value;
}
function code(value: unknown): string {
  check(typeof value === 'string' && ID.test(value), 'reason-code');
  return value;
}
function natural(value: unknown, maxLength = 192): bigint {
  check(typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value) && value.length <= maxLength, 'natural');
  return BigInt(value);
}
function frac(n: bigint, d: bigint): Fraction {
  check(d > 0n, 'ratio-denominator');
  let a = n < 0n ? -n : n,
    b = d;
  while (b) [a, b] = [b, a % b];
  return { n: n / a, d: d / a };
}
function ratio(value: unknown, positive = true): Fraction {
  const r = fields(value, 'numerator denominator'),
    n = natural(r.numerator),
    d = natural(r.denominator);
  check(d > 0n && (positive ? n > 0n : n >= 0n), 'ratio-domain');
  const f = frac(n, d);
  check(f.n === n && f.d === d, 'ratio-reduced');
  return f;
}
function codec(value: unknown): Fraction {
  const n = natural(value, 39);
  check(n <= MAX, 'codec-overflow');
  return frac(n, UNIT);
}
function plus(a: Fraction, b: Fraction): Fraction {
  return frac(a.n * b.d + b.n * a.d, a.d * b.d);
}
function minus(a: Fraction, b: Fraction): Fraction {
  return frac(a.n * b.d - b.n * a.d, a.d * b.d);
}
function divide(a: Fraction, b: Fraction): Fraction {
  return frac(a.n * b.d, a.d * b.n);
}
function compare(a: Fraction, b: Fraction): number {
  const d = a.n * b.d - b.n * a.d;
  return d < 0n ? -1 : d > 0n ? 1 : 0;
}
function sameRatio(raw: unknown, f: Fraction): void {
  const v = ratio(raw, false);
  check(v.n === f.n && v.d === f.d, 'immediate-accounting');
}
/** Bounded precheck rejects duplicate decoded keys, deep structures and non-exact JSON numbers. */
function parseJson(text: string): unknown {
  let at = 0,
    nodes = 0;
  const whitespace = () => {
    while (/[\t\r\n ]/.test(text[at] ?? '_')) at++;
  };
  const string = () => {
    const token = /"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/y;
    token.lastIndex = at;
    const found = token.exec(text);
    check(found, 'invalid-json-string');
    at = token.lastIndex;
    return JSON.parse(found[0]) as string;
  };
  const value = (depth: number): void => {
    check(++nodes <= 50000 && depth <= 24, 'json-bound');
    whitespace();
    const first = text[at];
    if (first === '"') {
      string();
      return;
    }
    if (first === '{' || first === '[') {
      const end = first === '{' ? '}' : ']';
      at++;
      whitespace();
      if (text[at] === end) {
        at++;
        return;
      }
      const keys = new Set<string>();
      while (true) {
        whitespace();
        if (first === '{') {
          const key = string();
          check(!keys.has(key), 'duplicate-json-key');
          keys.add(key);
          whitespace();
          check(text[at++] === ':', 'invalid-json-colon');
        }
        value(depth + 1);
        whitespace();
        if (text[at] === end) {
          at++;
          return;
        }
        check(text[at++] === ',', 'invalid-json-separator');
      }
    }
    const token = /(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/y;
    token.lastIndex = at;
    const found = token.exec(text);
    check(found, 'invalid-json-value');
    at = token.lastIndex;
    if (/^[-\d]/.test(found[0]))
      check(/^-?(?:0|[1-9]\d*)$/.test(found[0]) && Number.isSafeInteger(Number(found[0])), 'inexact-json-number');
  };
  value(0);
  whitespace();
  check(at === text.length, 'trailing-json-data');
  return JSON.parse(text);
}

function requestData(value: unknown, trust: AccumulationAdmissionResultTrust) {
  const request = fields(value, 'kind packet episode');
  check(request.kind === 'accumulation-admission-request-v1', 'request-kind');
  const p = fields(
    request.packet,
    'status packetSha256 genesisHash denominator block contextReceivedAtMs decisionAtMs currentPrice latestCompletedClose candidates'
  );
  check(
    (p.status === 'verified' || p.status === 'incomplete') &&
      p.genesisHash === GENESIS &&
      p.denominator === DENOMINATOR &&
      p.packetSha256 === trust.expectedPacketSha256,
    'packet-binding'
  );
  hash(p.packetSha256);
  const block = fields(p.block, 'hash height timestampMs');
  hash(block.hash, true);
  integer(block.height, 1);
  const native = integer(block.timestampMs),
    context = integer(p.contextReceivedAtMs),
    decision = integer(p.decisionAtMs);
  check(native <= context && context <= decision, 'context-clock');
  const price = ratio(p.currentPrice),
    close = fields(p.latestCompletedClose, 'timestampMs availableAtMs price evidenceSha256');
  const closeTime = integer(close.timestampMs),
    available = integer(close.availableAtMs);
  check(
    closeTime === Math.floor(decision / HOUR) * HOUR && closeTime <= available && available <= decision,
    'completed-close'
  );
  ratio(close.price);
  hash(close.evidenceSha256);
  const e = fields(
    request.episode,
    'episodeId journalPrefixSha256 journalRevision openingAtMs deadlineMs lastAtMs opening current attemptCommitted successfulPurchase orderPhase goalStopped targetReached'
  );
  const expected = fields(trust.expectedEpisode, 'episodeId journalPrefixSha256 journalRevision projectionSha256');
  code(e.episodeId);
  hash(e.journalPrefixSha256);
  integer(e.journalRevision);
  check(
    e.episodeId === expected.episodeId &&
      e.journalPrefixSha256 === expected.journalPrefixSha256 &&
      e.journalRevision === expected.journalRevision &&
      digest(canonical(e)) === expected.projectionSha256,
    'episode-binding'
  );
  code(expected.episodeId);
  hash(expected.journalPrefixSha256);
  integer(expected.journalRevision);
  hash(expected.projectionSha256);
  const start = integer(e.openingAtMs),
    deadline = integer(e.deadlineMs),
    last = integer(e.lastAtMs);
  check(
    start % HOUR === 0 &&
      deadline - start === 24 * HOUR &&
      start >= 1785261600000 &&
      start <= last &&
      last <= decision &&
      native <= last,
    'episode-clock'
  );
  const opening = fields(e.opening, 'capitalKusdCodec feeReserveXorCodec price'),
    current = fields(e.current, 'kusdCodec xorCodec feesPaidXorCodec peakXor markBlockHash');
  const capital = codec(opening.capitalKusdCodec),
    reserve = codec(opening.feeReserveXorCodec),
    openingPrice = ratio(opening.price),
    peak = ratio(current.peakXor);
  check(
    compare(capital, frac(0n, 1n)) > 0 && compare(capital, frac(10n, 1n)) <= 0 && compare(reserve, frac(1n, 1n)) <= 0,
    'opening-limits'
  );
  check(
    compare(codec(current.kusdCodec), capital) === 0 &&
      compare(codec(current.xorCodec), reserve) === 0 &&
      codec(current.feesPaidXorCodec).n === 0n &&
      e.attemptCommitted === false &&
      e.successfulPurchase === false &&
      (e.orderPhase === 'none' || e.orderPhase === 'cancelled') &&
      typeof e.goalStopped === 'boolean' &&
      e.targetReached === false &&
      current.markBlockHash === block.hash,
    'untouched-episode'
  );
  const currentValue = plus(divide(capital, price), reserve),
    openingValue = plus(divide(capital, openingPrice), reserve),
    floor = frac(peak.n * 9n, peak.d * 10n);
  check(
    compare(peak, currentValue) >= 0 &&
      compare(peak, openingValue) >= 0 &&
      (compare(currentValue, floor) > 0 || e.goalStopped),
    'durable-peak-or-stop'
  );
  check(Array.isArray(p.candidates) && p.candidates.length === 9, 'nine-outcomes');
  const outcomes = p.candidates.map((raw, index) => {
    const row = fields(raw, 'inputKusd status reason evidenceSha256 quote');
    check(row.inputKusd === index + 1, 'candidate-order');
    check(
      typeof row.status === 'string' && ['ready', 'unavailable', 'failed', 'rejected-impact'].includes(row.status),
      'candidate-status'
    );
    if (row.status === 'ready') check(row.reason === null, 'candidate-reason');
    else code(row.reason);
    check(
      Array.isArray(row.evidenceSha256) && row.evidenceSha256.length > 0 && row.evidenceSha256.length <= 32,
      'candidate-evidence'
    );
    row.evidenceSha256.forEach((v) => hash(v));
    if (row.status === 'failed' || row.status === 'unavailable') check(row.quote === null, 'missing-quote');
    else {
      const q = fields(
        row.quote,
        'quotedOutputXorCodec minimumOutputXorCodec networkFeeXorCodec priceImpact quoteReceivedAtMs feeReceivedAtMs expiresAtMs'
      );
      const output = natural(q.quotedOutputXorCodec, 39),
        minimum = natural(q.minimumOutputXorCodec, 39);
      codec(q.quotedOutputXorCodec);
      codec(q.minimumOutputXorCodec);
      codec(q.networkFeeXorCodec);
      check(output > 0n && minimum > 0n && minimum === (output * 9950n) / 10000n, 'original-minimum');
      const impact = ratio(q.priceImpact, false);
      check((row.status === 'rejected-impact') === compare(impact, frac(1n, 100n)) > 0, 'original-impact');
      const observed = integer(q.quoteReceivedAtMs),
        fee = integer(q.feeReceivedAtMs),
        expires = integer(q.expiresAtMs);
      check(context <= observed && observed <= fee && fee <= decision && expires > observed, 'quote-clock');
    }
    return row as unknown as AccumulationCandidate;
  });
  check(!outcomes.some((c) => c.status === 'failed') || p.status === 'incomplete', 'failed-packet');
  return {
    request,
    p,
    e,
    capital,
    reserve,
    price,
    peak,
    floor,
    currentValue,
    openingValue,
    native,
    context,
    decision,
    deadline,
    closeTime,
    outcomes,
  };
}
type RequestContext = ReturnType<typeof requestData>;
/** Bounded Decimal diagnostics are compared without converting them to binary floating point. */
function decimal(value: unknown) {
  check(typeof value === 'string' && value.length <= 256, 'decimal-string');
  const match = /^(-?)(0|[1-9][0-9]*)(?:\.([0-9]+))?(?:E([+-]?(?:0|[1-9][0-9]*)))?$/.exec(value);
  check(match, 'finite-decimal');
  const digits = (match[2] + (match[3] ?? '')).replace(/^0+/, '') || '0';
  check(digits.length <= 81 && (!match[4] || match[4].replace(/^[+-]/, '').length <= 7), 'decimal-bound');
  const exponent = Number(match[4] ?? 0) - (match[3]?.length ?? 0);
  check(Number.isSafeInteger(exponent) && Math.abs(exponent) <= 1000100, 'decimal-exponent');
  return { sign: digits === '0' ? 0 : match[1] ? -1 : 1, digits, exponent };
}
function nullableMath(row: Data, entry: Fraction | null, failure: Fraction | null) {
  if (entry) sameRatio(row.post_entry_value_xor, entry);
  else check(row.post_entry_value_xor === null, 'unexpected-entry');
  if (failure) sameRatio(row.failed_attempt_value_xor, failure);
  else check(row.failed_attempt_value_xor === null, 'unexpected-failure-value');
}
function quoteReasons(c: AccumulationCandidate, r: RequestContext): string[] {
  const q = c.quote!;
  const reasons: string[] = [];
  if (compare(frac(BigInt(c.inputKusd), 1n), r.capital) >= 0) reasons.push('not_a_partial_integer_size');
  if (compare(ratio(q.priceImpact, false), frac(1n, 100n)) > 0) reasons.push('price_impact_exceeded');
  if (compare(codec(q.networkFeeXorCodec), r.reserve) > 0) reasons.push('fee_reserve_exceeded');
  if (r.decision - q.quoteReceivedAtMs >= 5000) reasons.push('stale_quote');
  if (r.decision - r.native > 60000) reasons.push('stale_quote_block');
  if (r.decision >= q.expiresAtMs) reasons.push('expired_quote');
  return reasons;
}
function mathDecision(value: unknown, r: RequestContext): AccumulationAdmissionMathDecision {
  const d = fields(
    value,
    'action selected_input_kusd reason expected_wait_terminal_xor candidates scenario_count wait_passing_paths wait_ambiguous_paths seed'
  );
  check((d.action === 'buy' || d.action === 'wait') && d.seed === 20260926, 'decision-kind');
  code(d.reason);
  check(Array.isArray(d.candidates) && d.candidates.length <= 9, 'decision-candidates');
  const active = r.outcomes.filter((c) => c.quote !== null);
  const early = r.e.goalStopped
    ? 'goal_stopped'
    : r.closeTime >= r.deadline
      ? 'episode_expired'
      : r.decision - r.native > 60000
        ? 'stale_current_state'
        : r.decision - r.context >= 5000
          ? 'stale_current_context'
          : compare(r.currentValue, r.floor) < 0
            ? 'current_drawdown_exceeded'
            : active.length === 0
              ? 'no_candidates'
              : null;
  if (early) {
    check(
      d.action === 'wait' &&
        d.selected_input_kusd === null &&
        d.reason === early &&
        d.expected_wait_terminal_xor === null &&
        d.candidates.length === 0 &&
        d.scenario_count === 0 &&
        d.wait_passing_paths === 0 &&
        d.wait_ambiguous_paths === 0,
      'early-decision'
    );
    return d as unknown as AccumulationAdmissionMathDecision;
  }
  check(d.scenario_count === 1024 && d.candidates.length === active.length, 'scenario-count');
  const waitPassing = integer(d.wait_passing_paths, 0, 1024),
    waitAmbiguous = integer(d.wait_ambiguous_paths, 0, 1024);
  check(waitPassing + waitAmbiguous <= 1024, 'wait-path-count');
  check(decimal(d.expected_wait_terminal_xor).sign > 0, 'wait-value');
  const admitted: Data[] = [];
  d.candidates.forEach((value, index) => {
    const row = fields(
      value,
      'input_kusd admitted reasons post_entry_value_xor expected_terminal_xor expected_growth_xor expected_excess_xor passing_paths ambiguous_paths failed_attempt_value_xor'
    );
    const original = active[index];
    check(row.input_kusd === original.inputKusd && typeof row.admitted === 'boolean', 'candidate-math-identity');
    check(Array.isArray(row.reasons) && row.reasons.length <= 10, 'candidate-reasons');
    row.reasons.forEach(code);
    const passing = integer(row.passing_paths, 0, 1024),
      ambiguous = integer(row.ambiguous_paths, 0, 1024);
    check(passing + ambiguous <= 1024, 'candidate-path-count');
    const reasons = quoteReasons(original, r),
      q = original.quote!;
    let entry: Fraction | null = null,
      failure: Fraction | null = null;
    if (!reasons.length) {
      entry = plus(
        divide(minus(r.capital, frac(BigInt(original.inputKusd), 1n)), r.price),
        plus(r.reserve, minus(codec(q.minimumOutputXorCodec), codec(q.networkFeeXorCodec)))
      );
      if (compare(entry, r.floor) < 0) reasons.push('entry_drawdown_exceeded');
      else {
        failure = minus(r.currentValue, codec(q.networkFeeXorCodec));
        if (compare(failure, r.floor) < 0) reasons.push('failed_attempt_drawdown_exceeded');
      }
    }
    nullableMath(row, entry, failure);
    if (reasons.length) {
      check(
        row.admitted === false &&
          equal(row.reasons, reasons) &&
          row.expected_terminal_xor === null &&
          row.expected_growth_xor === null &&
          row.expected_excess_xor === null &&
          passing === 0 &&
          ambiguous === 0,
        'pre-scenario-rejection'
      );
    } else {
      const terminal = decimal(row.expected_terminal_xor),
        growth = decimal(row.expected_growth_xor),
        excess = decimal(row.expected_excess_xor);
      check(terminal.sign > 0, 'terminal-value');
      const forecastReasons = [
        'expected_growth_not_robustly_positive',
        'expected_excess_not_robustly_positive',
        'model_path_drawdown_filter_failed',
      ];
      check(
        equal(
          row.reasons,
          forecastReasons.filter((reason) => (row.reasons as unknown[]).includes(reason))
        ),
        'forecast-reasons'
      );
      check(row.reasons.includes('model_path_drawdown_filter_failed') === passing < 973, 'path-rejection');
      check(
        (growth.sign > 0 || row.reasons.includes(forecastReasons[0])) &&
          (excess.sign > 0 || row.reasons.includes(forecastReasons[1])),
        'nonpositive-forecast'
      );
      check(row.admitted === (row.reasons.length === 0), 'admitted-reasons');
      if (row.admitted) admitted.push(row);
    }
  });
  if (d.action === 'buy') {
    const selected = integer(d.selected_input_kusd, 1, 9),
      result = admitted.find((row) => row.input_kusd === selected);
    check(
      result && d.reason === 'myopic_model_admission_only' && r.outcomes[selected - 1].status === 'ready',
      'selected-candidate'
    );
  } else
    check(
      d.selected_input_kusd === null &&
        (admitted.length === 0 ? d.reason === 'no_candidate_admitted' : d.reason === 'numerically_ambiguous_ranking'),
      'wait-selection'
    );
  return d as unknown as AccumulationAdmissionMathDecision;
}

function clock(value: unknown): SubprocessClock {
  const c = fields(value, 'wallMs monotonicNs');
  integer(c.wallMs);
  natural(c.monotonicNs, 32);
  return c as unknown as SubprocessClock;
}
function stream(value: unknown, maximum: number, empty = false): Buffer {
  const s = fields(value, 'observedSha256 observedBytes retainedSha256 retainedBase64 retainedBytes truncated');
  const count = integer(s.observedBytes, empty ? 0 : 1, maximum);
  check(
    s.retainedBytes === count &&
      s.truncated === false &&
      typeof s.retainedBase64 === 'string' &&
      s.retainedBase64.length <= Math.ceil(maximum / 3) * 4,
    'stream-count'
  );
  const bytes = Buffer.from(s.retainedBase64, 'base64');
  check(
    bytes.toString('base64') === s.retainedBase64 &&
      bytes.length === count &&
      digest(bytes) === s.observedSha256 &&
      digest(bytes) === s.retainedSha256 &&
      (!empty || count === 0),
    'stream-bytes'
  );
  return bytes;
}
/** Provenance covers this validator's checked bytes, not independent authentication of the child process. */
export function isValidatedAccumulationAdmissionResult(value: unknown): value is ValidatedAccumulationAdmissionResult {
  return !!value && typeof value === 'object' && owned.has(value);
}
/** Validate one completed invocation against externally retained immutable request/episode/runtime bindings. */
export function validateAccumulationAdmissionResult(
  inputBytes: Uint8Array,
  receiptInput: AccumulationSubprocessReceipt,
  trustedInput: AccumulationAdmissionResultTrust
): ValidatedAccumulationAdmissionResult {
  try {
    check(
      inputBytes instanceof Uint8Array && inputBytes.byteLength > 0 && inputBytes.byteLength <= 256 * 1024,
      'input-bytes'
    );
    const input = Buffer.from(inputBytes),
      inputSha = digest(input);
    const t = fields(
      copy(trustedInput),
      'repositoryRoot pythonExecutable registrationSha256 pythonSha256 sourceBindings modelSha256 expectedInputSha256 expectedEpisode expectedPacketSha256 limits'
    ) as unknown as AccumulationAdmissionResultTrust;
    for (const value of [
      t.registrationSha256,
      t.pythonSha256,
      t.expectedInputSha256,
      t.expectedPacketSha256,
      t.modelSha256,
    ])
      hash(value);
    check(inputSha === t.expectedInputSha256 && t.modelSha256 === MODEL_SHA, 'trusted-input-or-model');
    for (const path of [t.repositoryRoot, t.pythonExecutable])
      check(
        typeof path === 'string' &&
          path.length <= 4096 &&
          isAbsolute(path) &&
          resolve(path) === path &&
          !path.includes('\0'),
        'canonical-path'
      );
    const limits = fields(t.limits, 'timeoutMs maxInputBytes maxStdoutBytes maxStderrBytes');
    integer(limits.timeoutMs, 1, 60000);
    integer(limits.maxInputBytes, 1, 256 * 1024);
    integer(limits.maxStdoutBytes, 1, 256 * 1024);
    integer(limits.maxStderrBytes, 1, 64 * 1024);
    check(input.length <= t.limits.maxInputBytes, 'input-limit');
    check(Array.isArray(t.sourceBindings) && t.sourceBindings.length === 3, 'three-source-pins');
    const bindings = new Map<string, string>();
    for (const raw of t.sourceBindings) {
      const b = fields(raw, 'path sha256');
      check(
        typeof b.path === 'string' &&
          Object.hasOwn(SOURCES, b.path) &&
          !bindings.has(b.path) &&
          b.sha256 === SOURCES[b.path as keyof typeof SOURCES],
        'held-source-pin'
      );
      bindings.set(b.path, b.sha256 as string);
    }
    check(bindings.size === 3, 'three-source-pins');
    const r = fields(
      copy(receiptInput),
      'kind runner registrationSha256 executable argv cwd environment input limits started spawned finished elapsedNs before after stdout stderr spawnAttempted pid exitObserved exitCode exitSignal closeObserved terminationUnconfirmed outcomeUnknown timedOut terminationRequests errors outcome resultAuthority'
    ) as unknown as AccumulationSubprocessReceipt;
    check(
      r.kind === 'accumulation-subprocess-v1' &&
        r.runner === 'admission' &&
        r.registrationSha256 === t.registrationSha256 &&
        r.executable === t.pythonExecutable &&
        r.cwd === t.repositoryRoot &&
        equal(r.argv, ['-I', '-S', '-B', join(t.repositoryRoot, 'scripts/bots/accumulation_admission_runner.py')]) &&
        equal(r.environment, { LANG: 'C', LC_ALL: 'C', TZ: 'UTC' }) &&
        equal(r.limits, t.limits),
      'runtime-receipt-binding'
    );
    fields(r.input, 'bytes sha256 writeCompleted');
    check(
      r.input.bytes === input.length && r.input.sha256 === inputSha && r.input.writeCompleted === true,
      'stdin-binding'
    );
    check(
      r.spawnAttempted === true &&
        r.exitObserved === true &&
        r.exitCode === 0 &&
        r.exitSignal === null &&
        r.closeObserved === true &&
        r.terminationUnconfirmed === false &&
        r.outcomeUnknown === false &&
        r.timedOut === false &&
        r.outcome === 'completed' &&
        r.resultAuthority === false &&
        Array.isArray(r.terminationRequests) &&
        r.terminationRequests.length === 0 &&
        Array.isArray(r.errors) &&
        r.errors.length === 0,
      'completed-transport'
    );
    integer(r.pid, 1);
    const wanted = new Map([
      [t.pythonExecutable, t.pythonSha256],
      ...Array.from(bindings, ([path, sha]) => [join(t.repositoryRoot, path), sha] as [string, string]),
    ]);
    check(wanted.size === 4, 'distinct-runtime-paths');
    for (const checks of [r.before, r.after]) {
      check(Array.isArray(checks) && checks.length === 4, 'four-binding-checks');
      const seen = new Set<string>();
      for (const raw of checks) {
        const b = fields(raw, 'path expectedSha256 actualSha256 status reason');
        check(
          typeof b.path === 'string' &&
            wanted.has(b.path) &&
            !seen.has(b.path) &&
            b.expectedSha256 === wanted.get(b.path) &&
            b.actualSha256 === wanted.get(b.path) &&
            b.status === 'match' &&
            b.reason === null,
          'runtime-pin-check'
        );
        seen.add(b.path);
      }
    }
    const started = clock(r.started),
      spawned = clock(r.spawned),
      finished = clock(r.finished),
      elapsed = natural(r.elapsedNs, 32);
    check(
      started.wallMs <= spawned.wallMs &&
        spawned.wallMs <= finished.wallMs &&
        BigInt(started.monotonicNs) <= BigInt(spawned.monotonicNs) &&
        BigInt(spawned.monotonicNs) <= BigInt(finished.monotonicNs) &&
        elapsed === BigInt(finished.monotonicNs) - BigInt(started.monotonicNs),
      'actual-clock-order'
    );
    stream(r.stderr, t.limits.maxStderrBytes, true);
    const outputBytes = stream(r.stdout, t.limits.maxStdoutBytes);
    const inputText = new TextDecoder('utf-8', { fatal: true }).decode(input),
      outputText = new TextDecoder('utf-8', { fatal: true }).decode(outputBytes);
    const request = requestData(parseJson(inputText), t);
    const out = fields(
      parseJson(outputText),
      'kind status inputSha256 modelSha256 packetSha256 episodeId journalPrefixSha256 journalRevision evidenceAuthentication dependencySha256 policyCalled candidateOutcomes decision financialActions qualificationAuthority'
    );
    check(canonical(out) + '\n' === outputText, 'canonical-output');
    const dependencies = Object.fromEntries(
      Object.entries(SOURCES)
        .filter(([path]) => !path.endsWith('accumulation_admission_runner.py'))
        .map(([path, sha]) => [path.split('/').at(-1), sha])
    );
    check(
      out.kind === 'accumulation-admission-result-v1' &&
        out.inputSha256 === inputSha &&
        out.modelSha256 === MODEL_SHA &&
        out.packetSha256 === request.p.packetSha256 &&
        out.episodeId === request.e.episodeId &&
        out.journalPrefixSha256 === request.e.journalPrefixSha256 &&
        out.journalRevision === request.e.journalRevision &&
        out.evidenceAuthentication === 'external-verifier-and-trusted-journal-required' &&
        equal(out.dependencySha256, dependencies) &&
        out.financialActions === false &&
        out.qualificationAuthority === false,
      'result-binding'
    );
    check(equal(out.candidateOutcomes, request.outcomes), 'all-original-outcomes');
    const incomplete = request.p.status === 'incomplete';
    check(
      out.status === (incomplete ? 'incomplete' : 'evaluated') && out.policyCalled === !incomplete,
      'result-status'
    );
    let decision: AccumulationAdmissionMathDecision | null = null;
    if (incomplete) check(out.decision === null, 'incomplete-decision');
    else decision = mathDecision(out.decision, request);
    const selected = decision?.action === 'buy' ? request.outcomes[decision.selected_input_kusd! - 1] : null;
    const result: ValidatedAccumulationAdmissionResult = freeze({
      kind: 'validated-accumulation-admission-result-v1',
      status: incomplete ? 'incomplete' : 'evaluated',
      inputSha256: inputSha,
      outputSha256: digest(outputBytes),
      receiptSha256: digest(canonical(r)),
      modelSha256: MODEL_SHA,
      decision,
      candidateOutcomes: request.outcomes,
      selectedCandidate: selected,
      actualClocks: { started, spawned, finished, elapsedNs: r.elapsedNs },
      request: request.request as unknown as ValidatedAccumulationAdmissionResult['request'],
      result: out,
      retainedReceipt: r,
      trustedBindings: t,
      receiptProvenance: 'trusted-parent-receipt-required',
      forecastRecomputed: false,
      postComputationFreshnessVerified: false,
      journalStillCurrentVerified: false,
      qualificationAuthority: false,
      orderAuthority: false,
      financialActions: false,
    });
    owned.add(result);
    return result;
  } catch (error) {
    if (error instanceof AccumulationAdmissionResultError) throw error;
    throw new AccumulationAdmissionResultError('invalid-bounded-admission-result');
  }
}
