import { blake2AsHex, xxhashAsHex } from '@polkadot/util-crypto';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { parseArchivedBotHistory, type ArchiveHistoryOptions } from './archive-history';
import type { BotAsset, BotDefinition, BotHistory } from './types';

const ARCHIVE = 'https://mof2.sora.org/';
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const HOUR = 3_600_000;
const HASH = /^0x[0-9a-f]{64}$/;
const MAX_BATCH = 32;
const MAX_RESPONSE_BYTES = 512 * 1024;
const MAX_REQUESTS = 512;

/** Injectable read-only transport and cancellation; no wallet or signing dependency is accepted. */
export interface ArchiveRpcHistoryDependencies {
  fetch?: typeof fetch;
  now?: () => number;
  signal?: AbortSignal;
  requestIntervalMs?: number;
}
interface BlockTime {
  height: number;
  hash: string;
  timestamp: number;
}
type RpcCall = readonly [method: string, params: unknown[]];

/** Derive the chain's canonical storage prefix without loading a full wallet API. */
function prefix(pallet: string, item: string): string {
  return xxhashAsHex(pallet, 128) + xxhashAsHex(item, 128).slice(2);
}

/** Decode a bounded little-endian SCALE unsigned integer exactly. */
function unsigned(raw: unknown, bytes: number): string {
  if (typeof raw !== 'string' || !new RegExp(`^0x[0-9a-f]{${bytes * 2}}$`).test(raw))
    throw new Error('bots.errors.history');
  let value = 0n;
  for (let index = bytes - 1; index >= 0; index--)
    value = value * 256n + BigInt(`0x${raw.slice(2 + index * 2, 4 + index * 2)}`);
  return value.toString();
}

/** Reject unsafe millisecond/height conversions while keeping token values as exact strings. */
function safeNumber(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error('bots.errors.history');
  return parsed;
}

/** Read only the bounded symbol/name/precision fields needed to validate an asset at this state. */
function metadata(raw: unknown): { symbol: string; decimals: number } | null {
  if (raw === null) return null;
  if (typeof raw !== 'string' || !/^0x(?:[0-9a-f]{2})+$/.test(raw) || raw.length > 8_194)
    throw new Error('bots.errors.history');
  const bytes = Uint8Array.from(raw.slice(2).match(/../g)!, (value) => Number.parseInt(value, 16));
  let offset = 0;
  const text = (): string => {
    if (offset >= bytes.length) throw new Error('bots.errors.history');
    const tag = bytes[offset++];
    let length: number;
    if ((tag & 3) === 0) length = tag >> 2;
    else if ((tag & 3) === 1 && offset < bytes.length) length = (tag + (bytes[offset++] << 8)) >> 2;
    else throw new Error('bots.errors.history');
    if (length > 1_024 || offset + length > bytes.length) throw new Error('bots.errors.history');
    const value = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(offset, offset + length));
    offset += length;
    return value;
  };
  const symbol = text();
  text();
  if (!symbol || offset >= bytes.length || bytes[offset] > 36) throw new Error('bots.errors.history');
  return { symbol, decimals: bytes[offset] };
}

/** Validate one state_queryStorageAt result, including its immutable block hash and exact requested keys. */
function storage(value: unknown, hash: string, keys: string[]): Map<string, unknown> {
  if (!Array.isArray(value) || value.length !== 1) throw new Error('bots.errors.history');
  const row = value[0];
  if (!row || row.block !== hash || !Array.isArray(row.changes) || row.changes.length !== keys.length)
    throw new Error('bots.errors.history');
  const values = new Map<string, unknown>();
  for (const entry of row.changes) {
    if (!Array.isArray(entry) || entry.length !== 2 || !keys.includes(entry[0]) || values.has(entry[0]))
      throw new Error('bots.errors.history');
    values.set(entry[0], entry[1]);
  }
  return values;
}

/** Fetch at most seven days of completed hourly pool observations from the approved finalized archive.
 * Searches batch timestamp-only reads; reserve/metadata reads happen once per located close, never per search probe.
 * Missing pools, changed precision, denomination changes, and chain halts remain gaps rather than interpolated prices.
 */
