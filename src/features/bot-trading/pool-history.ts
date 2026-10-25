import { FPNumber } from '@/lib/substrate/math';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { decimalRatio } from './engine';
import type { BotAsset, BotDefinition, BotHistory } from './types';

const HOUR = 3_600;
const HASH = /^0x[0-9a-f]{64}$/;
const U128_MAX = (1n << 128n) - 1n;

/** Raw indexed observations; USD prices are deliberately outside this contract. */
export interface IndexedPoolHistoryRow {
  timestamp: number | string;
  denominator?: string | null;
  closeEvidence?: unknown;
}

/** Exact chain identity and completed-hour range captured by the caller. */
export interface IndexedPoolHistoryContext {
  startAt: number;
  endAt: number;
  genesisHash: string;
  denominator: string;
}

/** Indexed second-resolution provenance; exact block timestamps and ancestry need separate RPC verification. */
export interface IndexedPoolBoundaryEvidence {
  readonly kind: 'indexed-finalized-hour-boundary';
  readonly completedAtMs: number;
  readonly genesisHash: string;
  readonly denominator: string;
  readonly closing: Readonly<{ height: number; hash: string; timestampSeconds: number }>;
  readonly successor: Readonly<{ height: number; hash: string; timestampSeconds: number }>;
  readonly arrivalTimeKnown: false;
}

/** One retained boundary for each accepted candle; rejected or missing hours have neither. */
export interface IndexedPoolHistoryWithEvidence {
  readonly history: BotHistory;
  readonly boundaries: readonly IndexedPoolBoundaryEvidence[];
}

interface PoolMark {
  /** Exact natural XOR/token ratio; divide once after composing both legs. */
  numerator: bigint;
  denominator: bigint;
  boundary: string;
  evidence: IndexedPoolBoundaryEvidence;
}

/** Refuse prototype tricks and accessors before reading untrusted evidence fields. */
function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  if (Reflect.ownKeys(value).some((key) => typeof key !== 'string')) return null;
  if (Object.values(Object.getOwnPropertyDescriptors(value)).some((descriptor) => !('value' in descriptor)))
    return null;
  return value as Record<string, unknown>;
}

/** Historical reserves use the chain's exact positive u128 representation. */
function reserve(value: unknown): bigint | null {
  if (typeof value !== 'string' || !/^[1-9]\d{0,38}$/.test(value) || BigInt(value) > U128_MAX) return null;
  return BigInt(value);
}

/** Validate a single finalized observation and normalize its real direct pool into XOR units. */
function mark(
  row: IndexedPoolHistoryRow,
  asset: BotAsset,
  opening: number,
  context: IndexedPoolHistoryContext
): PoolMark | null {
  if (row.denominator !== context.denominator) return null;
  const proof = record(row.closeEvidence);
  if (!proof) return null;
  const completedAt = opening + HOUR;
  const timestamp = Number(row.timestamp);
  if (
    proof.kind !== 'finalized-hour-close' ||
    proof.genesisHash !== context.genesisHash ||
    proof.completedAt !== completedAt ||
    proof.timestamp !== timestamp ||
    timestamp < opening ||
    timestamp >= completedAt ||
    proof.symbol !== asset.symbol ||
    proof.requestedSymbol !== asset.symbol ||
    proof.decimals !== asset.decimals ||
    !Number.isSafeInteger(proof.blockHeight) ||
    (proof.blockHeight as number) < 1 ||
    proof.nextBlockHeight !== (proof.blockHeight as number) + 1 ||
    !Number.isSafeInteger(proof.nextBlockHeight) ||
    typeof proof.blockHash !== 'string' ||
    !HASH.test(proof.blockHash) ||
    typeof proof.nextBlockHash !== 'string' ||
    !HASH.test(proof.nextBlockHash) ||
    proof.blockHash === proof.nextBlockHash ||
    !Number.isSafeInteger(proof.nextTimestamp) ||
    (proof.nextTimestamp as number) < completedAt ||
    (proof.nextTimestamp as number) >= completedAt + HOUR
  )
    return null;

  let numerator = 1n;
  let denominator = 1n;
  if (asset.address === XOR.address) {
    // Explicit null distinguishes new same-state evidence from a legacy USD row.
    if (asset.decimals !== XOR.decimals || proof.xorPool !== null) return null;
  } else {
    const pool = record(proof.xorPool);
    if (
      !pool ||
      pool.baseAssetId !== XOR.address ||
      pool.targetAssetId !== asset.address ||
      pool.baseDecimals !== XOR.decimals ||
      pool.targetDecimals !== asset.decimals
    )
      return null;
    const base = reserve(pool.baseAssetReserves);
    const target = reserve(pool.targetAssetReserves);
    if (!base || !target) return null;
    numerator = base * 10n ** BigInt(asset.decimals);
    denominator = target * 10n ** BigInt(XOR.decimals);
  }
  return {
    numerator,
    denominator,
    boundary: JSON.stringify([
      proof.blockHeight,
      proof.blockHash,
      timestamp,
      proof.nextBlockHeight,
      proof.nextBlockHash,
      proof.nextTimestamp,
    ]),
    evidence: Object.freeze({
      kind: 'indexed-finalized-hour-boundary',
      completedAtMs: completedAt * 1000,
      genesisHash: context.genesisHash,
      denominator: context.denominator,
      closing: Object.freeze({
        height: proof.blockHeight as number,
        hash: proof.blockHash,
        timestampSeconds: timestamp,
      }),
      successor: Object.freeze({
        height: proof.nextBlockHeight as number,
        hash: proof.nextBlockHash,
        timestampSeconds: proof.nextTimestamp as number,
      }),
      arrivalTimeKnown: false,
    }),
  };
}

