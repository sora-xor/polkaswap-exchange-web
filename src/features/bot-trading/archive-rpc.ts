/** Bounded, read-only recovery of missing hourly observations from the approved archive. */
import { blake2AsHex, xxhashAsHex } from '@polkadot/util-crypto';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { parseArchivedBotHistory, type ArchiveHistoryOptions } from './archive-history';
import type { BotDefinition, BotHistory } from './types';

const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const ARCHIVE = 'https://mof2.sora.org/';
const ANCHOR_HEIGHT = 25_059_555;
const ANCHOR_HASH = '0x959ac28650702a446bd3ad1963ed60a8aec4ec4f86b1cfe90c4564c38f831203';
const START = Date.UTC(2026, 2, 1);
const HOUR = 3_600_000;
const HASH = /^0x[0-9a-f]{64}$/;
const MAX_BYTES = 512 * 1024;
type RpcCall = [method: string, params: unknown[]];
interface ArchiveRpcDependencies {
  fetch: typeof fetch;
  now: () => number;
}
interface BlockState {
  height: number;
  hash: string;
  timestamp: number;
}

/** Reject arrays and non-record JSON before inspecting untrusted archive responses. */
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Decode fixed-width unsigned SCALE values without floating-point reserve arithmetic. */
function unsigned(value: unknown, width: number): string {
  if (typeof value !== 'string' || !new RegExp(`^0x[0-9a-f]{${width * 2}}$`).test(value))
    throw new Error('bots.errors.history');
  let result = 0n;
  for (let index = width - 1; index >= 0; index--)
    result = (result << 8n) + BigInt(`0x${value.slice(2 + index * 2, 4 + index * 2)}`);
  return result.toString();
}

/** Read bounded SCALE asset strings and precision with browser-native byte decoding. */
function metadata(value: unknown): { symbol: string; decimals: number } | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^0x(?:[0-9a-f]{2})+$/.test(value) || value.length > 8194)
    throw new Error('bots.errors.history');
  const bytes = Uint8Array.from(value.slice(2).match(/../g)!, (byte) => Number.parseInt(byte, 16));
  let offset = 0;
  const readText = (): string => {
    if (offset >= bytes.length) throw new Error('bots.errors.history');
    const tag = bytes[offset++];
    const mode = tag & 3;
    let length: number;
    if (mode === 0) length = tag >> 2;
    else if (mode === 1 && offset < bytes.length) length = (tag + (bytes[offset++] << 8)) >> 2;
    else throw new Error('bots.errors.history');
    if (length > 1024 || offset + length > bytes.length) throw new Error('bots.errors.history');
    const result = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(offset, offset + length));
    offset += length;
    return result;
  };
  const symbol = readText();
  readText();
  if (offset >= bytes.length || bytes[offset] > 36) throw new Error('bots.errors.history');
  return { symbol, decimals: bytes[offset] };
}

/** Storage prefixes and hash-concatenated asset keys match the on-chain pallet layout. */
function storagePrefix(pallet: string, item: string): string {
  return xxhashAsHex(pallet, 128) + xxhashAsHex(item, 128).slice(2);
}

/** Verify every requested storage key appears exactly once at the requested block. */
function storageValues(value: unknown, hash: string, keys: string[]): Map<string, unknown> {
  if (!Array.isArray(value) || value.length !== 1 || !record(value[0]) || value[0].block !== hash)
    throw new Error('bots.errors.history');
  const changes = value[0].changes;
  if (!Array.isArray(changes) || changes.length !== keys.length) throw new Error('bots.errors.history');
  const values = new Map<string, unknown>();
  for (const change of changes) {
    if (!Array.isArray(change) || change.length !== 2 || !keys.includes(change[0]) || values.has(change[0]))
      throw new Error('bots.errors.history');
    values.set(change[0], change[1]);
  }
  return values;
}

/**
 * Repair only explicitly missing completed hours, using an adjacent finalized
 * block pair as boundary proof. Gaps caused by a halted chain remain missing;
 * historical prices are never replaced by a current quote or carried forward.
 */
