import { FPNumber } from '@/lib/substrate/math';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { fromCodec } from './amounts';
import { decimalRatio } from './engine';
import type { BotAsset, BotDefinition, BotHistory } from './types';

const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const ARCHIVE = 'https://mof2.sora.org/';
const HOUR = 3_600_000;
const HASH = /^0x[0-9a-f]{64}$/;
const U128_MAX = (1n << 128n) - 1n;
const MAX_BYTES = 24 * 1024 * 1024;

export interface ArchiveHistoryOptions {
  startAt: number;
  endAt: number;
  genesisHash: string;
  currentDenominator: string;
}
interface ArchiveHistoryDependencies {
  fetch: typeof fetch;
  now: () => number;
}

/** Narrow untrusted static data without accepting arrays or inherited prototypes as records. */
function record(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || Object.getPrototypeOf(prototype) === null;
}

/** Accept an exact unsigned reserve value only within the chain's u128 storage representation. */
function reserve(value: unknown): string {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,38})$/.test(value) || BigInt(value) > U128_MAX)
    throw new Error('bots.errors.history');
  return value;
}

/** Value one token in XOR using the same historical state's exact pool reserves and asset precision. */
function priceInXor(row: Record<string, unknown>, asset: BotAsset): FPNumber | null {
  if (!record(row.metadata) || !record(row.pools)) throw new Error('bots.errors.history');
  const metadata = row.metadata[asset.address];
  if (!record(metadata) || metadata.decimals !== asset.decimals || metadata.symbol !== asset.symbol) return null;
  if (asset.address === XOR.address) return new FPNumber('1', 36);
  const pool = row.pools[asset.address];
  if (pool === undefined) return null;
  if (!Array.isArray(pool) || pool.length !== 2) throw new Error('bots.errors.history');
  const base = reserve(pool[0]);
  const target = reserve(pool[1]);
  if (base === '0' || target === '0') return null;
  return decimalRatio(
    new FPNumber(fromCodec(base, XOR.decimals), 36),
    new FPNumber(fromCodec(target, asset.decimals), 36)
  );
}

