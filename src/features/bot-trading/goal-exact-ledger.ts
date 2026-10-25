/** Persisted exact KUSD/XOR accounting. This reducer grants no wallet authority and performs no I/O. */
import { u8aToHex } from '@polkadot/util';
import { sha256AsU8a } from '@polkadot/util-crypto';

export const GOAL_EXACT_KUSD = '0x02000c0000000000000000000000000000000000000000000000000000000000';
export const GOAL_EXACT_XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';
const UNIT = 10n ** 18n;
const U128 = (1n << 128n) - 1n;
export const GOAL_EXACT_POLICY = Object.freeze({
  id: 'kusd-xor-exact-goal-v1',
  genesisHash: '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5',
  maximumInitialKusdCodec: String(10n * UNIT),
  initialFeeReserveCodec: String(UNIT),
  targetPercent: '5',
  maximumDrawdownPercent: '5',
  durationMs: 86_400_000,
  maximumMarkAgeMs: 60_000,
  maximumSettlements: 4096,
} as const);
export interface GoalExactRatio {
  readonly numerator: string;
  readonly denominator: string;
}
export interface GoalExactMark {
  readonly blockHash: string;
  readonly blockNumber: number;
  readonly timestampMs: number;
  readonly denominator: string;
  readonly kusdReserveCodec: string;
  readonly xorReserveCodec: string;
}
export interface GoalExactFill {
  readonly inputAsset: string;
  readonly inputCodec: string;
  readonly outputAsset: string;
  readonly minimumOutputCodec: string;
  readonly feeCeilingCodec: string;
}
export interface GoalExactCreate {
  readonly goalId: string;
  readonly startedAtMs: number;
  readonly initialKusdCodec: string;
  readonly maxTradeKusdCodec: string;
  readonly maxTradeXorCodec: string;
}
export interface GoalExactObservation {
  readonly expectedRevision: number;
  readonly accountingAtMs: number;
  readonly mark: GoalExactMark;
}
export interface GoalExactReceipt {
  readonly blockHash: string;
  readonly blockNumber: number;
  readonly extrinsicHash: string;
  readonly extrinsicIndex: number;
}
export interface GoalExactSettlement extends GoalExactObservation {
  readonly orderId: string;
  readonly receipt: GoalExactReceipt;
  readonly fill: GoalExactFill;
  readonly success: boolean;
  readonly actualOutputCodec: string;
  readonly actualFeeCodec: string;
}
export type GoalExactAttention =
  | 'fee-ceiling-exceeded'
  | 'fee-budget-exceeded'
  | 'minimum-output-breached'
  | 'trade-limit-exceeded'
  | 'allocation-deficit'
  | 'fee-reserve-used'
  | 'late-settlement';
export interface GoalExactAppliedSettlement {
  readonly orderId: string;
  readonly eventId: string;
  readonly digest: string;
  readonly revision: number;
  readonly receipt: GoalExactReceipt;
  readonly fill: GoalExactFill;
  readonly success: boolean;
  readonly actualOutputCodec: string;
  readonly actualFeeCodec: string;
}
interface Balances {
  readonly kusdCodec: string;
  readonly xorCodec: string;
}
export interface GoalExactLedgerState {
  readonly version: 1;
  readonly kind: 'goal-exact-ledger';
  readonly goalId: string;
  readonly policy: typeof GOAL_EXACT_POLICY;
  readonly episode: Readonly<{ startedAtMs: number; endedAtMs: number }>;
  readonly initial: Balances;
  readonly limits: Balances;
  readonly holdings: Balances;
  readonly deficit: Balances;
  readonly feesPaidCodec: string;
  readonly trades: number;
  readonly failures: number;
  readonly openingMark: GoalExactMark;
  readonly lastMark: GoalExactMark;
  readonly accountingAtMs: number;
  readonly openingValue: GoalExactRatio;
  readonly latestValue: GoalExactRatio;
  readonly goalPeakValue: GoalExactRatio;
  readonly performancePeakValue: GoalExactRatio;
  readonly maximumDrawdownRatio: GoalExactRatio;
  readonly outcome: 'active' | 'target' | 'loss' | 'expired';
  readonly stoppedAtMs: number | null;
  readonly attention: readonly GoalExactAttention[];
  readonly settlements: readonly GoalExactAppliedSettlement[];
  readonly revision: number;
  readonly previousStateSha256: string | null;
  readonly stateSha256: string;
}
export type GoalExactRejection =
  | 'goal-complete'
  | 'attention'
  | 'trade-limit'
  | 'balance'
  | 'fee-budget'
  | 'goal-trade-cost'
  | 'receipt-capacity';
export interface GoalExactAssessment {
  readonly state: GoalExactLedgerState;
  readonly rejection?: GoalExactRejection;
  readonly minimumSuccessValue?: GoalExactRatio;
  readonly feeOnlyFailureValue?: GoalExactRatio;
}
const failure = (): never => {
  throw new Error('Invalid exact goal ledger data');
};
const requireValue = (condition: unknown) => {
  if (!condition) failure();
};
const HASH = /^0x[0-9a-f]{64}$/;
const SHA = /^[0-9a-f]{64}$/;
const ATTENTION: readonly GoalExactAttention[] = [
  'fee-ceiling-exceeded',
  'fee-budget-exceeded',
  'minimum-output-breached',
  'trade-limit-exceeded',
  'allocation-deficit',
  'fee-reserve-used',
  'late-settlement',
];