/**
 * Build comparable pair/fee marks from explicit same-block XOR pool reserves.
 * Stable tokens are never pegged to USD. Missing, ambiguous, legacy, or mismatched
 * observations remain gaps; neither USD discovery routes nor repeated prices fill them.
 * These are pool spot observations, not historical executable quotes or fills.
 */
export function parseIndexedPoolHistory(
  rows: ReadonlyMap<string, readonly IndexedPoolHistoryRow[]>,
  bot: BotDefinition,
  context: IndexedPoolHistoryContext
): BotHistory {
  return parseIndexedPoolHistoryWithEvidence(rows, bot, context).history;
}

/**
 * Preserve the same validated hourly marks and their indexed boundary identities.
 * This additive research contract does not change legacy history shape or turn
 * second-resolution indexer timestamps into browser availability or executable quotes.
 */
export function parseIndexedPoolHistoryWithEvidence(
  rows: ReadonlyMap<string, readonly IndexedPoolHistoryRow[]>,
  bot: BotDefinition,
  context: IndexedPoolHistoryContext
): IndexedPoolHistoryWithEvidence {
  const { startAt, endAt, genesisHash, denominator } = context;
  const intervalMs = HOUR * 1000;
  const configured = [bot.assetIn, bot.assetOut, bot.policy.feeAsset];
  const assets = [...new Map(configured.map((a) => [a.address, a])).values()];
  if (
    !Number.isSafeInteger(startAt) ||
    !Number.isSafeInteger(endAt) ||
    startAt < 0 ||
    startAt % intervalMs !== 0 ||
    endAt % intervalMs !== 0 ||
    endAt <= startAt ||
    endAt - startAt > 10000 * intervalMs ||
    !HASH.test(genesisHash) ||
    !/^[1-9]\d{0,38}$/.test(denominator) ||
    BigInt(denominator) > U128_MAX ||
    bot.assetIn.address === bot.assetOut.address ||
    bot.policy.feeAsset.address !== XOR.address ||
    bot.policy.feeAsset.decimals !== XOR.decimals ||
    configured.some(
      (asset) =>
        !HASH.test(asset.address) ||
        !Number.isSafeInteger(asset.decimals) ||
        asset.decimals < 0 ||
        asset.decimals > 36 ||
        typeof asset.symbol !== 'string' ||
        !asset.symbol ||
        asset.symbol.length > 128 ||
        (asset.address === XOR.address && (asset.decimals !== XOR.decimals || asset.symbol !== XOR.symbol)) ||
        configured.some(
          (other) =>
            other.address === asset.address && (other.decimals !== asset.decimals || other.symbol !== asset.symbol)
        )
    )
  )
    throw new Error('bots.errors.history');
  const start = startAt / 1000;
  const end = endAt / 1000;
  const byAsset = new Map<string, Map<number, PoolMark>>();
  for (const asset of assets) {
    const marks = new Map<number, PoolMark>();
    const seen = new Set<number>();
    const source = rows.get(asset.address) ?? [];
    if (source.length > 10000) throw new Error('bots.errors.history');
    for (const raw of source) {
      const row = record(raw);
      if (!row || !['number', 'string'].includes(typeof row.timestamp)) continue;
      const timestamp = Number(row.timestamp);
      if (!Number.isSafeInteger(timestamp) || timestamp < start || timestamp >= end) continue;
      const opening = Math.floor(timestamp / HOUR) * HOUR;
      if (seen.has(opening)) {
        marks.delete(opening);
        continue;
      }
      seen.add(opening);
      const observation = mark(raw, asset, opening, context);
      if (observation) marks.set(opening, observation);
    }
    byAsset.set(asset.address, marks);
  }
  const candles: BotHistory['candles'] = [];
  const boundaries: IndexedPoolBoundaryEvidence[] = [];
  for (let opening = start; opening < end; opening += HOUR) {
    const input = byAsset.get(bot.assetIn.address)?.get(opening);
    const output = byAsset.get(bot.assetOut.address)?.get(opening);
    const fee = byAsset.get(bot.policy.feeAsset.address)?.get(opening);
    if (!input || !output || !fee || input.boundary !== output.boundary || input.boundary !== fee.boundary) continue;
    const relativePrice = (target: PoolMark) =>
      decimalRatio(
        new FPNumber((target.numerator * input.denominator).toString(), 36),
        new FPNumber((target.denominator * input.numerator).toString(), 36)
      );
    const close = relativePrice(output);
    const feeClose = relativePrice(fee);
    if (close.isZero() || feeClose.isZero()) continue;
    candles.push({ timestamp: (opening + HOUR) * 1000, close: close.toString(), feeClose: feeClose.toString() });
    boundaries.push(input.evidence);
  }
  return Object.freeze({
    history: {
      candles,
      missing: (end - start) / HOUR - candles.length,
      denominationVerified: candles.length > 0,
      identity: { genesisHash, denominator },
    },
    boundaries: Object.freeze(boundaries),
  });
}