/** Validate archival boundary proofs and convert pool spot observations into completed historical candles. */
export function parseArchivedBotHistory(
  value: unknown,
  bot: BotDefinition,
  options: ArchiveHistoryOptions,
  now = Date.now()
): BotHistory {
  const { startAt, endAt, genesisHash, currentDenominator } = options;
  if (
    !Number.isSafeInteger(startAt) ||
    !Number.isSafeInteger(endAt) ||
    startAt < 0 ||
    startAt % HOUR ||
    endAt % HOUR ||
    endAt <= startAt ||
    endAt > Math.floor(now / HOUR) * HOUR ||
    (endAt - startAt) / HOUR > 10000 ||
    genesisHash !== GENESIS ||
    !/^[1-9]\d{0,119}$/.test(currentDenominator) ||
    bot.assetIn.address === bot.assetOut.address ||
    bot.policy.feeAsset.address !== XOR.address ||
    bot.policy.feeAsset.decimals !== XOR.decimals
  )
    throw new Error('bots.errors.history');
  if (
    !record(value) ||
    value.version !== 1 ||
    value.kind !== 'sora-pool-reserves-hourly' ||
    value.genesisHash !== genesisHash ||
    value.archiveEndpoint !== ARCHIVE ||
    value.baseAsset !== XOR.address ||
    !Number.isSafeInteger(value.generatedAt) ||
    (value.generatedAt as number) > now ||
    !Number.isSafeInteger(value.startAt) ||
    !Number.isSafeInteger(value.endAt) ||
    (value.startAt as number) < 0 ||
    (value.startAt as number) % HOUR !== 0 ||
    (value.endAt as number) % HOUR !== 0 ||
    (value.endAt as number) <= (value.startAt as number) ||
    (value.endAt as number) > (value.generatedAt as number) ||
    !record(value.finalized) ||
    !HASH.test(String(value.finalized.hash)) ||
    !Number.isSafeInteger(value.finalized.height) ||
    !Number.isSafeInteger(value.finalized.timestamp) ||
    (value.finalized.timestamp as number) > (value.generatedAt as number) ||
    (value.finalized.timestamp as number) < (value.endAt as number) ||
    !Array.isArray(value.rows) ||
    value.rows.length > 10000
  )
    throw new Error('bots.errors.history');
  const candles: BotHistory['candles'] = [];
  let previous = -1;
  for (const row of value.rows) {
    if (!record(row) || !Number.isSafeInteger(row.timestamp) || (row.timestamp as number) <= previous)
      throw new Error('bots.errors.history');
    const timestamp = row.timestamp as number;
    previous = timestamp;
    if (
      timestamp % HOUR ||
      timestamp <= (value.startAt as number) ||
      timestamp > (value.endAt as number) ||
      row.genesis !== genesisHash ||
      row.source !== ARCHIVE ||
      !HASH.test(String(row.blockHash)) ||
      !HASH.test(String(row.nextBlockHash)) ||
      !Number.isSafeInteger(row.blockHeight) ||
      !Number.isSafeInteger(row.nextBlockHeight) ||
      (row.blockHeight as number) < 1 ||
      row.nextBlockHeight !== (row.blockHeight as number) + 1 ||
      (row.nextBlockHeight as number) > (value.finalized.height as number) ||
      !Number.isSafeInteger(row.stateTimestamp) ||
      !Number.isSafeInteger(row.nextStateTimestamp) ||
      (row.stateTimestamp as number) >= timestamp ||
      (row.nextStateTimestamp as number) < timestamp ||
      (row.nextStateTimestamp as number) > (value.finalized.timestamp as number) ||
      typeof row.denominator !== 'string' ||
      !/^[1-9]\d{0,119}$/.test(row.denominator)
    )
      throw new Error('bots.errors.history');
    if (
      timestamp <= startAt ||
      timestamp > endAt ||
      row.denominator !== currentDenominator ||
      row.missing === true ||
      (row.stateTimestamp as number) < timestamp - HOUR
    )
      continue;
    // All legs, including XOR network fees, are valued from this identical finalized historical state.
    const base = priceInXor(row, bot.assetIn);
    const quote = priceInXor(row, bot.assetOut);
    const fee = priceInXor(row, bot.policy.feeAsset);
    if (!base || !quote || !fee || base.isZero() || quote.isZero()) continue;
    candles.push({
      timestamp,
      close: decimalRatio(quote, base).toString(),
      feeClose: decimalRatio(fee, base).toString(),
    });
  }
  return {
    candles,
    missing: (endAt - startAt) / HOUR - candles.length,
    denominationVerified: candles.length > 0,
    provenance: {
      kind: 'archive-pool-spot',
      requestedStartAt: startAt,
      requestedEndAt: endAt,
      availableStartAt: candles[0]?.timestamp ?? null,
      availableEndAt: candles.at(-1)?.timestamp ?? null,
      generatedAt: value.generatedAt as number,
      archiveEndpoint: ARCHIVE,
    },
  };
}

/** Fetch only bundled, IPFS-relative archival observations; never make a live quote look historical. */
export async function fetchArchivedBotHistory(
  bot: BotDefinition,
  options: ArchiveHistoryOptions,
  deps: ArchiveHistoryDependencies = { fetch: globalThis.fetch.bind(globalThis), now: Date.now }
): Promise<BotHistory> {
  const response = await deps.fetch('./bot-history/sora-mainnet-hourly-2026-03-01.json', {
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok || Number(response.headers.get('content-length') || 0) > MAX_BYTES)
    throw new Error('bots.errors.history');
  const payload = await response.text();
  if (payload.length > MAX_BYTES) throw new Error('bots.errors.history');
  return parseArchivedBotHistory(JSON.parse(payload) as unknown, bot, options, deps.now());
}