/** Own-data snapshot; only restore requests postorder freezing of newly created containers. */
function copy<T>(input: T, freezeCopied = false): T {
  let nodes = 0;
  let characters = 0;
  const visit = (value: unknown, depth: number): unknown => {
    if (++nodes > 150_000 || depth > 16) return failure();
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isSafeInteger(value) ? value : failure();
    if (typeof value === 'string') {
      characters += value.length;
      return value.length <= 512 && characters <= 5_000_000 ? value : failure();
    }
    if (!value || typeof value !== 'object') return failure();
    const { descriptors, keys } = ownDataProjection(value);
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype || value.length > 4096 || keys.length !== value.length + 1)
        return failure();
      const output = Array.from({ length: value.length }, (_, i) => {
        const field = descriptors[String(i)];
        if (!field || !('value' in field) || !field.enumerable) return failure();
        return visit(field.value, depth + 1);
      });
      if (freezeCopied) {
        Object.freeze(output);
        frozenData.add(output);
        retainOwnDataProjection(output, descriptors, keys, true);
        // The fully checked detached copy has identical canonical bytes to this private immutable source.
        const cached = frozenData.has(value) ? canonicalData.get(value) : undefined;
        if (cached !== undefined) canonicalData.set(output, cached);
      }
      return output;
    }
    if (![Object.prototype, null].includes(Object.getPrototypeOf(value)) || keys.length > 40) return failure();
    const output = Object.fromEntries(
      keys.map((key) => {
        if (
          typeof key !== 'string' ||
          key.length > 128 ||
          !('value' in descriptors[key]) ||
          !descriptors[key].enumerable
        )
          return failure();
        return [key, visit(descriptors[key].value, depth + 1)];
      })
    );
    if (freezeCopied) {
      Object.freeze(output);
      frozenData.add(output);
      retainOwnDataProjection(output, descriptors, keys, true);
      // Reuse serialization only after this fresh own-data record and all descendants were checked/frozen.
      const cached = frozenData.has(value) ? canonicalData.get(value) : undefined;
      if (cached !== undefined) canonicalData.set(output, cached);
    }
    return output;
  };
  return visit(input, 0) as T;
}
function fields(value: unknown, keys: readonly string[]): void {
  requireValue(value && typeof value === 'object' && !Array.isArray(value));
  const actual = Object.keys(value as object);
  requireValue(actual.length === keys.length && keys.every((key) => actual.includes(key)));
}
// Only this module's recursively frozen own-data objects may reuse serialization work.
const frozenData = new WeakSet<object>();
const canonicalData = new WeakMap<object, string>();
type OwnDataProjection = {
  readonly descriptors: Readonly<PropertyDescriptorMap>;
  readonly keys: readonly (string | symbol)[];
};
const projectionData = new WeakMap<object, OwnDataProjection>();

/** Retain stable fields after private admission; fresh-copy mode reads only its already allocated children. */
function retainOwnDataProjection(
  value: object,
  descriptors: PropertyDescriptorMap,
  keys: readonly (string | symbol)[],
  readFreshOutput = false
): OwnDataProjection {
  requireValue(frozenData.has(value));
  const fields: PropertyDescriptorMap = Object.create(null);
  // Raw array proxies may vary length before construction; only the actual fresh output defines its shape.
  const retainedKeys = readFreshOutput ? Reflect.ownKeys(value) : keys;
  for (const key of retainedKeys) {
    requireValue(typeof key === 'string');
    const field = descriptors[key as string];
    requireValue('value' in field);
    fields[key as string] = Object.freeze({
      value: readFreshOutput ? (value as Record<string, unknown>)[key as string] : field.value,
      enumerable: field.enumerable,
    });
  }
  const projection = Object.freeze({ descriptors: Object.freeze(fields), keys: Object.freeze([...retainedKeys]) });
  projectionData.set(value, projection);
  return projection;
}

/** Raw/external identities always reflect again; a private hit still visits every bounded copied value. */
function ownDataProjection(value: object): OwnDataProjection {
  const owned = frozenData.has(value);
  const cached = owned ? projectionData.get(value) : undefined;
  if (cached !== undefined) return cached;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  return owned ? retainOwnDataProjection(value, descriptors, keys) : { descriptors, keys };
}

/** Freeze detached plain own-data descendants before privately admitting their exact identity. */
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !frozenData.has(value)) {
    const array = Array.isArray(value);
    requireValue(
      array
        ? Object.getPrototypeOf(value) === Array.prototype
        : [Object.prototype, null].includes(Object.getPrototypeOf(value))
    );
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (array) requireValue(keys.length === value.length + 1);
    for (const key of keys) {
      requireValue(typeof key === 'string');
      if (array && key !== 'length') requireValue(/^(?:0|[1-9]\d*)$/.test(key as string) && Number(key) < value.length);
      const field = descriptors[key as string];
      requireValue('value' in field && (field.enumerable || (array && key === 'length')));
      freeze(field.value);
    }
    Object.freeze(value);
    frozenData.add(value);
    // Freezing preserves validated key order, own-data values and enumerability; no mutable flags are retained.
    retainOwnDataProjection(value, descriptors, keys);
  }
  return value;
}