export async function fetchRecentArchivedBotHistory(
  bot: BotDefinition,
  options: ArchiveHistoryOptions,
  deps: ArchiveRpcHistoryDependencies = {}
): Promise<BotHistory> {
  const now = deps.now ?? Date.now;
  const fetcher = deps.fetch ?? globalThis.fetch.bind(globalThis);
  const { startAt, endAt, genesisHash, currentDenominator } = options;
  const assets = [...new Map([XOR, bot.assetIn, bot.assetOut].map((asset) => [asset.address, asset])).values()];
  if (
    !Number.isSafeInteger(startAt) ||
    !Number.isSafeInteger(endAt) ||
    startAt < 0 ||
    startAt % HOUR ||
    endAt % HOUR ||
    endAt <= startAt ||
    endAt > Math.floor(now() / HOUR) * HOUR ||
    endAt - startAt > 168 * HOUR ||
    genesisHash !== GENESIS ||
    !/^[1-9]\d{0,38}$/.test(currentDenominator) ||
    BigInt(currentDenominator) >= 1n << 128n ||
    bot.assetIn.address === bot.assetOut.address ||
    bot.policy.feeAsset.address !== XOR.address ||
    bot.policy.feeAsset.decimals !== XOR.decimals ||
    assets.some(
      (asset) =>
        !HASH.test(asset.address) ||
        !Number.isInteger(asset.decimals) ||
        asset.decimals < 0 ||
        asset.decimals > 36 ||
        typeof asset.symbol !== 'string' ||
        !asset.symbol ||
        asset.symbol.length > 128
    )
  )
    throw new Error('bots.errors.history');
  const interval = deps.requestIntervalMs ?? 220;
  if (!Number.isFinite(interval) || interval < 0 || interval > 5_000) throw new Error('bots.errors.history');
  const operation = new AbortController();
  const abort = () => operation.abort(deps.signal?.reason);
  deps.signal?.addEventListener('abort', abort, { once: true });
  if (deps.signal?.aborted) abort();
  const deadline = setTimeout(
    () => operation.abort(new DOMException('Archive history timed out', 'TimeoutError')),
    120_000
  );
  let lastRequestAt = 0;
  let requests = 0;
  const timeKey = prefix('Timestamp', 'Now');
  const denomKey = prefix('Denomination', 'Denominator');

  /** Respect cancellation while spacing sequential batches to avoid flooding the archive. */
  const wait = async (milliseconds: number): Promise<void> => {
    operation.signal.throwIfAborted();
    if (milliseconds <= 0) return;
    await new Promise<void>((resolve, reject) => {
      const cancel = () => {
        clearTimeout(timer);
        reject(operation.signal.reason);
      };
      const timer = setTimeout(() => {
        operation.signal.removeEventListener('abort', cancel);
        resolve();
      }, milliseconds);
      operation.signal.addEventListener('abort', cancel, { once: true });
    });
  };

  /** Bound body bytes while reading, instead of trusting a missing or dishonest Content-Length. */
  const body = async (response: Response): Promise<unknown> => {
    const declared = response.headers.get('content-length');
    if (!response.ok || (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_RESPONSE_BYTES)))
      throw new Error('bots.errors.history');
    if (!response.body) throw new Error('bots.errors.history');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        operation.signal.throwIfAborted();
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > MAX_RESPONSE_BYTES) throw new Error('bots.errors.history');
        chunks.push(chunk.value);
      }
    } catch (error) {
      await reader.cancel().catch(() => undefined);
      throw error;
    } finally {
      reader.releaseLock();
    }
    const joined = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      joined.set(chunk, offset);
      offset += chunk.length;
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(joined)) as unknown;
  };

  /** Serialize bounded JSON-RPC batches and match responses by unique request ID. */
  const rpc = async (calls: RpcCall[]): Promise<unknown[]> => {
    if (!calls.length || calls.length > MAX_BATCH || ++requests > MAX_REQUESTS) throw new Error('bots.errors.history');
    await wait(lastRequestAt + interval - now());
    operation.signal.throwIfAborted();
    lastRequestAt = now();
    const timeout = setTimeout(
      () => operation.abort(new DOMException('Archive request timed out', 'TimeoutError')),
      15_000
    );
    try {
      const payload = calls.map(([method, params], index) => ({ jsonrpc: '2.0', id: index + 1, method, params }));
      const result = await body(
        await fetcher(ARCHIVE, {
          method: 'POST',
          credentials: 'omit',
          redirect: 'error',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          signal: operation.signal,
        })
      );
      if (!Array.isArray(result) || result.length !== calls.length) throw new Error('bots.errors.history');
      const ids = new Set(result.map((row) => row?.id));
      if (ids.size !== calls.length) throw new Error('bots.errors.history');
      return payload.map(({ id }) => {
        const row = result.find((entry) => entry?.id === id);
        if (!row || row.jsonrpc !== '2.0' || row.error || !Object.prototype.hasOwnProperty.call(row, 'result'))
          throw new Error('bots.errors.history');
        return row.result as unknown;
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    const [genesis, finalizedHash] = await rpc([
      ['chain_getBlockHash', [0]],
      ['chain_getFinalizedHead', []],
    ]);
    if (genesis !== GENESIS || typeof finalizedHash !== 'string' || !HASH.test(finalizedHash))
      throw new Error('bots.errors.history');
    const [header] = await rpc([['chain_getHeader', [finalizedHash]]]);
    if (
      !header ||
      typeof header !== 'object' ||
      !('number' in header) ||
      typeof header.number !== 'string' ||
      !/^0x[0-9a-f]{1,14}$/.test(header.number)
    )
      throw new Error('bots.errors.history');
    const height = safeNumber(BigInt(header.number).toString());
    if (height < 2) throw new Error('bots.errors.history');
    const [finalizedValues] = await rpc([['state_queryStorageAt', [[timeKey, denomKey], finalizedHash]]]);
    const finalizedState = storage(finalizedValues, finalizedHash, [timeKey, denomKey]);
    const upper: BlockTime = {
      height,
      hash: finalizedHash,
      timestamp: safeNumber(unsigned(finalizedState.get(timeKey), 8)),
    };
    if (
      upper.timestamp < endAt ||
      upper.timestamp > now() ||
      now() - upper.timestamp > 2 * HOUR ||
      unsigned(finalizedState.get(denomKey), 16) !== currentDenominator
    )
      throw new Error('bots.errors.history');
    const states = new Map<number, BlockTime>([[height, upper]]);

    /** Read only timestamps during boundary search, with a per-call immutable state cache. */
    const readTimes = async (heights: number[]): Promise<void> => {
      const missing = [...new Set(heights)].filter((item) => !states.has(item));
      if (missing.some((item) => !Number.isSafeInteger(item) || item < 1 || item > height))
        throw new Error('bots.errors.history');
      for (let offset = 0; offset < missing.length; offset += MAX_BATCH) {
        const chunk = missing.slice(offset, offset + MAX_BATCH);
        const hashes = await rpc(chunk.map((item) => ['chain_getBlockHash', [item]]));
        if (hashes.some((hash) => typeof hash !== 'string' || !HASH.test(hash))) throw new Error('bots.errors.history');
        const values = await rpc(hashes.map((hash) => ['state_queryStorageAt', [[timeKey], hash]]));
        values.forEach((value, index) => {
          const hash = hashes[index] as string;
          const timestamp = safeNumber(unsigned(storage(value, hash, [timeKey]).get(timeKey), 8));
          if (timestamp > upper.timestamp) throw new Error('bots.errors.history');
          states.set(chunk[index], { height: chunk[index], hash, timestamp });
        });
      }
      const ordered = [...states.values()].sort((left, right) => left.height - right.height);
      if (ordered.some((state, index) => index > 0 && state.timestamp < ordered[index - 1].timestamp))
        throw new Error('bots.errors.history');
    };

    let lower = upper;
    let distance = Math.max(32, Math.ceil((upper.timestamp - startAt) / 6_000) * 2);
    for (let attempt = 0; lower.timestamp >= startAt + HOUR && attempt < 24; attempt++) {
      const candidate = Math.max(1, height - distance);
      await readTimes([candidate]);
      lower = states.get(candidate)!;
      if (candidate === 1 && lower.timestamp >= startAt + HOUR) throw new Error('bots.errors.history');
      distance *= 2;
    }
    if (lower.timestamp >= startAt + HOUR) throw new Error('bots.errors.history');
    const hours = Array.from({ length: (endAt - startAt) / HOUR }, (_, index) => startAt + (index + 1) * HOUR);
    const boundaries = new Map<number, { before: BlockTime; after: BlockTime }>();
    for (let round = 0; boundaries.size < hours.length && round < 40; round++) {
      const probes: number[] = [];
      const ordered = [...states.values()].sort((left, right) => left.height - right.height);
      for (const target of hours) {
        if (boundaries.has(target)) continue;
        let low = lower;
        let high = upper;
        for (const state of ordered) {
          if (state.timestamp < target && state.height > low.height) low = state;
          if (state.timestamp >= target && state.height < high.height) high = state;
        }
        if (high.height - low.height === 1) {
          boundaries.set(target, { before: low, after: high });
          continue;
        }
        // Timestamp interpolation locates a block only; prices always come from its actual reserves.
        const ratio = (target - low.timestamp) / (high.timestamp - low.timestamp);
        const interpolated = low.height + Math.floor(ratio * (high.height - low.height));
        const candidate = Math.max(
          low.height,
          Math.min(high.height - 1, round % 6 === 5 ? Math.floor((low.height + high.height) / 2) : interpolated)
        );
        probes.push(candidate, candidate + 1);
      }
      if (probes.length) await readTimes(probes);
    }
    if (boundaries.size !== hours.length) throw new Error('bots.errors.history');
    const concat = (address: string) => blake2AsHex(address, 128).slice(2) + address.slice(2);
    const infoKey = (asset: BotAsset) =>
      prefix('Assets', 'AssetInfosV2') + xxhashAsHex(asset.address, 64).slice(2) + asset.address.slice(2);
    const poolKey = (asset: BotAsset) => prefix('PoolXYK', 'Reserves') + concat(XOR.address) + concat(asset.address);
    const poolAssets = assets.filter((asset) => asset.address !== XOR.address);
    const keys = [timeKey, denomKey, ...assets.map(infoKey), ...poolAssets.map(poolKey)];
    const observations = new Map<
      number,
      { denominator: string; metadata: Record<string, unknown>; pools: Record<string, [string, string]> }
    >();
    const closes = [...new Map([...boundaries.values()].map(({ before }) => [before.height, before])).values()];
    for (let offset = 0; offset < closes.length; offset += MAX_BATCH) {
      const chunk = closes.slice(offset, offset + MAX_BATCH);
      const values = await rpc(chunk.map((state) => ['state_queryStorageAt', [keys, state.hash]]));
      values.forEach((value, index) => {
        const state = chunk[index];
        const entries = storage(value, state.hash, keys);
        if (safeNumber(unsigned(entries.get(timeKey), 8)) !== state.timestamp) throw new Error('bots.errors.history');
        const observation = {
          denominator: unsigned(entries.get(denomKey), 16),
          metadata: {} as Record<string, unknown>,
          pools: {} as Record<string, [string, string]>,
        };
        if (observation.denominator === '0') throw new Error('bots.errors.history');
        for (const asset of assets) observation.metadata[asset.address] = metadata(entries.get(infoKey(asset)));
        for (const asset of poolAssets) {
          const raw = entries.get(poolKey(asset));
          if (raw === null) continue;
          if (typeof raw !== 'string' || !/^0x[0-9a-f]{64}$/.test(raw)) throw new Error('bots.errors.history');
          observation.pools[asset.address] = [unsigned(raw.slice(0, 34), 16), unsigned(`0x${raw.slice(34)}`, 16)];
        }
        observations.set(state.height, observation);
      });
    }
    operation.signal.throwIfAborted();
    return parseArchivedBotHistory(
      {
        version: 1,
        kind: 'sora-pool-reserves-hourly',
        genesisHash,
        archiveEndpoint: ARCHIVE,
        generatedAt: now(),
        startAt,
        endAt,
        finalized: upper,
        baseAsset: XOR.address,
        rows: hours.map((timestamp) => {
          const { before, after } = boundaries.get(timestamp)!;
          return {
            genesis: genesisHash,
            source: ARCHIVE,
            timestamp,
            blockHeight: before.height,
            blockHash: before.hash,
            stateTimestamp: before.timestamp,
            nextBlockHeight: after.height,
            nextBlockHash: after.hash,
            nextStateTimestamp: after.timestamp,
            ...observations.get(before.height)!,
            missing: before.timestamp < timestamp - HOUR,
          };
        }),
      },
      bot,
      options,
      now()
    );
  } finally {
    clearTimeout(deadline);
    deps.signal?.removeEventListener('abort', abort);
  }
}
