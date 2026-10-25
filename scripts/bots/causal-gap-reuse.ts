/** Receipt-only reuse of the frozen failed v1 study. No transport, clock rewriting or transaction authority. */
import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Metadata, TypeRegistry } from '@polkadot/types';
import {
  createHistoricalExecutionCodec,
  assertHistoricalFeeDetailsMatchesQueryInfo,
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from './historical-execution-codec';
import { createHistoricalExecutionPoolCodec } from './historical-execution-pool-codec';
import { prepareHistoricalGoalBoundFeeSource } from './historical-goal-bound-fee';
import { isExactInputQuoteWithinImpactLimit } from '../../src/features/bot-trading/quote-impact';
import {
  parseIndexedPoolHistoryWithEvidence,
  type IndexedPoolHistoryRow,
} from '../../src/features/bot-trading/pool-history';
import type { BotDefinition } from '../../src/features/bot-trading/types';
import type { HistoricalClockBlock } from './historical-execution-clock';
import type { HistoricalGoalMarketReader } from './historical-goal-market-reader';
import type { readGoalQualificationHistory } from './goal-qualification-history-reader';
import type { readHistoricalExecutionQuote } from './historical-execution-reader';
import type { readHistoricalGoalBoundFee } from './historical-goal-bound-fee-reader';

export const CAUSAL_GAP_PRIOR_REGISTRATION = 'c645e47f0d2c8d5004b85edc99490d6646388cb9808208d6f302fed35ace7c76';
const ENDPOINT = 'https://mof2.sora.org/';
const START = Date.parse('2026-06-30T19:00:00.000Z');
const HOUR = 3_600_000;
const DENOMINATOR = '100000000000000000000000000000000000000';
const CODE = '0x3a636f6465';
const HASH = /^0x[0-9a-f]{64}$/;
const SHA = /^[0-9a-f]{64}$/;
const MAX_FILES = 10_000,
  MAX_FILE = 32 * 1024 * 1024,
  MAX_TOTAL = 256 * 1024 * 1024;
type Json = Record<string, unknown>;
type Warmup = Awaited<ReturnType<typeof readGoalQualificationHistory>>;
type Market = Awaited<ReturnType<HistoricalGoalMarketReader['readMark']>>;
type Quote = Awaited<ReturnType<typeof readHistoricalExecutionQuote>>;
type Fee = Awaited<ReturnType<typeof readHistoricalGoalBoundFee>>;
/** Every original file is bound before reuse, including source snapshots, configuration and terminal failure. */
export interface CausalGapReuseManifest {
  kind: 'causal-gap-reuse-manifest-v1';
  priorRegistrationSha256: string;
  files: ReadonlyArray<{ path: string; bytes: number; sha256: string }>;
  sha256: string;
}
/** Original bytes/projection and immutable original provenance; this is never a new HTTP response. */
export interface CausalGapReuseHit<T> {
  value: T;
  files: readonly string[];
}
export interface CausalGapReuse {
  warmup(): CausalGapReuseHit<Warmup>;
  block(height: number): CausalGapReuseHit<HistoricalClockBlock> | undefined;
  market(height: number): CausalGapReuseHit<Market> | undefined;
  quote(key: string): CausalGapReuseHit<Quote> | undefined;
  boundFee(key: string): CausalGapReuseHit<Fee> | undefined;
}
/** RPC assertions and unkeyed local hashes establish internal consistency, not independent chain authenticity. */
export const CAUSAL_GAP_REUSE_LIMITATION =
  'Original unkeyed RPC receipts and local hashes are retained; no independent consensus proof or original browser arrival is established.';

function check(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(`causal-gap-reuse:${reason}`);
}
function object(value: unknown): Json {
  check(value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype, 'object');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  check(
    Reflect.ownKeys(descriptors).every(
      (key) => typeof key === 'string' && descriptors[key].enumerable && 'value' in descriptors[key]
    ),
    'accessor'
  );
  return value as Json;
}
function array(value: unknown, limit = 10_000): unknown[] {
  check(Array.isArray(value) && value.length <= limit, 'array');
  return value;
}
function number(value: unknown, minimum = 0): number {
  check(Number.isSafeInteger(value) && Number(value) >= minimum, 'integer');
  return value as number;
}
function hash(value: unknown): string {
  check(typeof value === 'string' && HASH.test(value), 'hash');
  return value;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(object(value)[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const same = (left: unknown, right: unknown) => canonical(left) === canonical(right);
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function pathName(value: unknown): string {
  check(
    typeof value === 'string' &&
      value.length < 1024 &&
      !value.startsWith('/') &&
      !value.includes('\\') &&
      value.split('/').every((part) => part && part !== '.' && part !== '..'),
    'path'
  );
  return value;
}
async function fileInventory(directory: string) {
  const root = resolve(directory);
  check((await realpath(root)) === root, 'directory-symlink');
  const files: { path: string; bytes: number; sha256: string }[] = [];
  let total = 0;
  const walk = async (prefix: string) => {
    for (const name of (await readdir(join(root, prefix))).sort()) {
      const path = pathName(prefix ? `${prefix}/${name}` : name),
        absolute = join(root, path),
        info = await lstat(absolute);
      check(!info.isSymbolicLink(), 'file-symlink');
      if (info.isDirectory()) {
        await walk(path);
        continue;
      }
      check(info.isFile() && info.size <= MAX_FILE && files.length < MAX_FILES, 'file-bound');
      const bytes = await readFile(absolute);
      total += bytes.length;
      check(bytes.length === info.size && total <= MAX_TOTAL, 'total-bound');
      files.push({ path, bytes: bytes.length, sha256: sha(bytes) });
    }
  };
  await walk('');
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
async function readJson(directory: string, path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(directory, pathName(path)), 'utf8'));
}
function priorRegistration(value: unknown): Json {
  const registration = object(value),
    body = object(registration.body);
  check(
    registration.sha256 === CAUSAL_GAP_PRIOR_REGISTRATION && sha(canonical(body)) === CAUSAL_GAP_PRIOR_REGISTRATION,
    'prior-registration'
  );
  check(body.kind === 'causal-goal-calibration-registration-v1', 'prior-kind');
  return body;
}
/** Register only original local bytes; no semantic projections or network reads happen here. */
export async function registerCausalGapReuse(priorDirectory: string): Promise<CausalGapReuseManifest> {
  const files = await fileInventory(priorDirectory);
  priorRegistration(await readJson(priorDirectory, 'registration.json'));
  const body = {
    kind: 'causal-gap-reuse-manifest-v1' as const,
    priorRegistrationSha256: CAUSAL_GAP_PRIOR_REGISTRATION,
    files,
  };
  return freeze({ ...body, sha256: sha(canonical(body)) });
}

/** Validate original transport bytes without manufacturing a response or replacing its original request id/time. */
function response(receiptValue: unknown, rpc = true): unknown {
  const receipt = object(receiptValue);
  check(
    receipt.httpStatus === 200 && !Object.hasOwn(receipt, 'failure') && !Object.hasOwn(receipt, 'responseBodyBase64'),
    'receipt-status'
  );
  check(
    typeof receipt.responseBody === 'string' &&
      Buffer.byteLength(receipt.responseBody) <= 4 * 1024 * 1024 &&
      sha(receipt.responseBody) === receipt.responseSha256,
    'response-digest'
  );
  const started = receipt.requestedAtMs === undefined ? Date.parse(String(receipt.requestedAt)) : receipt.requestedAtMs;
  const ended = receipt.completedAtMs === undefined ? Date.parse(String(receipt.completedAt)) : receipt.completedAtMs;
  check(number(ended) >= number(started), 'receipt-time');
  for (const key of ['complete', 'responseComplete'])
    if (Object.hasOwn(receipt, key)) check(receipt[key] === true, 'partial-response');
  for (const key of ['bytes', 'responseBytes', 'retainedBytes'])
    if (Object.hasOwn(receipt, key)) check(receipt[key] === Buffer.byteLength(receipt.responseBody), 'response-size');
  const body = object(JSON.parse(receipt.responseBody));
  if (!rpc) return body;
  check(
    body.jsonrpc === '2.0' && body.id === receipt.id && !Object.hasOwn(body, 'error') && Object.hasOwn(body, 'result'),
    'rpc-response'
  );
  return body.result;
}
function rpcCursor(receipts: unknown[]) {
  let cursor = 0;
  return {
    take(method: string, params: unknown[]): unknown {
      const item = object(receipts[cursor]);
      check(item.id === cursor + 1 && item.method === method && same(item.params, params), 'rpc-request');
      cursor++;
      return response(item);
    },
    peek() {
      return cursor < receipts.length ? object(receipts[cursor]) : undefined;
    },
    done() {
      check(cursor === receipts.length, 'extra-rpc');
    },
    index() {
      return cursor;
    },
  };
}
function header(value: unknown) {
  const row = object(value);
  check(typeof row.number === 'string' && /^0x[0-9a-f]+$/.test(row.number), 'header-number');
  const height = number(Number(BigInt(row.number)), 1);
  hash(row.stateRoot);
  hash(row.extrinsicsRoot);
  check(
    array(object(row.digest).logs, 128).every(
      (item) => typeof item === 'string' && /^0x(?:[0-9a-fA-F]{2})*$/.test(item) && item.length <= 65538
    ),
    'header-digest'
  );
  return { height, parentHash: hash(row.parentHash) };
}
function runtime(value: unknown) {
  const row = object(value);
  check(
    row.specName === 'sora-substrate' &&
      [130, 131].includes(number(row.specVersion)) &&
      row.transactionVersion === row.specVersion,
    'runtime'
  );
  return { specVersion: number(row.specVersion), transactionVersion: number(row.transactionVersion) };
}
function time(value: unknown): number {
  check(typeof value === 'string' && /^0x[0-9a-fA-F]{16}$/.test(value), 'timestamp-scale');
  const n = Buffer.from(value.slice(2), 'hex').readBigUInt64LE();
  check(n > 0n && n <= BigInt(Number.MAX_SAFE_INTEGER), 'timestamp-range');
  return Number(n);
}
function amount(value: unknown, positive = true): string {
  check(
    typeof value === 'string' &&
      /^(0|[1-9]\d{0,38})$/.test(value) &&
      BigInt(value) <= (1n << 128n) - 1n &&
      (!positive || BigInt(value) > 0n),
    'amount'
  );
  return value;
}
function hit<T>(value: T, files: string[]): CausalGapReuseHit<T> {
  return freeze({ value, files: [...new Set(files)].sort() });
}

/** Pure synthetic-test seam: validate an original market shard without granting registration or qualification authority. */
export function verifyCausalGapMarketShard(
  sourceValue: unknown,
  contextValue: unknown,
  blockReceipts: unknown[],
  storageReceipts: unknown[]
) {
  const source = object(sourceValue),
    context = object(contextValue),
    finalized = object(source.finalizedSource),
    anchor = object(source.schemaAnchor);
  const cursor = rpcCursor(blockReceipts);
  const seenHeaders = new Map<string, unknown>();
  const readHeader = (blockHash: unknown) => {
    const key = hash(blockHash),
      raw = cursor.take('chain_getHeader', [key]),
      previous = seenHeaders.get(key);
    check(previous === undefined || same(previous, raw), 'changed-header');
    seenHeaders.set(key, raw);
    return header(raw);
  };
  check(cursor.take('chain_getBlockHash', [0]) === GENESIS, 'genesis');
  const finalHash = hash(cursor.take('chain_getFinalizedHead', [])),
    finalHeader = readHeader(finalHash);
  check(
    finalHeader.height >= number(finalized.height, 1) &&
      cursor.take('chain_getBlockHash', [finalized.height]) === finalized.hash,
    'finalized-source'
  );
  check(readHeader(finalized.hash).height === finalized.height, 'finalized-header');
  check(
    cursor.take('chain_getBlockHash', [anchor.height]) === anchor.hash &&
      readHeader(anchor.hash).height === anchor.height,
    'schema-anchor'
  );
  const version = runtime(cursor.take('state_getRuntimeVersion', [anchor.hash]));
  const codeHash = hash(cursor.take('state_getStorageHash', [CODE, anchor.hash]));
  const metadataHex = cursor.take('state_getMetadata', [anchor.hash]);
  check(typeof metadataHex === 'string', 'metadata');
  const identity = { genesisHash: GENESIS, blockHash: hash(anchor.hash), metadataHex, runtimeVersion: version };
  const base = createHistoricalExecutionPoolCodec(identity),
    keys = base.storageKeys();
  const metadata = new Metadata(new TypeRegistry(), Buffer.from(metadataHex.slice(2), 'hex'));
  const timestampPallets = metadata.asV14.pallets.filter((pallet) => pallet.name.toString() === 'Timestamp');
  check(timestampPallets.length === 1 && timestampPallets[0].storage.isSome, 'timestamp-metadata');
  const timestampEntries = timestampPallets[0].storage
    .unwrap()
    .items.filter((entry) => entry.name.toString() === 'Now');
  check(timestampEntries.length === 1 && timestampEntries[0].type.isPlain, 'timestamp-layout');
  const timestampTypes = metadata.asV14.lookup.types.filter((entry) => entry.id.eq(timestampEntries[0].type.asPlain));
  check(
    timestampTypes.length === 1 &&
      timestampTypes[0].type.def.isPrimitive &&
      timestampTypes[0].type.def.asPrimitive.toString() === 'U64',
    'timestamp-unit'
  );
  check(
    same(context, {
      endpoint: ENDPOINT,
      genesisHash: GENESIS,
      ...source,
      finalizedObservation: { kind: 'rpc-canonical-finalized', hash: finalHash, height: finalHeader.height },
      schema: {
        key: keys.timestamp,
        type: 'u64',
        unit: 'milliseconds',
        metadataSha256: base.binding.metadataSha256,
        codeHash,
        runtimeVersion: { specName: 'sora-substrate', ...version },
      },
      observedFill: false,
      expectedDenominator: DENOMINATOR,
      maximumBlockReads: 64,
      maximumMarkReads: 64,
      maximumStorageResponseBytes: 131072,
      maximumStorageTotalBytes: 8388608,
      transactionSubmitted: false,
      protocol: 'historical-goal-market-shard-v1-development',
    }),
    'shard-context'
  );
  const blocks = new Map<number, { block: HistoricalClockBlock; receiptIndexes: number[] }>();
  while (cursor.peek()) {
    const start = cursor.index(),
      params = array(cursor.peek()!.params),
      height = number(params[0], 1);
    check(
      params.length === 1 && height <= number(finalized.height) && !blocks.has(height) && blocks.size < 64,
      'block-height'
    );
    const blockHash = hash(cursor.take('chain_getBlockHash', [height]));
    if (height === anchor.height) check(blockHash === anchor.hash, 'anchor-block');
    if (height === finalized.height) check(blockHash === finalized.hash, 'finalized-block');
    const found = readHeader(blockHash);
    check(
      found.height === height &&
        found.parentHash !== blockHash &&
        cursor.take('state_getStorageHash', [CODE, blockHash]) === codeHash,
      'block-code-or-header'
    );
    const timestampMs = time(cursor.take('state_getStorage', [keys.timestamp, blockHash]));
    blocks.set(height, {
      block: { hash: blockHash, ...found, timestampMs },
      receiptIndexes: [start, start + 1, start + 2, start + 3],
    });
  }
  cursor.done();
  const markets = new Map<number, { value: Market; storageIndex: number }>();
  for (const [index, raw] of storageReceipts.entries()) {
    const row = object(raw),
      matching = [...blocks.values()].filter(({ block }) => block.hash === row.blockHash);
    check(
      index < 64 &&
        row.id === index + 1 &&
        row.method === 'state_queryStorageAt' &&
        same(row.keys, Object.values(keys)) &&
        matching.length === 1,
      'storage-request'
    );
    const block = matching[0].block,
      result = array(response(row));
    check(result.length === 1, 'storage-sets');
    const set = object(result[0]),
      changes = array(set.changes);
    check(set.block === block.hash && changes.length === 7 && Object.keys(set).length === 2, 'storage-set');
    const values = new Map<string, unknown>();
    for (const value of changes) {
      const pair = array(value);
      check(
        pair.length === 2 &&
          typeof pair[0] === 'string' &&
          Object.values(keys).includes(pair[0]) &&
          !values.has(pair[0]),
        'storage-key'
      );
      check(
        pair[1] === null || (typeof pair[1] === 'string' && /^0x(?:[0-9a-fA-F]{2})*$/.test(pair[1])),
        'storage-value'
      );
      values.set(pair[0], pair[1]);
    }
    const decoded = base.decodeStorage(
      Object.fromEntries(Object.entries(keys).map(([label, key]) => [label, values.get(key)]))
    );
    // Each block's code hash was checked against this metadata. Reuse only the decoder;
    // the observation binding remains that block's original hash, timestamp and storage bytes.
    const poolEvidence = { ...decoded, binding: { ...decoded.binding, blockHash: block.hash } };
    check(
      poolEvidence.state.timestampMs === block.timestampMs &&
        poolEvidence.state.denominator === DENOMINATOR &&
        !markets.has(block.height),
      'pool-state'
    );
    const value: Market = {
      block,
      poolEvidence,
      ...(poolEvidence.status === 'present'
        ? {
            mark: {
              timestampMs: block.timestampMs,
              blockHash: block.hash,
              kusdReserveCodec: poolEvidence.reserves.kusdCodec,
              xorReserveCodec: poolEvidence.reserves.xorCodec,
            },
          }
        : {}),
    };
    markets.set(block.height, { value: freeze(value), storageIndex: index });
  }
  return { blocks, markets };
}

/** Recompute the fixed original warmup from its two raw pages, preserving their original receipts. */
export function verifyCausalGapWarmup(value: unknown): Warmup {
  const raw = object(value),
    evidence = array(raw.rpcEvidence, 2),
    rows = new Map<string, IndexedPoolHistoryRow[]>();
  check(evidence.length === 2, 'warmup-receipts');
  const query =
    'query GoalQualificationPoolHistory($filter:AssetSnapshotFilter!,$after:Cursor){assetSnapshots(first:100,after:$after,orderBy:[TIMESTAMP_ASC],filter:$filter){pageInfo{hasNextPage endCursor}edges{node{id assetId type timestamp denominator closeEvidence}}}}';
  for (const [index, asset] of [KUSD, XOR].entries()) {
    const receipt = object(evidence[index]);
    check(
      receipt.index === index &&
        receipt.assetId === asset &&
        receipt.page === 0 &&
        typeof receipt.requestBody === 'string',
      'warmup-request'
    );
    check(
      same(JSON.parse(receipt.requestBody), {
        query,
        variables: {
          filter: {
            assetId: { equalTo: asset },
            type: { equalTo: 'HOUR' },
            timestamp: { greaterThanOrEqualTo: (START - 13 * HOUR) / 1000, lessThan: (START - HOUR) / 1000 },
          },
          after: null,
        },
      }),
      'warmup-scope'
    );
    const body = object(response(receipt, false));
    check(!Object.hasOwn(body, 'errors'), 'warmup-errors');
    const page = object(object(body.data).assetSnapshots),
      edges = array(page.edges, 12);
    check(edges.length === 12 && object(page.pageInfo).hasNextPage === false, 'warmup-page');
    const selected = edges.map((edge, i) => {
      const row = object(object(edge).node),
        timestamp = number(row.timestamp);
      check(
        row.assetId === asset &&
          row.type === 'HOUR' &&
          timestamp >= (START + (i - 13) * HOUR) / 1000 &&
          timestamp < (START + (i - 12) * HOUR) / 1000 &&
          row.id === `asset-${asset}-HOUR-${Math.floor(timestamp / 3600) * 3600}`,
        'warmup-row'
      );
      return row as unknown as IndexedPoolHistoryRow;
    });
    rows.set(asset, selected);
  }
  const bot = {
    assetIn: { address: KUSD, symbol: 'KUSD', decimals: 18 },
    assetOut: { address: XOR, symbol: 'XOR', decimals: 18 },
    policy: { feeAsset: { address: XOR, symbol: 'XOR', decimals: 18 } },
  } as BotDefinition;
  const history = parseIndexedPoolHistoryWithEvidence(rows, bot, {
    startAt: START - 13 * HOUR,
    endAt: START - HOUR,
    genesisHash: GENESIS,
    denominator: DENOMINATOR,
  });
  check(
    history.history.missing === 0 &&
      history.history.candles.length === 12 &&
      history.boundaries.length === 12 &&
      history.history.denominationVerified &&
      same(history, raw.history),
    'warmup-projection'
  );
  return freeze(value as Warmup);
}

/** Rebuild quote and optional bound fee entirely from their original RPC bytes; no execution-clock admission here. */
export function verifyCausalGapQuote(
  key: string,
  value: unknown,
  feeValue: unknown | undefined,
  finalizedSource: unknown
) {
  const raw = object(value),
    request = object(raw.request),
    block = object(request.block),
    receipts = array(raw.rpcEvidence, 32),
    rpc = rpcCursor(receipts);
  check(
    SHA.test(key) &&
      sha(canonical(request)) === key &&
      same(request.finalizedSource, finalizedSource) &&
      request.expectedDenominator === DENOMINATOR &&
      Object.keys(request).length === 6,
    'quote-key'
  );
  const blockHash = hash(block.hash),
    height = number(block.height, 1),
    finalized = object(finalizedSource);
  check(height <= number(finalized.height) && Object.keys(block).length === 2, 'quote-height');
  check(
    (request.assetIn === KUSD && request.assetOut === XOR) || (request.assetIn === XOR && request.assetOut === KUSD),
    'quote-assets'
  );
  amount(request.amountInCodec);
  check(rpc.take('chain_getBlockHash', [0]) === GENESIS, 'quote-genesis');
  const finalHash = hash(rpc.take('chain_getFinalizedHead', [])),
    finalHeader = header(rpc.take('chain_getHeader', [finalHash]));
  check(
    finalHeader.height >= number(finalized.height) &&
      rpc.take('chain_getBlockHash', [finalized.height]) === finalized.hash &&
      rpc.take('chain_getBlockHash', [height]) === blockHash,
    'quote-finality'
  );
  const at = header(rpc.take('chain_getHeader', [blockHash])),
    parent = header(rpc.take('chain_getHeader', [at.parentHash]));
  check(at.height === height && parent.height + 1 === height, 'quote-parent');
  const versionRaw = rpc.take('state_getRuntimeVersion', [blockHash]),
    parentVersion = rpc.take('state_getRuntimeVersion', [at.parentHash]),
    version = runtime(versionRaw);
  check(same(versionRaw, parentVersion), 'quote-runtime-change');
  check(
    array(object(versionRaw).apis, 256).every((entry) => {
      const api = array(entry, 2);
      return (
        api.length === 2 &&
        typeof api[0] === 'string' &&
        /^0x[0-9a-f]{16}$/.test(api[0]) &&
        number(api[1]) <= 0xffffffff
      );
    }),
    'quote-runtime-apis'
  );
  const metadataHex = rpc.take('state_getMetadata', [blockHash]),
    parentMetadata = rpc.take('state_getMetadata', [at.parentHash]);
  check(
    typeof metadataHex === 'string' &&
      typeof parentMetadata === 'string' &&
      metadataHex.toLowerCase() === parentMetadata.toLowerCase(),
    'quote-metadata-change'
  );
  const identity = { genesisHash: GENESIS, blockHash, metadataHex, runtimeVersion: version },
    codec = createHistoricalExecutionCodec(identity),
    keys = codec.storageKeys();
  const proof = Object.fromEntries(
    Object.entries(keys).map(([label, storageKey]) => [label, rpc.take('state_getStorage', [storageKey, blockHash])])
  );
  const state = codec.decodeStorage(proof as Parameters<typeof codec.decodeStorage>[0]);
  check(state.denominator === DENOMINATOR, 'quote-denomination');
  const context = {
    endpoint: ENDPOINT,
    genesisHash: GENESIS,
    block: request.block,
    parentHash: at.parentHash,
    finalizedSource,
    finalityAttestation: { kind: 'rpc-canonical-finalized', hash: finalHash, height: finalHeader.height },
    expectedDenominator: DENOMINATOR,
    state,
    codecBinding: codec.binding,
    causalArrivalTimeKnown: false,
  };
  const quoted = rpc.take('liquidityProxy_quote', [
    0,
    request.assetIn,
    request.assetOut,
    request.amountInCodec,
    'WithDesiredInput',
    ['XYKPool'],
    'AllowSelected',
    blockHash,
  ]);
  if (quoted === null) {
    rpc.done();
    check(
      feeValue === undefined &&
        same(raw, { kind: 'historical-quote-unavailable', context, request, rpcEvidence: receipts }),
      'unavailable-projection'
    );
    return { quote: freeze(value as Quote), fee: undefined };
  }
  const q = object(quoted),
    poolFees = object(q.fee),
    output = amount(q.amount),
    without = amount(q.amount_without_impact);
  check(
    BigInt(without) >= BigInt(output) &&
      same(q.route, [request.assetIn, request.assetOut]) &&
      same(Object.keys(poolFees), [XOR]),
    'native-quote'
  );
  const normalized = {
    amountOutCodec: output,
    amountWithoutImpactCodec: without,
    poolFeeCodec: amount(poolFees[XOR], false),
    feeAssetAddress: XOR,
    route: [request.assetIn, request.assetOut],
  };
  const swap = {
      assetIn: request.assetIn,
      assetOut: request.assetOut,
      amountInCodec: request.amountInCodec,
      quotedAmountOutCodec: output,
    },
    envelope = codec.buildSwapEnvelope(swap);
  const info = codec.decodeQueryInfo(
    rpc.take('state_call', ['TransactionPaymentApi_query_info', envelope.feeQueryDataHex, blockHash])
  );
  const details = assertHistoricalFeeDetailsMatchesQueryInfo(
    rpc.take('state_call', ['TransactionPaymentApi_query_fee_details', envelope.feeQueryDataHex, blockHash]),
    info.partialFeeCodec,
    '0'
  );
  rpc.done();
  check(
    same(raw, {
      kind: 'hypothetical-historical-execution-estimate',
      context,
      request,
      quote: { ...normalized, raw: quoted, dexId: 0, liquiditySource: 'XYKPool', slippageBps: 50 },
      envelope,
      fees: { assetId: XOR, info, details },
      rpcEvidence: receipts,
      observedFill: false,
      transactionSubmitted: false,
    }),
    'quote-projection'
  );
  const needsFee = isExactInputQuoteWithinImpactLimit(output, without, '1');
  check(needsFee === (feeValue !== undefined), 'cached-bound-fee-coverage');
  if (feeValue === undefined) return { quote: freeze(value as Quote), fee: undefined };
  const source = prepareHistoricalGoalBoundFeeSource({
    identity,
    blockNumber: height,
    request: swap,
    quoteEvidence: raw,
  });
  const feeRaw = object(feeValue),
    feeReceipts = array(feeRaw.rpcEvidence, 2),
    feeRpc = rpcCursor(feeReceipts),
    bound = source.bound;
  const params = (name: string) => [name, bound.feeQueryDataHex, blockHash];
  const infoHex = feeRpc.take('state_call', params('TransactionPaymentApi_query_info')),
    detailsHex = feeRpc.take('state_call', params('TransactionPaymentApi_query_fee_details'));
  feeRpc.done();
  const boundInfo = codec.decodeQueryInfo(infoHex),
    boundDetails = assertHistoricalFeeDetailsMatchesQueryInfo(detailsHex, boundInfo.partialFeeCodec, '0');
  check(
    same(feeRaw, {
      receipt: {
        version: 1,
        kind: 'historical-goal-bound-fee-receipt',
        envelope: bound,
        feeAssetAddress: XOR,
        queries: {
          info: { method: 'state_call', params: params('TransactionPaymentApi_query_info'), resultHex: infoHex },
          details: {
            method: 'state_call',
            params: params('TransactionPaymentApi_query_fee_details'),
            resultHex: detailsHex,
          },
        },
      },
      info: boundInfo,
      details: boundDetails,
      rpcEvidence: feeReceipts,
      sourceBinding: {
        ...source.binding,
        blockNumber: height,
        request: source.request,
        state: source.state,
        originalEnvelopeSha256: source.originalEnvelope.envelopeSha256,
      },
      endpoint: ENDPOINT,
      actualCanonicalFinalityVerifiedHere: false,
      feeAdequacyVerified: false,
      transactionSubmitted: false,
    }),
    'bound-fee-projection'
  );
  return { quote: freeze(value as Quote), fee: freeze(feeValue as Fee) };
}

/** Eagerly authenticate every registered cache item. An invalid registered key is fatal, never a cache miss. */
export async function openCausalGapReuse(
  priorDirectory: string,
  manifest: CausalGapReuseManifest
): Promise<CausalGapReuse> {
  const rawManifest = object(manifest),
    body = {
      kind: rawManifest.kind,
      priorRegistrationSha256: rawManifest.priorRegistrationSha256,
      files: rawManifest.files,
    };
  check(
    Object.keys(rawManifest).length === 4 &&
      body.kind === 'causal-gap-reuse-manifest-v1' &&
      body.priorRegistrationSha256 === CAUSAL_GAP_PRIOR_REGISTRATION &&
      sha(canonical(body)) === rawManifest.sha256,
    'manifest-digest'
  );
  check(same(await fileInventory(priorDirectory), manifest.files), 'manifest-files');
  const registration = priorRegistration(await readJson(priorDirectory, 'registration.json'));
  const fileMap = new Map(manifest.files.map((file) => [file.path, file]));
  const load = async (path: string): Promise<unknown> => {
    const binding = fileMap.get(pathName(path));
    check(binding, 'unregistered-file');
    const bytes = await readFile(join(priorDirectory, path));
    check(bytes.length === binding.bytes && sha(bytes) === binding.sha256, 'changed-file-during-read');
    return JSON.parse(bytes.toString('utf8'));
  };
  for (const bindingValue of [...array(object(registration.source).local), ...array(registration.extra)]) {
    const binding = object(bindingValue),
      path = `source/${pathName(binding.path)}`,
      found = fileMap.get(path);
    check(found && found.sha256 === binding.sha256 && found.bytes === binding.bytes, 'source-snapshot');
  }
  const started = object(await load('acquisition-started.json')),
    failed = object(await load('failed.json'));
  check(
    started.registrationSha256 === CAUSAL_GAP_PRIOR_REGISTRATION &&
      started.restartAllowed === false &&
      failed.registrationSha256 === CAUSAL_GAP_PRIOR_REGISTRATION &&
      failed.reason === 'causal-acquisition:episode-incomplete' &&
      !fileMap.has('complete.json'),
    'prior-terminal-state'
  );
  const warmup = hit(verifyCausalGapWarmup(await load('raw/warmup.json')), ['raw/warmup.json', 'registration.json']);
  const blocks = new Map<number, CausalGapReuseHit<HistoricalClockBlock>>(),
    markets = new Map<number, CausalGapReuseHit<Market>>();
  const contexts = manifest.files.filter((file) => /^raw\/market-\d+\/context\.json$/.test(file.path));
  const recognized = new Set<string>(['raw/warmup.json']);
  for (const contextFile of contexts) {
    const prefix = contextFile.path.replace(/\/context\.json$/, '');
    const numbered = (kind: string) =>
      manifest.files
        .filter((file) => file.path.startsWith(`${prefix}/${kind}-`))
        .sort(
          (a, b) =>
            Number(a.path.split(`${kind}-`)[1].split('.')[0]) - Number(b.path.split(`${kind}-`)[1].split('.')[0])
        );
    const blockFiles = numbered('block'),
      storageFiles = numbered('storage');
    for (const [kind, files] of [
      ['block', blockFiles],
      ['storage', storageFiles],
    ] as const)
      files.forEach((file, index) => check(file.path === `${prefix}/${kind}-${index}.json`, 'shard-file-sequence'));
    const verified = verifyCausalGapMarketShard(
      registration.sourceAnchor,
      await load(contextFile.path),
      await Promise.all(blockFiles.map((file) => load(file.path))),
      await Promise.all(storageFiles.map((file) => load(file.path)))
    );
    const init = [contextFile.path, 'registration.json', ...blockFiles.slice(0, 10).map((file) => file.path)];
    for (const [height, row] of verified.blocks) {
      const provenance = [...init, ...row.receiptIndexes.map((index) => blockFiles[index].path)],
        prior = blocks.get(height);
      check(!prior || same(prior.value, row.block), 'cross-shard-block');
      blocks.set(height, hit(row.block, [...(prior?.files ?? []), ...provenance]));
    }
    for (const [height, row] of verified.markets) {
      const path = `market/${height}.json`;
      check(fileMap.has(path) && same(await load(path), row.value) && !markets.has(height), 'market-projection');
      markets.set(height, hit(row.value, [...blocks.get(height)!.files, storageFiles[row.storageIndex].path, path]));
    }
    [contextFile, ...blockFiles, ...storageFiles].forEach((file) => recognized.add(file.path));
  }
  check(contexts.length > 0 && contexts.length <= 32, 'shard-count');
  const byHash = new Map<string, HistoricalClockBlock>();
  for (const { value: block } of blocks.values()) {
    check(!byHash.has(block.hash), 'hash-reused-across-heights');
    byHash.set(block.hash, block);
    const previous = blocks.get(block.height - 1)?.value;
    check(
      !previous || (block.parentHash === previous.hash && block.timestampMs > previous.timestampMs),
      'adjacent-blocks'
    );
  }
  for (const file of manifest.files.filter((file) => file.path.startsWith('market/')))
    check(/^market\/\d+\.json$/.test(file.path) && markets.has(Number(file.path.slice(7, -5))), 'orphan-market');
  const quotes = new Map<string, CausalGapReuseHit<Quote>>(),
    fees = new Map<string, CausalGapReuseHit<Fee>>();
  for (const file of manifest.files.filter((file) => file.path.startsWith('raw/quotes/'))) {
    const key = file.path.slice(11, -5);
    check(SHA.test(key) && file.path === `raw/quotes/${key}.json`, 'quote-file');
    const feePath = `raw/fees/${key}.json`,
      feeRaw = fileMap.has(feePath) ? await load(feePath) : undefined;
    const verified = verifyCausalGapQuote(
      key,
      await load(file.path),
      feeRaw,
      object(registration.sourceAnchor).finalizedSource
    );
    const block = blocks.get(verified.quote.request.block.height),
      market = markets.get(verified.quote.request.block.height);
    check(
      block &&
        market &&
        block.value.hash === verified.quote.request.block.hash &&
        block.value.timestampMs === verified.quote.context.state.timestampMs &&
        block.value.parentHash === verified.quote.context.parentHash &&
        same(market.value.poolEvidence.binding, verified.quote.context.codecBinding),
      'quote-market-join'
    );
    const needsFee =
      verified.quote.kind === 'hypothetical-historical-execution-estimate' &&
      market.value.poolEvidence.status === 'present' &&
      isExactInputQuoteWithinImpactLimit(
        verified.quote.quote.amountOutCodec,
        verified.quote.quote.amountWithoutImpactCodec,
        '1'
      );
    check(needsFee === Boolean(verified.fee), 'cached-bound-fee-coverage');
    quotes.set(key, hit(verified.quote, [file.path, ...market.files]));
    if (verified.fee) {
      fees.set(key, hit(verified.fee, [feePath, ...quotes.get(key)!.files]));
      recognized.add(feePath);
    }
    recognized.add(file.path);
  }
  for (const file of manifest.files.filter((file) => file.path.startsWith('raw/')))
    check(recognized.has(file.path), 'unrecognized-raw-artifact');
  // Keep malformed lookup inputs distinct from valid keys that were never present in the original run.
  return Object.freeze({
    warmup: () => warmup,
    block: (height: number) => {
      number(height, 1);
      return blocks.get(height);
    },
    market: (height: number) => {
      number(height, 1);
      return markets.get(height);
    },
    quote: (key: string) => {
      check(SHA.test(key), 'lookup-key');
      return quotes.get(key);
    },
    boundFee: (key: string) => {
      check(SHA.test(key), 'lookup-key');
      return fees.get(key);
    },
  });
}