/** Cache bytes only for privately owned immutable identities; every raw restore is still copied and verified. */
function canonical(value: unknown): string {
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  const owned = frozenData.has(value);
  const cached = owned ? canonicalData.get(value) : undefined;
  if (cached !== undefined) return cached;
  const result = Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
        .join(',')}}`;
  if (owned) canonicalData.set(value, result);
  return result;
}
const digest = (value: unknown) => u8aToHex(sha256AsU8a(new TextEncoder().encode(canonical(value)), true)).slice(2);
function integer(value: unknown, max = Number.MAX_SAFE_INTEGER): number {
  requireValue(Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= max);
  return value as number;
}
function amount(value: unknown, positive = false): bigint {
  requireValue(typeof value === 'string' && /^(?:0|[1-9]\d{0,38})$/.test(value as string));
  const n = BigInt(value as string);
  requireValue(n <= U128 && (!positive || n > 0n));
  return n;
}
function total(value: unknown): bigint {
  requireValue(typeof value === 'string' && /^(?:0|[1-9]\d{0,43})$/.test(value as string));
  return BigInt(value as string);
}
function identifier(value: unknown): void {
  requireValue(typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(value));
}
function ratio(n: bigint, d: bigint): GoalExactRatio {
  requireValue(d > 0n);
  let a = n < 0n ? -n : n;
  let b = d;
  while (b) [a, b] = [b, a % b];
  return { numerator: String(n / a), denominator: String(d / a) };
}
function compare(a: GoalExactRatio, b: GoalExactRatio): bigint {
  return BigInt(a.numerator) * BigInt(b.denominator) - BigInt(b.numerator) * BigInt(a.denominator);
}
function validateRatio(value: GoalExactRatio, nonnegative = false): void {
  fields(value, ['numerator', 'denominator']);
  requireValue(typeof value.numerator === 'string' && /^(?:0|-?[1-9]\d{0,191})$/.test(value.numerator));
  requireValue(typeof value.denominator === 'string' && /^[1-9]\d{0,191}$/.test(value.denominator));
  requireValue(!nonnegative || BigInt(value.numerator) >= 0n);
  requireValue(canonical(value) === canonical(ratio(BigInt(value.numerator), BigInt(value.denominator))));
}
function drawdown(peak: GoalExactRatio, current: GoalExactRatio): GoalExactRatio {
  const difference = compare(peak, current);
  return difference <= 0n ? ratio(0n, 1n) : ratio(difference, BigInt(peak.numerator) * BigInt(current.denominator));
}
function lossReached(peak: GoalExactRatio, current: GoalExactRatio): boolean {
  const dd = drawdown(peak, current);
  return BigInt(dd.numerator) * 100n >= BigInt(dd.denominator) * 5n;
}
function markCopy(input: GoalExactMark): GoalExactMark {
  const mark = copy(input);
  fields(mark, ['blockHash', 'blockNumber', 'timestampMs', 'denominator', 'kusdReserveCodec', 'xorReserveCodec']);
  requireValue(typeof mark.blockHash === 'string' && HASH.test(mark.blockHash));
  requireValue(integer(mark.blockNumber, 0xffffffff) > 0);
  integer(mark.timestampMs);
  amount(mark.denominator, true);
  amount(mark.kusdReserveCodec, true);
  amount(mark.xorReserveCodec, true);
  return mark;
}
function markAt(mark: GoalExactMark, accountingAtMs: number): void {
  integer(accountingAtMs);
  requireValue(
    mark.timestampMs <= accountingAtMs && accountingAtMs - mark.timestampMs <= GOAL_EXACT_POLICY.maximumMarkAgeMs
  );
}
function nextMark(previous: GoalExactMark, next: GoalExactMark): void {
  requireValue(
    next.denominator === previous.denominator &&
      next.blockNumber >= previous.blockNumber &&
      next.timestampMs >= previous.timestampMs
  );
  if (next.blockNumber === previous.blockNumber) requireValue(canonical(next) === canonical(previous));
  else requireValue(next.blockHash !== previous.blockHash);
}
/** Reject contradictions among already supplied block identities; this is not an ancestry proof. */
function knownBlocks(blocks: readonly { blockNumber: number; blockHash: string }[]): void {
  const heights = new Map<number, string>();
  const hashes = new Map<string, number>();
  for (const block of blocks) {
    requireValue(block.blockHash !== GOAL_EXACT_POLICY.genesisHash);
    requireValue(!heights.has(block.blockNumber) || heights.get(block.blockNumber) === block.blockHash);
    requireValue(!hashes.has(block.blockHash) || hashes.get(block.blockHash) === block.blockNumber);
    heights.set(block.blockNumber, block.blockHash);
    hashes.set(block.blockHash, block.blockNumber);
  }
}
function net(holdings: Balances, deficit: Balances): { kusd: bigint; xor: bigint } {
  return {
    kusd: total(holdings.kusdCodec) - total(deficit.kusdCodec),
    xor: total(holdings.xorCodec) - total(deficit.xorCodec),
  };
}
function balances(kusd: bigint, xor: bigint): { holdings: Balances; deficit: Balances } {
  return {
    holdings: { kusdCodec: String(kusd > 0n ? kusd : 0n), xorCodec: String(xor > 0n ? xor : 0n) },
    deficit: { kusdCodec: String(kusd < 0n ? -kusd : 0n), xorCodec: String(xor < 0n ? -xor : 0n) },
  };
}
function valueAt(holdings: Balances, deficit: Balances, mark: GoalExactMark): GoalExactRatio {
  const held = net(holdings, deficit);
  const rk = amount(mark.kusdReserveCodec, true);
  return ratio(held.kusd * amount(mark.xorReserveCodec, true) + held.xor * rk, rk);
}
function fillCopy(input: GoalExactFill): GoalExactFill {
  const fill = copy(input);
  fields(fill, ['inputAsset', 'inputCodec', 'outputAsset', 'minimumOutputCodec', 'feeCeilingCodec']);
  requireValue(
    (fill.inputAsset === GOAL_EXACT_KUSD && fill.outputAsset === GOAL_EXACT_XOR) ||
      (fill.inputAsset === GOAL_EXACT_XOR && fill.outputAsset === GOAL_EXACT_KUSD)
  );
  amount(fill.inputCodec, true);
  amount(fill.minimumOutputCodec, true);
  amount(fill.feeCeilingCodec, true);
  return fill;
}
function receiptCopy(input: GoalExactReceipt): GoalExactReceipt {
  const receipt = copy(input);
  fields(receipt, ['blockHash', 'blockNumber', 'extrinsicHash', 'extrinsicIndex']);
  requireValue(
    typeof receipt.blockHash === 'string' &&
      HASH.test(receipt.blockHash) &&
      typeof receipt.extrinsicHash === 'string' &&
      HASH.test(receipt.extrinsicHash)
  );
  requireValue(integer(receipt.blockNumber, 0xffffffff) > 0);
  integer(receipt.extrinsicIndex, 0xffffffff);
  return receipt;
}
function receiptContent(entry: Omit<GoalExactAppliedSettlement, 'digest' | 'revision' | 'eventId'>) {
  return {
    orderId: entry.orderId,
    receipt: entry.receipt,
    fill: entry.fill,
    success: entry.success,
    actualOutputCodec: entry.actualOutputCodec,
    actualFeeCodec: entry.actualFeeCodec,
  };
}
function applyNet(
  held: { kusd: bigint; xor: bigint },
  fill: GoalExactFill,
  success: boolean,
  output: bigint,
  fee: bigint
) {
  let { kusd, xor } = held;
  if (success) {
    if (fill.inputAsset === GOAL_EXACT_KUSD) {
      kusd -= amount(fill.inputCodec);
      xor += output;
    } else {
      xor -= amount(fill.inputCodec);
      kusd += output;
    }
  }
  xor -= fee;
  return { kusd, xor };
}
function attentionFor(
  state: Pick<GoalExactLedgerState, 'initial' | 'limits' | 'feesPaidCodec'>,
  fill: GoalExactFill,
  success: boolean,
  output: bigint,
  fee: bigint,
  held: { kusd: bigint; xor: bigint }
): GoalExactAttention[] {
  const notes: GoalExactAttention[] = [];
  if (fee > amount(fill.feeCeilingCodec)) notes.push('fee-ceiling-exceeded');
  if (total(state.feesPaidCodec) + fee > UNIT) notes.push('fee-budget-exceeded');
  if (success && output < amount(fill.minimumOutputCodec)) notes.push('minimum-output-breached');
  const limit = fill.inputAsset === GOAL_EXACT_KUSD ? state.limits.kusdCodec : state.limits.xorCodec;
  if (
    amount(fill.inputCodec) > amount(limit) ||
    (fill.inputAsset === GOAL_EXACT_KUSD && amount(fill.inputCodec) >= amount(state.initial.kusdCodec))
  )
    notes.push('trade-limit-exceeded');
  if (held.kusd < 0n || held.xor < 0n) notes.push('allocation-deficit');
  const remaining = UNIT - total(state.feesPaidCodec) - fee;
  if (held.xor < (remaining > 0n ? remaining : 0n)) notes.push('fee-reserve-used');
  return notes;
}
function seal(input: Omit<GoalExactLedgerState, 'stateSha256'>): GoalExactLedgerState {
  return freeze({ ...input, stateSha256: digest(input) });
}

/** Validate a persisted snapshot's structure, checksum and reconstructed settlement accounting. Not authentication. */
export function restoreGoalExactLedger(raw: unknown): GoalExactLedgerState {
  // The checked copy freezes only its fresh output containers; all restore validation still follows.
  const s = copy(raw, true) as GoalExactLedgerState;
  fields(s, [
    'version',
    'kind',
    'goalId',
    'policy',
    'episode',
    'initial',
    'limits',
    'holdings',
    'deficit',
    'feesPaidCodec',
    'trades',
    'failures',
    'openingMark',
    'lastMark',
    'accountingAtMs',
    'openingValue',
    'latestValue',
    'goalPeakValue',
    'performancePeakValue',
    'maximumDrawdownRatio',
    'outcome',
    'stoppedAtMs',
    'attention',
    'settlements',
    'revision',
    'previousStateSha256',
    'stateSha256',
  ]);
  requireValue(s.version === 1 && s.kind === 'goal-exact-ledger');
  identifier(s.goalId);
  requireValue(canonical(s.policy) === canonical(GOAL_EXACT_POLICY));
  fields(s.episode, ['startedAtMs', 'endedAtMs']);
  integer(s.episode.startedAtMs);
  integer(s.episode.endedAtMs);
  requireValue(s.episode.endedAtMs - s.episode.startedAtMs === GOAL_EXACT_POLICY.durationMs);
  for (const balance of [s.initial, s.limits, s.holdings, s.deficit]) fields(balance, ['kusdCodec', 'xorCodec']);
  requireValue(amount(s.initial.kusdCodec, true) <= 10n * UNIT && s.initial.xorCodec === String(UNIT));
  requireValue(amount(s.limits.kusdCodec, true) < amount(s.initial.kusdCodec));
  amount(s.limits.xorCodec);
  for (const key of ['kusdCodec', 'xorCodec'] as const)
    requireValue(total(s.holdings[key]) === 0n || total(s.deficit[key]) === 0n);
  const opening = markCopy(s.openingMark);
  const latest = markCopy(s.lastMark);
  markAt(opening, s.episode.startedAtMs);
  markAt(latest, s.accountingAtMs);
  nextMark(opening, latest);
  requireValue(s.accountingAtMs >= s.episode.startedAtMs);
  integer(s.revision);
  requireValue(
    s.revision === 0
      ? s.previousStateSha256 === null
      : typeof s.previousStateSha256 === 'string' && SHA.test(s.previousStateSha256)
  );
  requireValue(SHA.test(s.stateSha256));
  const { stateSha256, ...body } = s;
  requireValue(stateSha256 === digest(body));
  for (const value of [s.openingValue, s.latestValue, s.goalPeakValue, s.performancePeakValue]) validateRatio(value);
  validateRatio(s.maximumDrawdownRatio, true);
  requireValue(compare(s.openingValue, valueAt(s.initial, { kusdCodec: '0', xorCodec: '0' }, opening)) === 0n);
  requireValue(compare(s.latestValue, valueAt(s.holdings, s.deficit, latest)) === 0n);
  requireValue(
    compare(s.goalPeakValue, s.openingValue) >= 0 &&
      compare(s.performancePeakValue, s.goalPeakValue) >= 0 &&
      compare(s.performancePeakValue, s.latestValue) >= 0
  );
  requireValue(compare(s.maximumDrawdownRatio, drawdown(s.performancePeakValue, s.latestValue)) >= 0);
  requireValue(['active', 'target', 'loss', 'expired'].includes(s.outcome));
  if (s.outcome === 'active')
    requireValue(
      s.stoppedAtMs === null &&
        s.accountingAtMs < s.episode.endedAtMs &&
        !lossReached(s.goalPeakValue, s.latestValue) &&
        compare(s.latestValue, s.openingValue) * 100n <
          BigInt(s.openingValue.numerator) * BigInt(s.latestValue.denominator) * 5n &&
        compare(s.goalPeakValue, s.performancePeakValue) === 0n &&
        BigInt(s.maximumDrawdownRatio.numerator) * 100n < BigInt(s.maximumDrawdownRatio.denominator) * 5n
    );
  else {
    integer(s.stoppedAtMs);
    requireValue(s.stoppedAtMs! >= s.episode.startedAtMs && s.stoppedAtMs! <= s.accountingAtMs);
    if (s.outcome === 'expired') requireValue(s.stoppedAtMs === s.episode.endedAtMs);
    else requireValue(s.stoppedAtMs! < s.episode.endedAtMs);
  }
  requireValue(
    Array.isArray(s.attention) &&
      new Set(s.attention).size === s.attention.length &&
      s.attention.every((n) => ATTENTION.includes(n)) &&
      canonical(s.attention) === canonical(ATTENTION.filter((n) => s.attention.includes(n)))
  );
  requireValue(Array.isArray(s.settlements) && s.settlements.length <= GOAL_EXACT_POLICY.maximumSettlements);
  const orders = new Set<string>();
  const events = new Set<string>();
  const txs = new Set<string>();
  let held = { kusd: amount(s.initial.kusdCodec), xor: UNIT };
  let fees = 0n;
  let trades = 0;
  let failures = 0;
  let revision = 0;
  const mandatory = new Set<GoalExactAttention>();
  for (const entry of s.settlements) {
    fields(entry, [
      'orderId',
      'eventId',
      'digest',
      'revision',
      'receipt',
      'fill',
      'success',
      'actualOutputCodec',
      'actualFeeCodec',
    ]);
    identifier(entry.orderId);
    const receipt = receiptCopy(entry.receipt);
    requireValue(receipt.blockNumber >= opening.blockNumber);
    const fill = fillCopy(entry.fill);
    requireValue(
      entry.eventId === `${receipt.blockHash}:${receipt.extrinsicIndex}` &&
        !orders.has(entry.orderId) &&
        !events.has(entry.eventId) &&
        !txs.has(receipt.extrinsicHash)
    );
    requireValue(integer(entry.revision) > revision && entry.revision <= s.revision);
    revision = entry.revision;
    requireValue(typeof entry.success === 'boolean');
    const output = amount(entry.actualOutputCodec);
    const fee = amount(entry.actualFeeCodec);
    requireValue(entry.success || output === 0n);
    requireValue(entry.digest === digest(receiptContent(entry)));
    held = applyNet(held, fill, entry.success, output, fee);
    attentionFor({ ...s, feesPaidCodec: String(fees) }, fill, entry.success, output, fee, held).forEach((n) =>
      mandatory.add(n)
    );
    fees += fee;
    if (entry.success) trades++;
    else failures++;
    requireValue(
      receipt.blockNumber <= latest.blockNumber &&
        (receipt.blockNumber !== latest.blockNumber || receipt.blockHash === latest.blockHash)
    );
    orders.add(entry.orderId);
    events.add(entry.eventId);
    txs.add(receipt.extrinsicHash);
  }
  knownBlocks([opening, latest, ...s.settlements.map((entry) => entry.receipt)]);
  const reconstructed = balances(held.kusd, held.xor);
  requireValue(
    canonical(reconstructed.holdings) === canonical(s.holdings) &&
      canonical(reconstructed.deficit) === canonical(s.deficit)
  );
  requireValue(
    total(s.feesPaidCodec) === fees &&
      s.trades === trades &&
      s.failures === failures &&
      [...mandatory].every((n) => s.attention.includes(n))
  );
  if (s.revision === 0)
    requireValue(
      s.settlements.length === 0 &&
        canonical(opening) === canonical(latest) &&
        s.accountingAtMs === s.episode.startedAtMs &&
        s.outcome === 'active' &&
        s.attention.length === 0 &&
        compare(s.openingValue, s.goalPeakValue) === 0n &&
        compare(s.openingValue, s.performancePeakValue) === 0n &&
        s.maximumDrawdownRatio.numerator === '0'
    );
  return freeze(s);
}

/** Explicit funding-time baseline from a finalized observation no more than 60 seconds old. */
export function createGoalExactLedger(input: GoalExactCreate, inputMark: GoalExactMark): GoalExactLedgerState {
  const c = copy(input);
  fields(c, ['goalId', 'startedAtMs', 'initialKusdCodec', 'maxTradeKusdCodec', 'maxTradeXorCodec']);
  identifier(c.goalId);
  integer(c.startedAtMs);
  requireValue(
    amount(c.initialKusdCodec, true) <= 10n * UNIT && amount(c.maxTradeKusdCodec, true) < amount(c.initialKusdCodec)
  );
  amount(c.maxTradeXorCodec);
  const endedAtMs = c.startedAtMs + GOAL_EXACT_POLICY.durationMs;
  integer(endedAtMs);
  const openingMark = markCopy(inputMark);
  knownBlocks([openingMark]);
  markAt(openingMark, c.startedAtMs);
  const initial = { kusdCodec: c.initialKusdCodec, xorCodec: String(UNIT) };
  const zero = { kusdCodec: '0', xorCodec: '0' };
  const openingValue = valueAt(initial, zero, openingMark);
  return seal({
    version: 1,
    kind: 'goal-exact-ledger',
    goalId: c.goalId,
    policy: GOAL_EXACT_POLICY,
    episode: { startedAtMs: c.startedAtMs, endedAtMs },
    initial,
    limits: { kusdCodec: c.maxTradeKusdCodec, xorCodec: c.maxTradeXorCodec },
    holdings: initial,
    deficit: zero,
    feesPaidCodec: '0',
    trades: 0,
    failures: 0,
    openingMark,
    lastMark: openingMark,
    accountingAtMs: c.startedAtMs,
    openingValue,
    latestValue: openingValue,
    goalPeakValue: openingValue,
    performancePeakValue: openingValue,
    maximumDrawdownRatio: ratio(0n, 1n),
    outcome: 'active',
    stoppedAtMs: null,
    attention: [],
    settlements: [],
    revision: 0,
    previousStateSha256: null,
  });
}
function observed(
  state: GoalExactLedgerState,
  mark: GoalExactMark,
  accountingAtMs: number
): Omit<GoalExactLedgerState, 'stateSha256'> {
  requireValue(state.revision < Number.MAX_SAFE_INTEGER);
  nextMark(state.lastMark, mark);
  knownBlocks([state.openingMark, state.lastMark, mark, ...state.settlements.map((entry) => entry.receipt)]);
  markAt(mark, accountingAtMs);
  requireValue(accountingAtMs >= state.accountingAtMs);
  const latestValue = valueAt(state.holdings, state.deficit, mark);
  const performancePeakValue =
    compare(latestValue, state.performancePeakValue) > 0n ? latestValue : state.performancePeakValue;
  const loss = drawdown(performancePeakValue, latestValue);
  const maximumDrawdownRatio = compare(loss, state.maximumDrawdownRatio) > 0n ? loss : state.maximumDrawdownRatio;
  const beforeDeadline = accountingAtMs < state.episode.endedAtMs;
  const goalPeakValue =
    state.outcome === 'active' && beforeDeadline && compare(latestValue, state.goalPeakValue) > 0n
      ? latestValue
      : state.goalPeakValue;
  let outcome = state.outcome;
  let stoppedAtMs = state.stoppedAtMs;
  if (outcome === 'active') {
    if (!beforeDeadline) {
      outcome = 'expired';
      stoppedAtMs = state.episode.endedAtMs;
    } else if (
      compare(latestValue, state.openingValue) * 100n >=
      BigInt(state.openingValue.numerator) * BigInt(latestValue.denominator) * 5n
    ) {
      outcome = 'target';
      stoppedAtMs = accountingAtMs;
    } else if (lossReached(goalPeakValue, latestValue)) {
      outcome = 'loss';
      stoppedAtMs = accountingAtMs;
    }
  }
  const { stateSha256, ...body } = state;
  return {
    ...body,
    lastMark: mark,
    accountingAtMs,
    latestValue,
    performancePeakValue,
    maximumDrawdownRatio,
    goalPeakValue,
    outcome,
    stoppedAtMs,
    revision: state.revision + 1,
    previousStateSha256: stateSha256,
  };
}
/** Mark current net holdings; stopped outcomes remain latched while performance continues honestly. */
export function markGoalExactLedger(
  raw: GoalExactLedgerState,
  observation: GoalExactObservation
): GoalExactLedgerState {
  const state = restoreGoalExactLedger(raw);
  const o = copy(observation);
  fields(o, ['expectedRevision', 'accountingAtMs', 'mark']);
  requireValue(o.expectedRevision === state.revision);
  const mark = markCopy(o.mark);
  if (o.accountingAtMs === state.accountingAtMs && canonical(mark) === canonical(state.lastMark)) return state;
  return seal(observed(state, mark, o.accountingAtMs));
}
/** Both minimum-success and fee-only-failure must remain strictly inside the 5% peak-loss bound. */
export function assessGoalExactFill(
  raw: GoalExactLedgerState,
  input: GoalExactObservation & { fill: GoalExactFill }
): GoalExactAssessment {
  const request = copy(input);
  fields(request, ['expectedRevision', 'accountingAtMs', 'mark', 'fill']);
  const fill = fillCopy(request.fill);
  const state = markGoalExactLedger(raw, {
    expectedRevision: request.expectedRevision,
    accountingAtMs: request.accountingAtMs,
    mark: request.mark,
  });
  const reject = (rejection: GoalExactRejection) => freeze({ state, rejection });
  if (state.outcome !== 'active') return reject('goal-complete');
  if (state.attention.length) return reject('attention');
  if (state.settlements.length >= GOAL_EXACT_POLICY.maximumSettlements) return reject('receipt-capacity');
  const inputAmount = amount(fill.inputCodec);
  const fee = amount(fill.feeCeilingCodec);
  const limit = amount(fill.inputAsset === GOAL_EXACT_KUSD ? state.limits.kusdCodec : state.limits.xorCodec);
  if (inputAmount > limit || (fill.inputAsset === GOAL_EXACT_KUSD && inputAmount >= amount(state.initial.kusdCodec)))
    return reject('trade-limit');
  const paid = total(state.feesPaidCodec);
  if (paid + fee > UNIT) return reject('fee-budget');
  const held = net(state.holdings, state.deficit);
  const reserve = UNIT - paid;
  if (held.xor < reserve || inputAmount > (fill.inputAsset === GOAL_EXACT_KUSD ? held.kusd : held.xor - reserve))
    return reject('balance');
  const success = applyNet(held, fill, true, amount(fill.minimumOutputCodec), fee);
  const failure = applyNet(held, fill, false, 0n, fee);
  const successBalances = balances(success.kusd, success.xor);
  const failureBalances = balances(failure.kusd, failure.xor);
  const minimumSuccessValue = valueAt(successBalances.holdings, successBalances.deficit, state.lastMark);
  const feeOnlyFailureValue = valueAt(failureBalances.holdings, failureBalances.deficit, state.lastMark);
  return freeze({
    state,
    minimumSuccessValue,
    feeOnlyFailureValue,
    ...(lossReached(state.goalPeakValue, minimumSuccessValue) || lossReached(state.goalPeakValue, feeOnlyFailureValue)
      ? { rejection: 'goal-trade-cost' as const }
      : {}),
  });
}
/**
 * Apply an already-realized finalized receipt, even after stop or above a prior estimate. Canonical
 * receipt authority and atomic goalId/revision/hash compare-and-save remain the storage caller's duty.
 * Exact duplicates return current state; conflicting order/event/transaction identities reject.
 */
export function settleGoalExactLedger(
  raw: GoalExactLedgerState,
  input: GoalExactSettlement
): { readonly state: GoalExactLedgerState; readonly duplicate: boolean } {
  const state = restoreGoalExactLedger(raw);
  const r = copy(input);
  fields(r, [
    'expectedRevision',
    'accountingAtMs',
    'mark',
    'orderId',
    'receipt',
    'fill',
    'success',
    'actualOutputCodec',
    'actualFeeCodec',
  ]);
  identifier(r.orderId);
  integer(r.expectedRevision);
  integer(r.accountingAtMs);
  const mark = markCopy(r.mark);
  const receipt = receiptCopy(r.receipt);
  requireValue(receipt.blockNumber >= state.openingMark.blockNumber);
  const fill = fillCopy(r.fill);
  requireValue(typeof r.success === 'boolean');
  const output = amount(r.actualOutputCodec);
  const fee = amount(r.actualFeeCodec);
  requireValue(r.success || output === 0n);
  const content = receiptContent({ ...r, receipt, fill });
  const eventId = `${receipt.blockHash}:${receipt.extrinsicIndex}`;
  const receiptDigest = digest(content);
  const prior = state.settlements.find(
    (e) => e.orderId === r.orderId || e.eventId === eventId || e.receipt.extrinsicHash === receipt.extrinsicHash
  );
  if (prior) {
    requireValue(prior.digest === receiptDigest && prior.eventId === eventId);
    return freeze({ state, duplicate: true });
  }
  requireValue(
    r.expectedRevision === state.revision && state.settlements.length < GOAL_EXACT_POLICY.maximumSettlements
  );
  requireValue(
    receipt.blockNumber <= mark.blockNumber &&
      (receipt.blockNumber !== mark.blockNumber || receipt.blockHash === mark.blockHash)
  );
  knownBlocks([state.openingMark, state.lastMark, mark, receipt, ...state.settlements.map((entry) => entry.receipt)]);
  const held = applyNet(net(state.holdings, state.deficit), fill, r.success, output, fee);
  const notes = attentionFor(state, fill, r.success, output, fee, held);
  if (receipt.blockNumber < state.lastMark.blockNumber) notes.push('late-settlement');
  const updated = {
    ...state,
    ...balances(held.kusd, held.xor),
    feesPaidCodec: String(total(state.feesPaidCodec) + fee),
    trades: state.trades + (r.success ? 1 : 0),
    failures: state.failures + (r.success ? 0 : 1),
    attention: ATTENTION.filter((n) => state.attention.includes(n) || notes.includes(n)),
  };
  const next = observed(updated, mark, r.accountingAtMs);
  const entry: GoalExactAppliedSettlement = { ...content, eventId, digest: receiptDigest, revision: next.revision };
  return freeze({
    state: seal({ ...next, previousStateSha256: state.stateSha256, settlements: [...state.settlements, entry] }),
    duplicate: false,
  });
}

/** Already-realized receipt effects for one atomic original-deadline observation. */
export type GoalExactTerminalReceipt = Pick<
  GoalExactSettlement,
  'orderId' | 'receipt' | 'fill' | 'success' | 'actualOutputCodec' | 'actualFeeCodec'
>;
/** Persisted terminal identity. The caller must bind evidenceSha256 to owned canonical deadline evidence. */
export interface GoalExactPostDeadlineBoundary {
  readonly goalId: string;
  readonly ledgerStateSha256: string;
  readonly evidenceSha256: string;
  readonly blockHash: string;
  readonly blockNumber: number;
}
export type GoalExactPostDeadlineSettlement = Omit<GoalExactAppliedSettlement, 'revision'>;
/** Real later effects on attributed goal funds, never a later market valuation or revised goal result. */
export interface GoalExactPostDeadlineJournal {
  readonly version: 1;
  readonly kind: 'goal-exact-postdeadline';
  readonly goalId: string;
  readonly boundary: GoalExactPostDeadlineBoundary;
  readonly holdings: Balances;
  readonly deficit: Balances;
  readonly feesPaidAfterDeadlineCodec: string;
  readonly tradesAfterDeadline: number;
  readonly failuresAfterDeadline: number;
  readonly attention: readonly GoalExactAttention[];
  readonly settlements: readonly GoalExactPostDeadlineSettlement[];
  readonly journalSha256: string;
}

/** Apply all known later receipts without observing a price or mutating the immutable deadline ledger. */
export function settleGoalExactPostDeadline(
  rawState: GoalExactLedgerState,
  rawBoundary: GoalExactPostDeadlineBoundary,
  rawReceipts: readonly GoalExactTerminalReceipt[]
): GoalExactPostDeadlineJournal {
  const state = restoreGoalExactLedger(rawState),
    boundary = copy(rawBoundary),
    receipts = copy(rawReceipts);
  fields(boundary, ['goalId', 'ledgerStateSha256', 'evidenceSha256', 'blockHash', 'blockNumber']);
  requireValue(
    state.outcome !== 'active' &&
      state.accountingAtMs === state.episode.endedAtMs &&
      boundary.goalId === state.goalId &&
      boundary.ledgerStateSha256 === state.stateSha256 &&
      typeof boundary.evidenceSha256 === 'string' &&
      SHA.test(boundary.evidenceSha256) &&
      boundary.blockHash === state.lastMark.blockHash &&
      boundary.blockNumber === state.lastMark.blockNumber
  );
  requireValue(
    Array.isArray(receipts) &&
      receipts.length > 0 &&
      state.settlements.length + receipts.length <= GOAL_EXACT_POLICY.maximumSettlements
  );
  const orders = new Set(state.settlements.map((s) => s.orderId)),
    events = new Set(state.settlements.map((s) => s.eventId)),
    transactions = new Set(state.settlements.map((s) => s.receipt.extrinsicHash)),
    notes = new Set(state.attention);
  const entries: GoalExactPostDeadlineSettlement[] = [];
  let held = net(state.holdings, state.deficit),
    fees = 0n,
    trades = 0,
    failures = 0;
  for (const rawReceipt of receipts) {
    fields(rawReceipt, ['orderId', 'receipt', 'fill', 'success', 'actualOutputCodec', 'actualFeeCodec']);
    identifier(rawReceipt.orderId);
    const receipt = receiptCopy(rawReceipt.receipt),
      fill = fillCopy(rawReceipt.fill),
      eventId = `${receipt.blockHash}:${receipt.extrinsicIndex}`;
    requireValue(
      receipt.blockNumber > boundary.blockNumber &&
        !orders.has(rawReceipt.orderId) &&
        !events.has(eventId) &&
        !transactions.has(receipt.extrinsicHash)
    );
    const previous = entries.at(-1)?.receipt;
    requireValue(
      !previous ||
        receipt.blockNumber > previous.blockNumber ||
        (receipt.blockNumber === previous.blockNumber && receipt.extrinsicIndex > previous.extrinsicIndex)
    );
    requireValue(typeof rawReceipt.success === 'boolean');
    const output = amount(rawReceipt.actualOutputCodec),
      fee = amount(rawReceipt.actualFeeCodec);
    requireValue(rawReceipt.success || output === 0n);
    held = applyNet(held, fill, rawReceipt.success, output, fee);
    for (const note of attentionFor(
      { ...state, feesPaidCodec: String(total(state.feesPaidCodec) + fees) },
      fill,
      rawReceipt.success,
      output,
      fee,
      held
    ))
      notes.add(note);
    fees += fee;
    if (rawReceipt.success) trades++;
    else failures++;
    const content = receiptContent({ ...rawReceipt, receipt, fill });
    entries.push({ ...content, eventId, digest: digest(content) });
    orders.add(rawReceipt.orderId);
    events.add(eventId);
    transactions.add(receipt.extrinsicHash);
  }
  knownBlocks([
    state.openingMark,
    state.lastMark,
    ...state.settlements.map((s) => s.receipt),
    ...entries.map((s) => s.receipt),
  ]);
  const body = {
    version: 1 as const,
    kind: 'goal-exact-postdeadline' as const,
    goalId: state.goalId,
    boundary,
    ...balances(held.kusd, held.xor),
    feesPaidAfterDeadlineCodec: String(fees),
    tradesAfterDeadline: trades,
    failuresAfterDeadline: failures,
    attention: ATTENTION.filter((note) => notes.has(note)),
    settlements: entries,
  };
  return freeze({ ...body, journalSha256: digest(body) });
}

/** Recompute every later effect against the supplied terminal identity; public data never grants write authority. */
export function restoreGoalExactPostDeadline(
  terminalState: GoalExactLedgerState,
  boundary: GoalExactPostDeadlineBoundary,
  raw: unknown
): GoalExactPostDeadlineJournal {
  const journal = copy(raw) as GoalExactPostDeadlineJournal;
  fields(journal, [
    'version',
    'kind',
    'goalId',
    'boundary',
    'holdings',
    'deficit',
    'feesPaidAfterDeadlineCodec',
    'tradesAfterDeadline',
    'failuresAfterDeadline',
    'attention',
    'settlements',
    'journalSha256',
  ]);
  requireValue(Array.isArray(journal.settlements));
  const receipts = journal.settlements.map((entry) => {
    fields(entry, [
      'orderId',
      'receipt',
      'fill',
      'success',
      'actualOutputCodec',
      'actualFeeCodec',
      'eventId',
      'digest',
    ]);
    return receiptContent(entry);
  });
  const rebuilt = settleGoalExactPostDeadline(terminalState, boundary, receipts);
  requireValue(canonical(journal) === canonical(rebuilt));
  return rebuilt;
}
/**
 * Apply a canonical-order batch before observing once at the original deadline. Intermediate
 * balances are accounting steps, not observed market values, and cannot invent peaks/drawdown.
 * Receipt authority, true-asof-deadline evidence and atomic persistence remain the caller's duty.
 */
export function settleGoalExactTerminal(
  raw: GoalExactLedgerState,
  input: GoalExactObservation & { receipts: readonly GoalExactTerminalReceipt[] }
): GoalExactLedgerState {
  const state = restoreGoalExactLedger(raw),
    r = copy(input);
  fields(r, ['expectedRevision', 'accountingAtMs', 'mark', 'receipts']);
  requireValue(
    r.expectedRevision === state.revision &&
      r.accountingAtMs === state.episode.endedAtMs &&
      state.accountingAtMs <= r.accountingAtMs
  );
  const mark = markCopy(r.mark);
  requireValue(
    Array.isArray(r.receipts) && state.settlements.length + r.receipts.length <= GOAL_EXACT_POLICY.maximumSettlements
  );
  if (!r.receipts.length)
    return markGoalExactLedger(state, { expectedRevision: r.expectedRevision, accountingAtMs: r.accountingAtMs, mark });
  requireValue(Number.isSafeInteger(state.revision + r.receipts.length + 1));
  const orders = new Set(state.settlements.map((s) => s.orderId)),
    events = new Set(state.settlements.map((s) => s.eventId)),
    transactions = new Set(state.settlements.map((s) => s.receipt.extrinsicHash));
  const entries: GoalExactAppliedSettlement[] = [];
  let current = { ...state };
  for (const rawReceipt of r.receipts) {
    fields(rawReceipt, ['orderId', 'receipt', 'fill', 'success', 'actualOutputCodec', 'actualFeeCodec']);
    identifier(rawReceipt.orderId);
    const receipt = receiptCopy(rawReceipt.receipt),
      fill = fillCopy(rawReceipt.fill),
      eventId = `${receipt.blockHash}:${receipt.extrinsicIndex}`;
    requireValue(!orders.has(rawReceipt.orderId) && !events.has(eventId) && !transactions.has(receipt.extrinsicHash));
    requireValue(
      receipt.blockNumber >= state.openingMark.blockNumber &&
        receipt.blockNumber <= mark.blockNumber &&
        (receipt.blockNumber !== mark.blockNumber || receipt.blockHash === mark.blockHash)
    );
    const previous = entries.at(-1)?.receipt;
    requireValue(
      !previous ||
        receipt.blockNumber > previous.blockNumber ||
        (receipt.blockNumber === previous.blockNumber && receipt.extrinsicIndex > previous.extrinsicIndex)
    );
    requireValue(typeof rawReceipt.success === 'boolean');
    const output = amount(rawReceipt.actualOutputCodec),
      fee = amount(rawReceipt.actualFeeCodec);
    requireValue(rawReceipt.success || output === 0n);
    const content = receiptContent({ ...rawReceipt, receipt, fill });
    const held = applyNet(net(current.holdings, current.deficit), fill, rawReceipt.success, output, fee);
    const notes = attentionFor(current, fill, rawReceipt.success, output, fee, held);
    if (receipt.blockNumber < state.lastMark.blockNumber) notes.push('late-settlement');
    current = {
      ...current,
      ...balances(held.kusd, held.xor),
      feesPaidCodec: String(total(current.feesPaidCodec) + fee),
      trades: current.trades + (rawReceipt.success ? 1 : 0),
      failures: current.failures + (rawReceipt.success ? 0 : 1),
      attention: ATTENTION.filter((n) => current.attention.includes(n) || notes.includes(n)),
      revision: current.revision + 1,
    };
    entries.push({ ...content, eventId, digest: digest(content), revision: current.revision });
    orders.add(rawReceipt.orderId);
    events.add(eventId);
    transactions.add(receipt.extrinsicHash);
  }
  knownBlocks([
    state.openingMark,
    state.lastMark,
    mark,
    ...state.settlements.map((s) => s.receipt),
    ...entries.map((s) => s.receipt),
  ]);
  return seal({
    ...observed(current, mark, r.accountingAtMs),
    previousStateSha256: state.stateSha256,
    settlements: [...state.settlements, ...entries],
  });
}
