/** Read-only, resumable hourly reserve observations from the approved SORA archive. */
import { appendFileSync, existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blake2AsHex, xxhashAsHex } from '@polkadot/util-crypto';

export const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
export const ARCHIVE = 'https://mof2.sora.org/';
export const HOUR = 3_600_000;
export const START = Date.UTC(2026, 2, 1);
const HASH = /^0x[0-9a-f]{64}$/;
const storagePrefix = (pallet, item) => xxhashAsHex(pallet, 128) + xxhashAsHex(item, 128).slice(2);
const concatKey = (address) => blake2AsHex(address, 128).slice(2) + address.slice(2);
const asset = (code, symbol) => ({ address: `0x0200${code}${'0'.repeat(58)}`, symbol });
export const ASSETS = [
  asset('00', 'XOR'),
  asset('04', 'VAL'),
  asset('05', 'PSWAP'),
  asset('06', 'DAI'),
  asset('07', 'ETH'),
  asset('08', 'XSTUSD'),
  asset('09', 'XST'),
];
const TIME_KEY = storagePrefix('Timestamp', 'Now');
const DENOM_KEY = storagePrefix('Denomination', 'Denominator');
const POOL_KEYS = ASSETS.slice(1).map(
  (value) => storagePrefix('PoolXYK', 'Reserves') + concatKey(ASSETS[0].address) + concatKey(value.address)
);
const INFO_KEYS = ASSETS.map(
  (value) => storagePrefix('Assets', 'AssetInfosV2') + xxhashAsHex(value.address, 64).slice(2) + value.address.slice(2)
);
const KEYS = [TIME_KEY, DENOM_KEY, ...POOL_KEYS, ...INFO_KEYS];

/** Decode unsigned SCALE little-endian bytes without floating-point token math. */
export function decodeUnsigned(raw, bytes) {
  if (typeof raw !== 'string' || !new RegExp(`^0x[0-9a-f]{${bytes * 2}}$`).test(raw))
    throw new Error('Malformed unsigned storage');
  return BigInt(`0x${raw.slice(2).match(/../g).reverse().join('')}`).toString();
}

/** Read the two bounded SCALE byte strings preceding chain asset precision. */
export function decodeAssetMetadata(raw) {
  if (typeof raw !== 'string' || !/^0x(?:[0-9a-f]{2})+$/.test(raw)) return null;
  const bytes = Buffer.from(raw.slice(2), 'hex');
  let offset = 0;
  const readText = () => {
    if (offset >= bytes.length) throw new Error('Missing SCALE string');
    const tag = bytes[offset++];
    const mode = tag & 3;
    let length;
    if (mode === 0) length = tag >> 2;
    else if (mode === 1 && offset < bytes.length) length = (tag + (bytes[offset++] << 8)) >> 2;
    else throw new Error('Oversized asset metadata');
    if (length > 1024 || offset + length > bytes.length) throw new Error('Invalid asset metadata length');
    const value = bytes.subarray(offset, offset + length).toString('utf8');
    offset += length;
    return value;
  };
  const symbol = readText();
  readText();
  if (offset >= bytes.length || bytes[offset] > 36) throw new Error('Unsupported asset precision');
  return { symbol, decimals: bytes[offset] };
}

/**
 * Locate the exact final block before an hourly boundary, retaining a next-block proof.
 * Estimate heights initially, then bisect so long block delays cannot stall extraction.
 */
export async function locateClose(target, lower, upper, readStates) {
  if (
    !Number.isSafeInteger(lower.height) ||
    !Number.isSafeInteger(upper.height) ||
    lower.height < 0 ||
    lower.height >= upper.height ||
    !(lower.timestamp < target && upper.timestamp >= target)
  )
    throw new Error('Unbracketed hour');
  let low = lower;
  let high = upper;
  const interpolationAttempts = 4;
  const maxAttempts = interpolationAttempts + Math.ceil(Math.log2(high.height - low.height));
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (high.height === low.height + 1) return { before: low, after: high };
    const estimated =
      low.height +
      Math.floor(
        attempt >= interpolationAttempts
          ? (high.height - low.height) / 2
          : attempt === 0 && target - low.timestamp <= 24 * HOUR
            ? (target - low.timestamp) / 6000
            : ((target - low.timestamp) / (high.timestamp - low.timestamp)) * (high.height - low.height)
      );
    const height = Math.max(low.height, Math.min(high.height - 1, estimated));
    const [before, after] = await readStates([height, height + 1]);
    if (before.timestamp < target && after.timestamp >= target) return { before, after };
    if (after.timestamp < target) low = after;
    else high = before;
  }
  throw new Error(`Hour search did not converge: ${new Date(target).toISOString()}`);
}

