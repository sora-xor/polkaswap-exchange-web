import { u8aToHex } from '@polkadot/util';
import { sha256AsU8a } from '@polkadot/util-crypto';
import { FPNumber } from '@/lib/substrate/math';
import type { IndexedPoolBoundaryEvidence, IndexedPoolHistoryWithEvidence } from './pool-history';
import type { BotAsset, BotCandle, BotDefinition, BotHistory } from './types';

export const GOAL_HISTORY_WARMUP_CANDLES = 201;
export const GOAL_HISTORY_STUDY_CANDLES = 168;
const HOUR = 3_600_000;
const HASH = /^0x[0-9a-f]{64}$/;
const U128_MAX = (1n << 128n) - 1n;

/** Retained public observations; the digest checks integrity, not independent chain attestation. */
export interface GoalHistoryEvidence {
  policy: 'preceding-201-completed-hours';
  source: 'indexed-finalized-xor-pool-spot';
  assetIn: BotAsset;
  assetOut: BotAsset;
  feeAsset: BotAsset;
  identity: { genesisHash: string; denominator: string };
  /** Opening of the first study hour. Funding starts at its completed close, one hour later. */
  studyStartAt: number;
  /** Exclusive opening cutoff, also the final study close. */
  studyEndAt: number;
  warmupCandles: BotCandle[];
  warmupBoundaries: IndexedPoolBoundaryEvidence[];
  studyCandles: BotCandle[];
  studyBoundaries: IndexedPoolBoundaryEvidence[];
  commitmentSha256: string;
}
/** The funded study remains 168 closes; its preceding observations travel separately. */
export type AutopilotHistory = BotHistory & { goalHistory: GoalHistoryEvidence };

const invalid = (): never => {
  throw new Error('bots.errors.config');
};

/** Inspect bounded plain data without invoking accessors or accepting cycles or plugin objects. */
export function assertGoalPublicData(value: unknown, depth = 0, seen = new Set<object>(), budget = { nodes: 0 }): void {
  if (++budget.nodes > 10000 || depth > 16) invalid();
  if (value === null || value === undefined || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) invalid();
    return;
  }
  if (typeof value !== 'object' || seen.has(value)) invalid();
  const isArray = Array.isArray(value);
  if (Object.getPrototypeOf(value) !== (isArray ? Array.prototype : Object.prototype)) invalid();
  seen.add(value as object);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (isArray && Reflect.ownKeys(descriptors).length !== descriptors.length.value + 1) invalid();
  for (const key of Reflect.ownKeys(descriptors)) {
    if (
      typeof key !== 'string' ||
      !('value' in descriptors[key]) ||
      (isArray && key !== 'length' && !/^(0|[1-9]\d*)$/.test(key))
    )
      invalid();
    assertGoalPublicData(descriptors[key as string].value, depth + 1, seen, budget);
  }
  seen.delete(value as object);
}