export async function fetchMissingArchivedBotHistory(
  bot: BotDefinition,
  options: ArchiveHistoryOptions & { timestamps: number[] },
  deps: ArchiveRpcDependencies = { fetch: globalThis.fetch.bind(globalThis), now: Date.now }
): Promise<BotHistory> {
  const now = deps.now();
  const { timestamps, startAt, endAt } = options;
  const assets = [...new Map([XOR, bot.assetIn, bot.assetOut].map((asset) => [asset.address, asset])).values()];
  if (
    options.genesisHash !== GENESIS ||
    !/^[1-9]\d{0,119}$/.test(options.currentDenominator) ||
    !Number.isSafeInteger(startAt) ||
    !Number.isSafeInteger(endAt) ||
    startAt < START ||
    startAt % HOUR !== 0 ||
    endAt % HOUR !== 0 ||
    endAt <= startAt ||
    endAt > Math.floor(now / HOUR) * HOUR ||
    (endAt - startAt) / HOUR > 10000 ||
    !Array.isArray(timestamps) ||
    !timestamps.length ||
    timestamps.length > 24 ||
    new Set(timestamps).size !== timestamps.length ||
    timestamps.some(
      (timestamp) =>
        !Number.isSafeInteger(timestamp) || timestamp % HOUR !== 0 || timestamp <= startAt || timestamp > endAt
    ) ||
    assets.some(
      (asset) =>
        !HASH.test(asset.address) || !Number.isInteger(asset.decimals) || asset.decimals < 0 || asset.decimals > 36
    ) ||
    bot.assetIn.address === bot.assetOut.address ||
    bot.policy.feeAsset.address !== XOR.address ||
    bot.policy.feeAsset.decimals !== XOR.decimals
  )
    throw new Error('bots.errors.history');

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('bots.errors.history'));
    }, 30_000);
  });
  const execute = async (): Promise<BotHistory> => {
    let nextId = 1;
    /** Match unordered JSON-RPC responses by unique IDs, and bound every response body. */
    const rpc = async (calls: RpcCall[]): Promise<unknown[]> => {
      if (controller.signal.aborted || !calls.length || calls.length > 32) throw new Error('bots.errors.history');
      const payload = calls.map(([method, params]) => ({ jsonrpc: '2.0', id: nextId++, method, params }));
      const response = await deps.fetch(ARCHIVE, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
        credentials: 'omit',
        redirect: 'error',
      });
      if (!response.ok || Number(response.headers.get('content-length') || 0) > MAX_BYTES)
        throw new Error('bots.errors.history');
      const text = await response.text();
      if (controller.signal.aborted || text.length > MAX_BYTES) throw new Error('bots.errors.history');
      const rows: unknown = JSON.parse(text);
      if (!Array.isArray(rows) || rows.length !== payload.length) throw new Error('bots.errors.history');
      const byId = new Map<number, unknown>();
      for (const row of rows) {
        if (
          !record(row) ||
          row.jsonrpc !== '2.0' ||
          typeof row.id !== 'number' ||
          byId.has(row.id) ||
          'error' in row ||
          !('result' in row)
        )
          throw new Error('bots.errors.history');
        byId.set(row.id, row.result);
      }
      return payload.map(({ id }) => {
        if (!byId.has(id)) throw new Error('bots.errors.history');
        return byId.get(id);
      });
    };
    const timeKey = storagePrefix('Timestamp', 'Now');
    const denominatorKey = storagePrefix('Denomination', 'Denominator');
    const [genesis, finalizedHash] = await rpc([
      ['chain_getBlockHash', [0]],
      ['chain_getFinalizedHead', []],
    ]);
    if (genesis !== GENESIS || typeof finalizedHash !== 'string' || !HASH.test(finalizedHash))
      throw new Error('bots.errors.history');
    const [header] = await rpc([['chain_getHeader', [finalizedHash]]]);
    if (!record(header) || typeof header.number !== 'string' || !/^0x[0-9a-f]{1,8}$/.test(header.number))
      throw new Error('bots.errors.history');
    const finalizedHeight = Number.parseInt(header.number.slice(2), 16);
    if (finalizedHeight <= ANCHOR_HEIGHT) throw new Error('bots.errors.history');
    const states = new Map<number, BlockState>();
    /** Cache timestamp-only states; parallel hour searches share identical binary-search probes. */
    const readStates = async (heights: number[]): Promise<BlockState[]> => {
      const missing = [...new Set(heights)].filter((height) => !states.has(height));
      for (let offset = 0; offset < missing.length; offset += 32) {
        const chunk = missing.slice(offset, offset + 32);
        if (chunk.some((height) => !Number.isSafeInteger(height) || height < ANCHOR_HEIGHT || height > finalizedHeight))
          throw new Error('bots.errors.history');
        const hashes = await rpc(chunk.map((height) => ['chain_getBlockHash', [height]]));
        if (hashes.some((hash) => typeof hash !== 'string' || !HASH.test(hash))) throw new Error('bots.errors.history');
        const values = await rpc(hashes.map((hash) => ['state_queryStorageAt', [[timeKey], hash]]));
        values.forEach((value, index) => {
          const hash = hashes[index] as string;
          const timestamp = Number(unsigned(storageValues(value, hash, [timeKey]).get(timeKey), 8));
          if (!Number.isSafeInteger(timestamp) || timestamp < 0 || timestamp > now)
            throw new Error('bots.errors.history');
          states.set(chunk[index], { height: chunk[index], hash, timestamp });
        });
      }
      return heights.map((height) => states.get(height)!);
    };
    const [lower, upper] = await readStates([ANCHOR_HEIGHT, finalizedHeight]);
    if (
      lower.hash !== ANCHOR_HASH ||
      lower.timestamp >= START ||
      upper.hash !== finalizedHash ||
      upper.timestamp < endAt
    )
      throw new Error('bots.errors.history');
    const brackets = [...timestamps]
      .sort((a, b) => a - b)
      .map((timestamp) => ({ timestamp, before: lower, after: upper }));
    for (let round = 0; brackets.some(({ before, after }) => after.height - before.height > 1); round++) {
      if (round >= 32) throw new Error('bots.errors.history');
      const pending = brackets.filter(({ before, after }) => after.height - before.height > 1);
      const probes = await readStates(
        pending.map(({ before, after }) => before.height + Math.floor((after.height - before.height) / 2))
      );
      pending.forEach((bracket, index) => {
        const probe = probes[index];
        if (probe.timestamp < bracket.before.timestamp || probe.timestamp > bracket.after.timestamp)
          throw new Error('bots.errors.history');
        if (probe.timestamp < bracket.timestamp) bracket.before = probe;
        else bracket.after = probe;
      });
    }
    const poolAssets = assets.filter((asset) => asset.address !== XOR.address);
    const concat = (address: string) => blake2AsHex(address, 128).slice(2) + address.slice(2);
    const poolKeys = poolAssets.map(
      (asset) => storagePrefix('PoolXYK', 'Reserves') + concat(XOR.address) + concat(asset.address)
    );
    const infoKeys = assets.map(
      (asset) =>
        storagePrefix('Assets', 'AssetInfosV2') + xxhashAsHex(asset.address, 64).slice(2) + asset.address.slice(2)
    );
    const keys = [timeKey, denominatorKey, ...poolKeys, ...infoKeys];
    const values = await rpc(brackets.map(({ before }) => ['state_queryStorageAt', [keys, before.hash]]));
    const rows = brackets.map(({ timestamp, before, after }, index) => {
      const storage = storageValues(values[index], before.hash, keys);
      if (Number(unsigned(storage.get(timeKey), 8)) !== before.timestamp) throw new Error('bots.errors.history');
      const pools: Record<string, [string, string]> = {};
      poolAssets.forEach((asset, poolIndex) => {
        const raw = storage.get(poolKeys[poolIndex]);
        if (raw === null) return;
        if (typeof raw !== 'string' || !HASH.test(raw)) throw new Error('bots.errors.history');
        pools[asset.address] = [unsigned(raw.slice(0, 34), 16), unsigned(`0x${raw.slice(34)}`, 16)];
      });
      return {
        genesis: GENESIS,
        source: ARCHIVE,
        timestamp,
        blockHeight: before.height,
        blockHash: before.hash,
        stateTimestamp: before.timestamp,
        nextBlockHeight: after.height,
        nextBlockHash: after.hash,
        nextStateTimestamp: after.timestamp,
        denominator: unsigned(storage.get(denominatorKey), 16),
        pools,
        metadata: Object.fromEntries(
          assets.map((asset, assetIndex) => [asset.address, metadata(storage.get(infoKeys[assetIndex]))])
        ),
      };
    });
    return parseArchivedBotHistory(
      {
        version: 1,
        kind: 'sora-pool-reserves-hourly',
        genesisHash: GENESIS,
        archiveEndpoint: ARCHIVE,
        generatedAt: now,
        startAt,
        endAt,
        finalized: upper,
        baseAsset: XOR.address,
        rows,
      },
      bot,
      options,
      now
    );
  };
  try {
    return await Promise.race([execute(), timeout]);
  } catch {
    throw new Error('bots.errors.history');
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