/** Extract immutable observations only; no node/indexer configuration or transaction is changed. */
export async function extractArchiveHistory({
  endAt = Math.floor(Date.now() / HOUR) * HOUR,
  batchHours = 12,
  output = 'public/bot-history/sora-mainnet-hourly-2026-03-01.json',
  cache = 'output/bot-history/archive-hours.jsonl',
} = {}) {
  if (
    !Number.isSafeInteger(endAt) ||
    endAt <= START ||
    endAt > Date.now() ||
    (endAt - START) / HOUR > 10000 ||
    endAt % HOUR
  )
    throw new Error('Invalid extraction period');
  if (!Number.isSafeInteger(batchHours) || batchHours < 1 || batchHours > 16) throw new Error('Invalid batch size');
  const outputPath = resolve(output);
  const cachePath = resolve(cache);
  mkdirSync(dirname(outputPath), { recursive: true });
  mkdirSync(dirname(cachePath), { recursive: true });
  let requests = 0;
  let lastRequest = 0;
  let queue = Promise.resolve();
  const rpcBatch = async (calls) => {
    const result = queue.then(async () => {
      const wait = 220 - (Date.now() - lastRequest);
      if (wait > 0) await new Promise((resolveWait) => setTimeout(resolveWait, wait));
      lastRequest = Date.now();
      const payload = calls.map(([method, params], index) => ({ jsonrpc: '2.0', id: index + 1, method, params }));
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          requests++;
          const response = await fetch(ARCHIVE, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(30000),
          });
          if (!response.ok) throw new Error(`Archive HTTP ${response.status}`);
          const rows = await response.json();
          if (!Array.isArray(rows) || rows.length !== calls.length) throw new Error('Incomplete JSON-RPC batch');
          return payload.map(({ id }) => {
            const row = rows.find((value) => value.id === id);
            if (!row || row.error) throw new Error(`Archive RPC: ${row?.error?.message ?? 'missing response'}`);
            return row.result;
          });
        } catch (error) {
          if (attempt === 3) throw error;
          await new Promise((resolveWait) => setTimeout(resolveWait, 750 * 2 ** attempt));
        }
      }
    });
    queue = result.catch(() => undefined);
    return result;
  };
  const [genesis, finalizedHash] = await rpcBatch([
    ['chain_getBlockHash', [0]],
    ['chain_getFinalizedHead', []],
  ]);
  if (genesis !== GENESIS || !HASH.test(finalizedHash)) throw new Error('Archive mainnet identity mismatch');
  const [header] = await rpcBatch([['chain_getHeader', [finalizedHash]]]);
  const finalizedHeight = Number.parseInt(header.number, 16);
  const states = new Map();
  // Microtask batching lets independent hourly searches share bounded RPC batches.
  const pending = new Map();
  let scheduled = false;
  const flushStates = async () => {
    scheduled = false;
    const jobs = [...pending.entries()];
    pending.clear();
    try {
      for (let offset = 0; offset < jobs.length; offset += 32) {
        const chunk = jobs.slice(offset, offset + 32);
        const hashes = await rpcBatch(chunk.map(([height]) => ['chain_getBlockHash', [height]]));
        if (hashes.some((hash) => !HASH.test(hash))) throw new Error('Missing historical block hash');
        const values = await rpcBatch(hashes.map((hash) => ['state_queryStorageAt', [KEYS, hash]]));
        values.forEach((changes, index) => {
          const [height, job] = chunk[index];
          if (!Array.isArray(changes) || changes.length !== 1 || changes[0].block !== hashes[index])
            throw new Error('Historical state hash mismatch');
          const storage = new Map(changes[0].changes);
          const value = {
            height,
            hash: hashes[index],
            timestamp: Number(decodeUnsigned(storage.get(TIME_KEY), 8)),
            denominator: decodeUnsigned(storage.get(DENOM_KEY), 16),
            pools: {},
            metadata: {},
          };
          ASSETS.forEach((assetInfo, assetIndex) => {
            value.metadata[assetInfo.address] = decodeAssetMetadata(storage.get(INFO_KEYS[assetIndex]));
          });
          POOL_KEYS.forEach((key, poolIndex) => {
            const raw = storage.get(key);
            if (raw === null) return;
            if (!/^0x[0-9a-f]{64}$/.test(raw)) throw new Error('Malformed reserve tuple');
            value.pools[ASSETS[poolIndex + 1].address] = [
              decodeUnsigned(raw.slice(0, 34), 16),
              decodeUnsigned(`0x${raw.slice(34)}`, 16),
            ];
          });
          states.set(height, value);
          job.resolve(value);
        });
      }
    } catch (error) {
      for (const [, job] of jobs) job.reject(error);
    }
  };
  const readState = (height) => {
    if (states.has(height)) return Promise.resolve(states.get(height));
    if (pending.has(height)) return pending.get(height).promise;
    let resolveState, rejectState;
    const promise = new Promise((resolveValue, rejectValue) => {
      resolveState = resolveValue;
      rejectState = rejectValue;
    });
    pending.set(height, { promise, resolve: resolveState, reject: rejectState });
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(() => {
        void flushStates();
      });
    }
    return promise;
  };
  const readStates = (heights) => Promise.all(heights.map(readState));
  const [lower, upper] = await readStates([25_059_555, finalizedHeight]);
  if (
    lower.hash !== '0x959ac28650702a446bd3ad1963ed60a8aec4ec4f86b1cfe90c4564c38f831203' ||
    lower.timestamp >= START ||
    upper.timestamp < endAt
  )
    throw new Error('Historical anchor or finalized bound mismatch');
  const rows = new Map();
  if (existsSync(cachePath))
    for (const line of readFileSync(cachePath, 'utf8').trim().split('\n')) {
      if (!line) continue;
      const row = JSON.parse(line);
      if (
        row.genesis !== GENESIS ||
        row.source !== ARCHIVE ||
        !Number.isSafeInteger(row.timestamp) ||
        !HASH.test(row.blockHash)
      )
        throw new Error('Untrusted extraction cache');
      rows.set(row.timestamp, row);
    }
  const publish = () => {
    const dataset = {
      version: 1,
      kind: 'sora-pool-reserves-hourly',
      genesisHash: GENESIS,
      archiveEndpoint: ARCHIVE,
      generatedAt: Date.now(),
      startAt: START,
      endAt,
      finalized: { height: upper.height, hash: upper.hash, timestamp: upper.timestamp },
      baseAsset: ASSETS[0].address,
      assets: ASSETS,
      rows: [...rows.values()].filter((row) => row.timestamp <= endAt).sort((a, b) => a.timestamp - b.timestamp),
    };
    writeFileSync(`${outputPath}.tmp`, JSON.stringify(dataset));
    renameSync(`${outputPath}.tmp`, outputPath);
  };
  const hours = Array.from({ length: (endAt - START) / HOUR }, (_, index) => START + (index + 1) * HOUR).filter(
    (timestamp) => !rows.has(timestamp)
  );
  const started = Date.now();
  for (let offset = 0; offset < hours.length; offset += batchHours) {
    await Promise.all(
      hours.slice(offset, offset + batchHours).map(async (timestamp) => {
        let nearest = lower;
        for (const state of states.values())
          if (state.timestamp < timestamp && state.timestamp > nearest.timestamp) nearest = state;
        const { before, after } = await locateClose(timestamp, nearest, upper, readStates);
        const row = {
          genesis: GENESIS,
          source: ARCHIVE,
          timestamp,
          blockHeight: before.height,
          blockHash: before.hash,
          stateTimestamp: before.timestamp,
          nextBlockHeight: after.height,
          nextBlockHash: after.hash,
          nextStateTimestamp: after.timestamp,
          denominator: before.denominator,
          pools: before.pools,
          metadata: before.metadata,
        };
        // A halted chain is a missing bucket, not a fabricated carried-forward observation.
        if (before.timestamp < timestamp - HOUR) row.missing = true;
        appendFileSync(cachePath, `${JSON.stringify(row)}\n`);
        rows.set(timestamp, row);
      })
    );
    publish();
    const done = Math.min(offset + batchHours, hours.length);
    const etaSeconds = Math.round((((Date.now() - started) / done) * (hours.length - done)) / 1000);
    console.log(
      JSON.stringify({
        completed: rows.size,
        total: (endAt - START) / HOUR,
        requests,
        elapsedSeconds: Math.round((Date.now() - started) / 1000),
        etaSeconds,
      })
    );
  }
  publish();
  return { output: outputPath, observations: rows.size, requests };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const endArg = process.argv.find((arg) => arg.startsWith('--end='))?.slice(6);
  extractArchiveHistory(endArg ? { endAt: Date.parse(endArg) } : {})
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