/** Read a record only after its entire public subtree has passed descriptor inspection. */
function record(value: unknown): Record<string, unknown> {
  assertGoalPublicData(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}

/** Keep exact token identity, display symbol, and chain precision in the commitment. */
function asset(value: unknown): BotAsset {
  const row = record(value);
  if (
    typeof row.address !== 'string' ||
    !/^0x[0-9a-f]{64}$/i.test(row.address) ||
    typeof row.symbol !== 'string' ||
    !row.symbol ||
    row.symbol.length > 40 ||
    !Number.isSafeInteger(row.decimals) ||
    (row.decimals as number) < 0 ||
    (row.decimals as number) > 36
  )
    invalid();
  return { address: row.address as string, symbol: row.symbol as string, decimals: row.decimals as number };
}

/** Positive prices remain exact canonical decimal strings, never floating-point amounts. */
function price(value: unknown): string {
  if (typeof value !== 'string' || value.length > 120 || !/^(0|[1-9]\d*)(\.\d{1,36})?$/.test(value)) invalid();
  const parsed = new FPNumber(value as string, 36);
  if (!parsed.isFinity() || !parsed.gt(new FPNumber('0', 36)) || parsed.toString() !== value) invalid();
  return value as string;
}

/** Each row must be the exact predetermined completed hour, including its fee-asset mark. */
function candle(value: unknown, timestamp: number): BotCandle {
  const row = record(value);
  if (row.timestamp !== timestamp) invalid();
  return { timestamp, close: price(row.close), feeClose: price(row.feeClose) };
}

/** Copy an indexed block boundary without claiming exact arrival times or independent ancestry. */
function boundary(
  value: unknown,
  completedAtMs: number,
  identity: GoalHistoryEvidence['identity']
): IndexedPoolBoundaryEvidence {
  const row = record(value),
    closing = record(row.closing),
    successor = record(row.successor);
  const completedAt = completedAtMs / 1000;
  if (
    row.kind !== 'indexed-finalized-hour-boundary' ||
    row.completedAtMs !== completedAtMs ||
    row.genesisHash !== identity.genesisHash ||
    row.denominator !== identity.denominator ||
    row.arrivalTimeKnown !== false ||
    !Number.isSafeInteger(closing.height) ||
    (closing.height as number) < 1 ||
    !Number.isSafeInteger(successor.height) ||
    successor.height !== (closing.height as number) + 1 ||
    typeof closing.hash !== 'string' ||
    !HASH.test(closing.hash) ||
    typeof successor.hash !== 'string' ||
    !HASH.test(successor.hash) ||
    successor.hash === closing.hash ||
    !Number.isSafeInteger(closing.timestampSeconds) ||
    (closing.timestampSeconds as number) < completedAt - 3600 ||
    (closing.timestampSeconds as number) >= completedAt ||
    !Number.isSafeInteger(successor.timestampSeconds) ||
    (successor.timestampSeconds as number) < completedAt ||
    (successor.timestampSeconds as number) >= completedAt + 3600
  )
    invalid();
  return {
    kind: 'indexed-finalized-hour-boundary',
    completedAtMs,
    ...identity,
    closing: {
      height: closing.height as number,
      hash: closing.hash as string,
      timestampSeconds: closing.timestampSeconds as number,
    },
    successor: {
      height: successor.height as number,
      hash: successor.hash as string,
      timestampSeconds: successor.timestampSeconds as number,
    },
    arrivalTimeKnown: false,
  };
}

/** A fixed field order and canonical leaf values produce one portable public-data digest. */
function digest(value: Omit<GoalHistoryEvidence, 'commitmentSha256'>): string {
  return u8aToHex(sha256AsU8a(new TextEncoder().encode(JSON.stringify(value)))).slice(2);
}

/** Validate and project all history fields before hashing or reading the supplied commitment. */
function project(value: unknown): Omit<GoalHistoryEvidence, 'commitmentSha256'> {
  const row = record(value),
    chain = record(row.identity);
  if (
    row.policy !== 'preceding-201-completed-hours' ||
    row.source !== 'indexed-finalized-xor-pool-spot' ||
    typeof chain.genesisHash !== 'string' ||
    !HASH.test(chain.genesisHash) ||
    typeof chain.denominator !== 'string' ||
    !/^[1-9]\d{0,38}$/.test(chain.denominator) ||
    BigInt(chain.denominator) > U128_MAX ||
    !Number.isSafeInteger(row.studyStartAt) ||
    !Number.isSafeInteger(row.studyEndAt) ||
    (row.studyStartAt as number) < GOAL_HISTORY_WARMUP_CANDLES * HOUR ||
    (row.studyStartAt as number) % HOUR !== 0 ||
    (row.studyEndAt as number) !== (row.studyStartAt as number) + GOAL_HISTORY_STUDY_CANDLES * HOUR
  )
    invalid();
  const identity = { genesisHash: chain.genesisHash as string, denominator: chain.denominator as string };
  const assetIn = asset(row.assetIn),
    assetOut = asset(row.assetOut),
    feeAsset = asset(row.feeAsset);
  if (assetIn.address === assetOut.address) invalid();
  for (const current of [assetIn, assetOut])
    if (current.address === feeAsset.address && JSON.stringify(current) !== JSON.stringify(feeAsset)) invalid();
  const start = row.studyStartAt as number;
  const copyRows = (candles: unknown, boundaries: unknown, count: number, first: number) => {
    if (
      !Array.isArray(candles) ||
      !Array.isArray(boundaries) ||
      candles.length !== count ||
      boundaries.length !== count
    )
      invalid();
    return {
      candles: (candles as unknown[]).map((value, index) => candle(value, first + index * HOUR)),
      boundaries: (boundaries as unknown[]).map((value, index) => boundary(value, first + index * HOUR, identity)),
    };
  };
  const warmup = copyRows(
    row.warmupCandles,
    row.warmupBoundaries,
    GOAL_HISTORY_WARMUP_CANDLES,
    start - (GOAL_HISTORY_WARMUP_CANDLES - 1) * HOUR
  );
  const study = copyRows(row.studyCandles, row.studyBoundaries, GOAL_HISTORY_STUDY_CANDLES, start + HOUR);
  const boundaries = [...warmup.boundaries, ...study.boundaries];
  for (let index = 1; index < boundaries.length; index++)
    if (boundaries[index].closing.height < boundaries[index - 1].successor.height) invalid();
  return {
    policy: 'preceding-201-completed-hours',
    source: 'indexed-finalized-xor-pool-spot',
    assetIn,
    assetOut,
    feeAsset,
    identity,
    studyStartAt: start,
    studyEndAt: row.studyEndAt as number,
    warmupCandles: warmup.candles,
    warmupBoundaries: warmup.boundaries,
    studyCandles: study.candles,
    studyBoundaries: study.boundaries,
  };
}

/** Persist the exact verified prefix and study; this never funds a warmup observation. */
export function createGoalHistoryEvidence(
  bot: BotDefinition,
  combined: IndexedPoolHistoryWithEvidence,
  studyStartAt: number,
  studyEndAt: number
): GoalHistoryEvidence {
  record(combined);
  if (
    combined.history.missing !== 0 ||
    combined.history.denominationVerified !== true ||
    combined.history.candles.length !== GOAL_HISTORY_WARMUP_CANDLES + GOAL_HISTORY_STUDY_CANDLES ||
    combined.boundaries.length !== combined.history.candles.length
  )
    invalid();
  const value = project({
    policy: 'preceding-201-completed-hours',
    source: 'indexed-finalized-xor-pool-spot',
    assetIn: bot.assetIn,
    assetOut: bot.assetOut,
    feeAsset: bot.policy.feeAsset,
    identity: combined.history.identity,
    studyStartAt,
    studyEndAt,
    warmupCandles: combined.history.candles.slice(0, GOAL_HISTORY_WARMUP_CANDLES),
    warmupBoundaries: combined.boundaries.slice(0, GOAL_HISTORY_WARMUP_CANDLES),
    studyCandles: combined.history.candles.slice(GOAL_HISTORY_WARMUP_CANDLES),
    studyBoundaries: combined.boundaries.slice(GOAL_HISTORY_WARMUP_CANDLES),
  });
  return { ...value, commitmentSha256: digest(value) };
}

/** Revalidate retained data and require its exact canonical integrity commitment. */
export function copyGoalHistoryEvidence(value: unknown): GoalHistoryEvidence {
  const projected = project(value),
    row = value as Record<string, unknown>;
  const commitmentSha256 = digest(projected);
  if (row.commitmentSha256 !== commitmentSha256) invalid();
  return { ...projected, commitmentSha256 };
}

/** Bind retained history to the proposed assets and the unchanged 168 funded-study closes. */
export function assertGoalHistoryMatches(bot: BotDefinition, history: BotHistory, evidence: GoalHistoryEvidence): void {
  const copied = copyGoalHistoryEvidence(evidence);
  record(history);
  if (
    JSON.stringify(asset(bot.assetIn)) !== JSON.stringify(copied.assetIn) ||
    JSON.stringify(asset(bot.assetOut)) !== JSON.stringify(copied.assetOut) ||
    JSON.stringify(asset(bot.policy.feeAsset)) !== JSON.stringify(copied.feeAsset) ||
    history.missing !== 0 ||
    history.denominationVerified !== true ||
    history.identity?.genesisHash !== copied.identity.genesisHash ||
    history.identity?.denominator !== copied.identity.denominator ||
    history.candles.length !== GOAL_HISTORY_STUDY_CANDLES ||
    history.candles.some(
      (row, index) =>
        JSON.stringify(candle(row, copied.studyCandles[index].timestamp)) !== JSON.stringify(copied.studyCandles[index])
    )
  )
    invalid();
}
