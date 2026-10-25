/** Offline, immutable reuse of the interrupted gap study. Never restart its runner or manufacture transport receipts. */
import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  openCausalGapReuse,
  verifyCausalGapMarketShard,
  verifyCausalGapQuote,
  type CausalGapReuse,
  type CausalGapReuseHit,
  type CausalGapReuseManifest,
} from './causal-gap-reuse';
import type { CausalGapCalibrationResult } from './causal-goal-calibration-gap-replay';

export const CAUSAL_GAP_INTERRUPTED_REGISTRATION = 'bcee33b9ae9eee6bc470e4bda4b6704992f82fcdf40627226ab95d7b00dbb0df';
/** Six observed shards/four quote/four fee readers, plus one potentially unpersisted invocation of each class. */
export const CONSERVATIVE_CONTINUATION_DEBIT = Object.freeze({
  warmupRequests: 0,
  marketShards: 7,
  quotes: 5,
  boundFees: 5,
  rpcRequests: 2482,
});
const CANDIDATES = ['momentum-breakout', 'rebound-from-discount', 'trend-pullback-accumulation'] as const;
const SHA = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const MAX_FILES = 20000,
  MAX_TOTAL = 512 * 1024 * 1024,
  MAX_FILE = 32 * 1024 * 1024;
type Json = Record<string, unknown>;
type FileBinding = { path: string; bytes: number; sha256: string };
type Block = NonNullable<ReturnType<CausalGapReuse['block']>>['value'];
type Market = NonNullable<ReturnType<CausalGapReuse['market']>>['value'];
type Quote = NonNullable<ReturnType<CausalGapReuse['quote']>>['value'];
type Fee = NonNullable<ReturnType<CausalGapReuse['boundFee']>>['value'];

/** Whole original snapshot, including registrations, nested strict evidence, source, gate and result bytes. */
export interface CausalGapContinuationManifest {
  kind: 'causal-gap-continuation-reuse-manifest-v1';
  parentRegistrationSha256: string;
  files: readonly FileBinding[];
  sha256: string;
}
/** Retained incomplete tails are never accepted market evidence or silently interpreted as absent cache keys. */
export interface CausalGapContinuationQuarantine {
  kind: 'incomplete-trailing-market-group';
  files: readonly string[];
  reason: string;
}
export interface CausalGapContinuationReuse extends CausalGapReuse {
  /** Driver must reproduce these results with the unchanged replay and cache-only reads before any new acquisition. */
  prefixResults(): readonly (readonly CausalGapCalibrationResult[])[];
  quarantined(): readonly CausalGapContinuationQuarantine[];
  readonly conservativeDebit: typeof CONSERVATIVE_CONTINUATION_DEBIT;
}

function check(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(`causal-gap-continuation-reuse:${reason}`);
}
function object(value: unknown): Json {
  check(value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype, 'object');
  const fields = Object.getOwnPropertyDescriptors(value);
  check(
    Reflect.ownKeys(fields).every((key) => typeof key === 'string' && fields[key].enumerable && 'value' in fields[key]),
    'accessor'
  );
  return value as Json;
}
function array(value: unknown, maximum = MAX_FILES): unknown[] {
  check(Array.isArray(value) && value.length <= maximum, 'array');
  return value;
}
function integer(value: unknown, minimum = 0): number {
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
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);
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
async function inventory(directory: string): Promise<FileBinding[]> {
  const root = resolve(directory);
  check((await realpath(root)) === root, 'directory-symlink');
  const files: FileBinding[] = [];
  let total = 0;
  const walk = async (prefix: string, depth: number): Promise<void> => {
    check(depth <= 24, 'path-depth');
    for (const name of (await readdir(join(root, prefix))).sort()) {
      const path = pathName(prefix ? `${prefix}/${name}` : name),
        absolute = join(root, path),
        stat = await lstat(absolute);
      check(!stat.isSymbolicLink(), 'file-symlink');
      if (stat.isDirectory()) {
        await walk(path, depth + 1);
        continue;
      }
      check(stat.isFile() && stat.size <= MAX_FILE && files.length < MAX_FILES, 'file-bound');
      const bytes = await readFile(absolute);
      total += bytes.length;
      check(bytes.length === stat.size && total <= MAX_TOTAL, 'byte-bound');
      files.push({ path, bytes: bytes.length, sha256: sha(bytes) });
    }
  };
  await walk('', 0);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
function registration(value: unknown): Json {
  const envelope = object(value),
    body = object(envelope.body);
  check(
    envelope.sha256 === CAUSAL_GAP_INTERRUPTED_REGISTRATION &&
      sha(canonical(body)) === CAUSAL_GAP_INTERRUPTED_REGISTRATION &&
      body.kind === 'causal-gap-calibration-registration-v1',
    'parent-registration'
  );
  return body;
}
/** Metadata-only binding of already saved local files. No registration marker is written by this function. */
export async function registerCausalGapContinuationReuse(
  parentDirectory: string
): Promise<CausalGapContinuationManifest> {
  const files = await inventory(parentDirectory);
  registration(JSON.parse(await readFile(join(parentDirectory, 'registration.json'), 'utf8')));
  const body = {
    kind: 'causal-gap-continuation-reuse-manifest-v1' as const,
    parentRegistrationSha256: CAUSAL_GAP_INTERRUPTED_REGISTRATION,
    files,
  };
  return freeze({ ...body, sha256: sha(canonical(body)) });
}
function hit<T>(value: T, files: readonly string[]): CausalGapReuseHit<T> {
  return freeze({ value, files: [...new Set(files)].sort() });
}
function nested<T>(value: CausalGapReuseHit<T> | undefined): CausalGapReuseHit<T> | undefined {
  return value && hit(value.value, ['registration.json', ...value.files.map((file) => `reuse/prior/${file}`)]);
}

/** Validate an original receipt's complete bytes; incomplete means absent response only, never contradictory bytes. */
function receipt(raw: unknown, id: number): { complete: boolean; result?: unknown } {
  const value = object(raw);
  check(value.id === id && typeof value.method === 'string', 'receipt-identity');
  check(!Object.hasOwn(value, 'failure'), 'recorded-request-failure');
  if (value.responseBody === undefined) {
    check(
      value.responseBodyBase64 === undefined &&
        value.responseSha256 === undefined &&
        value.completedAt === undefined &&
        value.httpStatus === undefined,
      'ambiguous-partial-receipt'
    );
    return { complete: false };
  }
  check(
    typeof value.responseBody === 'string' &&
      value.httpStatus === 200 &&
      value.responseBodyBase64 === undefined &&
      sha(value.responseBody) === value.responseSha256,
    'receipt-digest-or-status'
  );
  check(
    Number.isFinite(Date.parse(String(value.requestedAt))) &&
      Date.parse(String(value.completedAt)) >= Date.parse(String(value.requestedAt)),
    'receipt-time'
  );
  const decoded = object(JSON.parse(value.responseBody));
  check(
    decoded.jsonrpc === '2.0' &&
      decoded.id === id &&
      !Object.hasOwn(decoded, 'error') &&
      Object.hasOwn(decoded, 'result'),
    'rpc-response'
  );
  return { complete: true, result: decoded.result };
}

/**
 * Accept only full canonical block groups and complete storage receipts. The final incomplete
 * group is quarantined explicitly; all retained complete bytes in that tail are still checked.
 * This pure seam grants no registration authority and exposes no network operation.
 */
export function verifyCausalGapContinuationShard(
  source: unknown,
  context: unknown,
  blocks: unknown[],
  storage: unknown[],
  allowTrailing: boolean
) {
  check(blocks.length >= 10 && blocks.length <= 266 && storage.length <= 64, 'shard-bounds');
  const ctx = object(context),
    schema = object(ctx.schema),
    sourceFields = object(source),
    final = object(sourceFields.finalizedSource);
  let completeLength = 10;
  let incomplete = false;
  for (let start = 10; start < blocks.length; start += 4) {
    let blockHash: string | undefined, height: number | undefined;
    for (let step = 0; step < 4 && start + step < blocks.length; step++) {
      const index = start + step,
        row = object(blocks[index]),
        verified = receipt(row, index + 1);
      check(!incomplete, 'nonterminal-incomplete-receipt');
      if (step === 0) {
        const params = array(row.params, 1);
        check(row.method === 'chain_getBlockHash' && params.length === 1, 'tail-hash-request');
        height = integer(params[0], 1);
        check(height <= integer(final.height), 'tail-height');
        if (verified.complete) blockHash = hash(verified.result);
      } else {
        check(blockHash !== undefined, 'tail-block-identity');
        const method = step === 1 ? 'chain_getHeader' : step === 2 ? 'state_getStorageHash' : 'state_getStorage';
        const params = step === 1 ? [blockHash] : [step === 2 ? '0x3a636f6465' : schema.key, blockHash];
        check(row.method === method && same(row.params, params), 'tail-request');
        if (verified.complete && step === 1) {
          const found = object(verified.result);
          check(
            typeof found.number === 'string' &&
              /^0x[0-9a-f]+$/.test(found.number) &&
              Number(BigInt(found.number)) === height,
            'tail-header-height'
          );
          check(hash(found.parentHash) !== blockHash, 'tail-header-parent');
          hash(found.stateRoot);
          hash(found.extrinsicsRoot);
          check(
            array(object(found.digest).logs, 128).every(
              (value) => typeof value === 'string' && /^0x(?:[0-9a-fA-F]{2})*$/.test(value)
            ),
            'tail-header-digest'
          );
        }
        if (verified.complete && step === 2) check(verified.result === schema.codeHash, 'tail-runtime-code');
        if (verified.complete && step === 3) {
          check(typeof verified.result === 'string' && /^0x[0-9a-fA-F]{16}$/.test(verified.result), 'tail-timestamp');
          const time = Buffer.from(verified.result.slice(2), 'hex').readBigUInt64LE();
          check(time > 0n && time <= BigInt(Number.MAX_SAFE_INTEGER), 'tail-timestamp-range');
        }
      }
      if (!verified.complete) {
        incomplete = true;
        check(index === blocks.length - 1, 'nonterminal-incomplete-receipt');
      }
    }
    if (start + 4 <= blocks.length && !incomplete) completeLength = start + 4;
  }
  const discardedBlocks = blocks.slice(completeLength);
  check(allowTrailing || discardedBlocks.length === 0, 'nonterminal-block-tail');
  let storageLength = storage.length;
  for (const [index, row] of storage.entries()) {
    const status = receipt(row, index + 1);
    if (!status.complete) {
      check(allowTrailing && index === storage.length - 1, 'nonterminal-storage-tail');
      storageLength = index;
    }
  }
  const verified = verifyCausalGapMarketShard(
    source,
    context,
    blocks.slice(0, completeLength),
    storage.slice(0, storageLength)
  );
  if (discardedBlocks.length) {
    const row = object(discardedBlocks[0]),
      height = integer(array(row.params)[0], 1),
      observed = receipt(row, completeLength + 1);
    if (observed.complete) {
      const blockHash = hash(observed.result),
        known = verified.blocks.get(height),
        anchor = object(sourceFields.schemaAnchor);
      check(!known || known.block.hash === blockHash, 'tail-canonical-conflict');
      check(height !== anchor.height || blockHash === anchor.hash, 'tail-anchor-conflict');
      check(height !== final.height || blockHash === final.hash, 'tail-finality-conflict');
      check(
        [...verified.blocks.values()].every(({ block }) => block.hash !== blockHash || block.height === height),
        'tail-hash-conflict'
      );
      if (known && discardedBlocks.length > 1) {
        const repeated = receipt(discardedBlocks[1], completeLength + 2);
        if (repeated.complete)
          check(
            same(repeated.result, receipt(blocks[known.receiptIndexes[1]], known.receiptIndexes[1] + 1).result),
            'tail-header-conflict'
          );
      }
    }
  }
  if (storageLength < storage.length) {
    const pending = object(storage.at(-1)),
      state = [...verified.blocks.values()].find(({ block }) => block.hash === pending.blockHash);
    check(
      pending.method === 'state_queryStorageAt' &&
        state &&
        Array.isArray(pending.keys) &&
        pending.keys.length === 7 &&
        pending.keys.every((key) => typeof key === 'string' && /^0x[0-9a-f]+$/.test(key)) &&
        new Set(pending.keys).size === 7,
      'partial-storage-identity'
    );
  }
  return {
    ...verified,
    quarantinedBlockIndexes: blocks.slice(completeLength).map((_, index) => completeLength + index),
    quarantinedStorageIndexes: storage.slice(storageLength).map((_, index) => storageLength + index),
  };
}

/** Result identity/coverage and gate integrity; the continuation driver separately proves full deterministic replay equality. */
export function verifyCausalGapContinuationPrefix(
  results: unknown[][],
  gateValue: unknown
): readonly (readonly CausalGapCalibrationResult[])[] {
  check(results.length === 12, 'prefix-episode-count');
  const start = Date.parse('2026-06-30T19:00:00Z'),
    day = 86400000;
  for (const [ordinal, row] of results.entries()) {
    check(row.length === 3, 'prefix-candidates');
    for (const [index, value] of row.entries()) {
      const item = object(value),
        hourly = array(item.hourlyEquity, 25),
        control = array(item.controlEquity, 50);
      check(
        item.protocol === 'causal-goal-calibration-gap-v1' &&
          item.candidate === CANDIDATES[index] &&
          item.status === 'complete' &&
          array(item.diagnostics).length === 0 &&
          item.signalsConsumed === 24 &&
          hourly.length === 25 &&
          control.length >= 25,
        'prefix-result'
      );
      check(
        item.observedFill === false && item.transactionSubmitted === false && item.qualificationAuthority === false,
        'prefix-authority'
      );
      check(
        hourly.every((mark, i) => object(mark).accountingAtMs === start + ordinal * day + i * 3600000),
        'prefix-dates'
      );
    }
  }
  const gate = object(gateValue);
  check(
    gate.ordinal === 0 && same(gate.candidates, CANDIDATES) && gate.resultsSha256 === sha(canonical(results[0])),
    'prefix-first-gate'
  );
  return freeze(results as CausalGapCalibrationResult[][]);
}

/** Fail closed on conflicting layered identities; comparable observations never choose the favorable cache. */
export function mergeCausalGapContinuationHit<T>(
  older: CausalGapReuseHit<T> | undefined,
  newer: CausalGapReuseHit<T>
): CausalGapReuseHit<T> {
  check(!older || same(older.value, newer.value), 'layered-identity-conflict');
  return hit(newer.value, [...(older?.files ?? []), ...newer.files]);
}

/** Check both layers as one canonical identity set, including successors retained only in the older layer. */
export function verifyCausalGapContinuationBlockLinks(values: readonly Block[]): void {
  const heights = new Map<number, Block>(),
    hashes = new Map<string, Block>();
  for (const block of values) {
    const sameHeight = heights.get(block.height),
      sameHash = hashes.get(block.hash);
    check(!sameHeight || same(sameHeight, block), 'cross-layer-height');
    check(!sameHash || same(sameHash, block), 'cross-layer-hash');
    heights.set(block.height, block);
    hashes.set(block.hash, block);
  }
  for (const [height, block] of heights) {
    const previous = heights.get(height - 1);
    check(
      !previous || (block.parentHash === previous.hash && block.timestampMs > previous.timestampMs),
      'cross-layer-ancestry'
    );
  }
}

/** Eagerly verify the immutable parent snapshot, then expose authenticated layered observations only. */
export async function openCausalGapContinuationReuse(
  directory: string,
  manifest: CausalGapContinuationManifest
): Promise<CausalGapContinuationReuse> {
  const supplied = object(manifest),
    manifestBody = {
      kind: supplied.kind,
      parentRegistrationSha256: supplied.parentRegistrationSha256,
      files: supplied.files,
    };
  check(
    Object.keys(supplied).length === 4 &&
      manifestBody.kind === 'causal-gap-continuation-reuse-manifest-v1' &&
      manifestBody.parentRegistrationSha256 === CAUSAL_GAP_INTERRUPTED_REGISTRATION &&
      sha(canonical(manifestBody)) === supplied.sha256,
    'manifest-digest'
  );
  check(same(await inventory(directory), manifest.files), 'manifest-files');
  const bindings = new Map(manifest.files.map((file) => [file.path, file]));
  const load = async (path: string): Promise<unknown> => {
    const file = bindings.get(pathName(path));
    check(file, 'missing-file');
    const bytes = await readFile(join(directory, path));
    check(bytes.length === file.bytes && sha(bytes) === file.sha256, 'changed-file');
    return JSON.parse(bytes.toString('utf8'));
  };
  const parent = registration(await load('registration.json'));
  const expectedSources = [...array(object(parent.source).local), ...array(parent.extra)];
  check(expectedSources.length === 113, 'source-count');
  for (const value of expectedSources) {
    const binding = object(value),
      file = bindings.get(`source/${pathName(binding.path)}`);
    check(file && file.bytes === binding.bytes && file.sha256 === binding.sha256, 'parent-source-snapshot');
  }
  const started = object(await load('acquisition-started.json'));
  check(
    started.registrationSha256 === CAUSAL_GAP_INTERRUPTED_REGISTRATION &&
      started.restartAllowed === false &&
      !bindings.has('complete.json') &&
      !bindings.has('failed.json'),
    'interrupted-parent-state'
  );
  const nestedManifest = object(parent.priorEvidence).manifest as CausalGapReuseManifest;
  const prior = await openCausalGapReuse(join(directory, 'reuse/prior'), nestedManifest);
  const blocks = new Map<number, CausalGapReuseHit<Block>>(),
    markets = new Map<number, CausalGapReuseHit<Market>>(),
    quotes = new Map<string, CausalGapReuseHit<Quote>>(),
    fees = new Map<string, CausalGapReuseHit<Fee>>();
  const getBlock = (height: number) => blocks.get(height) ?? nested(prior.block(height));
  const getMarket = (height: number) => markets.get(height) ?? nested(prior.market(height));
  const quarantined: CausalGapContinuationQuarantine[] = [];
  const recognized = new Set<string>();
  const contexts = manifest.files
    .filter((file) => /^raw\/market-\d+\/context\.json$/.test(file.path))
    .sort((a, b) => Number(a.path.split('/')[1].slice(7)) - Number(b.path.split('/')[1].slice(7)));
  check(contexts.length === 6, 'observed-shard-count');
  let blockReceiptCount = 0,
    storageReceiptCount = 0;
  for (const [shard, contextFile] of contexts.entries()) {
    const prefix = `raw/market-${shard}`;
    check(contextFile.path === `${prefix}/context.json`, 'shard-sequence');
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
      files.forEach((file, index) => check(file.path === `${prefix}/${kind}-${index}.json`, 'receipt-sequence'));
    blockReceiptCount += blockFiles.length;
    storageReceiptCount += storageFiles.length;
    const verified = verifyCausalGapContinuationShard(
      parent.sourceAnchor,
      await load(contextFile.path),
      await Promise.all(blockFiles.map((file) => load(file.path))),
      await Promise.all(storageFiles.map((file) => load(file.path))),
      shard === contexts.length - 1
    );
    const common = ['registration.json', contextFile.path, ...blockFiles.slice(0, 10).map((file) => file.path)];
    for (const [height, row] of verified.blocks)
      blocks.set(
        height,
        mergeCausalGapContinuationHit(
          getBlock(height),
          hit(row.block, [...common, ...row.receiptIndexes.map((index) => blockFiles[index].path)])
        )
      );
    for (const [height, row] of verified.markets) {
      const projection = `market/${height}.json`;
      if (bindings.has(projection)) check(same(await load(projection), row.value), 'market-projection');
      // Missing derived JSON is salvageable only because all its exact canonical/storage receipts are verified.
      const value = hit(row.value, [
        ...getBlock(height)!.files,
        storageFiles[row.storageIndex].path,
        ...(bindings.has(projection) ? [projection] : []),
      ]);
      markets.set(height, mergeCausalGapContinuationHit(getMarket(height), value));
    }
    const tails = [
      ...verified.quarantinedBlockIndexes.map((index) => blockFiles[index].path),
      ...verified.quarantinedStorageIndexes.map((index) => storageFiles[index].path),
    ];
    if (tails.length)
      quarantined.push(
        freeze({
          kind: 'incomplete-trailing-market-group',
          files: tails,
          reason: 'only-complete-canonical-and-storage-groups-are-reusable',
        })
      );
    [contextFile, ...blockFiles, ...storageFiles].forEach((file) => recognized.add(file.path));
  }
  check(blockReceiptCount <= 6 * 272 && storageReceiptCount <= 6 * 64, 'conservative-market-debit');
  const allBlocks = [...blocks.values()].map((entry) => entry.value);
  for (const file of nestedManifest.files.filter((file) => /^raw\/market-\d+\/block-\d+\.json$/.test(file.path))) {
    const row = object(await load(`reuse/prior/${file.path}`));
    if (row.method === 'chain_getBlockHash') {
      const height = array(row.params)[0];
      if (typeof height === 'number' && height > 0) {
        const known = prior.block(height);
        if (known) allBlocks.push(known.value);
      }
    }
  }
  verifyCausalGapContinuationBlockLinks(allBlocks);
  for (const file of manifest.files.filter((file) => file.path.startsWith('market/')))
    check(
      /^market\/\d+\.json$/.test(file.path) && markets.has(Number(file.path.slice(7, -5))),
      'unproved-market-projection'
    );
  const quoteFiles = manifest.files.filter((file) => file.path.startsWith('raw/quotes/'));
  const feeFiles = manifest.files.filter((file) => file.path.startsWith('raw/fees/'));
  check(quoteFiles.length === 4 && feeFiles.length === 4, 'observed-quote-fee-count');
  for (const file of quoteFiles) {
    const key = file.path.slice(11, -5);
    check(SHA.test(key) && file.path === `raw/quotes/${key}.json`, 'quote-file');
    const feePath = `raw/fees/${key}.json`;
    const verified = verifyCausalGapQuote(
      key,
      await load(file.path),
      bindings.has(feePath) ? await load(feePath) : undefined,
      object(parent.sourceAnchor).finalizedSource
    );
    const block = getBlock(verified.quote.request.block.height),
      market = getMarket(verified.quote.request.block.height);
    check(
      block &&
        market &&
        block.value.hash === verified.quote.request.block.hash &&
        block.value.timestampMs === verified.quote.context.state.timestampMs &&
        block.value.parentHash === verified.quote.context.parentHash &&
        same(market.value.poolEvidence.binding, verified.quote.context.codecBinding),
      'quote-market-binding'
    );
    quotes.set(
      key,
      mergeCausalGapContinuationHit(nested(prior.quote(key)), hit(verified.quote, [file.path, ...market.files]))
    );
    if (verified.fee) {
      fees.set(
        key,
        mergeCausalGapContinuationHit(
          nested(prior.boundFee(key)),
          hit(verified.fee, [feePath, ...quotes.get(key)!.files])
        )
      );
      recognized.add(feePath);
    }
    recognized.add(file.path);
  }
  for (const file of manifest.files.filter((file) => file.path.startsWith('raw/')))
    check(recognized.has(file.path), 'unknown-raw-artifact');
  const nestedFiles = new Map(nestedManifest.files.map((file) => [file.path, file]));
  for (const file of manifest.files.filter((file) => file.path.startsWith('reuse/inventory/'))) {
    const entry = object(await load(file.path));
    check(
      entry.priorRegistrationSha256 === nestedManifest.priorRegistrationSha256 &&
        entry.priorManifestSha256 === nestedManifest.sha256 &&
        entry.freshNetworkRequests === 0,
      'prior-inventory-binding'
    );
    const key = String(entry.key),
      kind = String(entry.kind);
    check(file.path === `reuse/inventory/${kind}-${key}.json`, 'inventory-name');
    const original =
      kind === 'warmup' && key === 'fixed'
        ? prior.warmup()
        : kind === 'blocks'
          ? prior.block(integer(Number(key), 1))
          : kind === 'markets'
            ? prior.market(integer(Number(key), 1))
            : kind === 'quotes'
              ? prior.quote(key)
              : kind === 'boundFees'
                ? prior.boundFee(key)
                : undefined;
    check(
      original &&
        same(
          entry.files,
          original.files.map((path) => nestedFiles.get(path))
        ),
      'prior-inventory-files'
    );
  }
  for (const file of manifest.files.filter((file) => file.path.startsWith('reuse/identity-rechecks/'))) {
    const entry = object(await load(file.path)),
      height = integer(entry.height, 1),
      original = prior.block(height);
    check(
      original &&
        markets.has(height) &&
        same(original.value, markets.get(height)!.value.block) &&
        file.path === `reuse/identity-rechecks/${height}.json` &&
        entry.priorManifestSha256 === nestedManifest.sha256 &&
        entry.status === 'completed-matching-prior-block' &&
        entry.actualRequestsCountedByTransport === true &&
        same(
          entry.files,
          original.files.map((path) => nestedFiles.get(path))
        ),
      'prior-identity-recheck'
    );
  }
  const expectedResultNames = new Set(
    Array.from({ length: 12 }, (_, ordinal) =>
      CANDIDATES.map((candidate) => `episodes/${ordinal}/${candidate}.json`)
    ).flat()
  );
  const resultFiles = manifest.files.filter((file) => file.path.startsWith('episodes/'));
  check(resultFiles.length === 36 && resultFiles.every((file) => expectedResultNames.has(file.path)), 'prefix-files');
  const results: unknown[][] = [];
  for (let ordinal = 0; ordinal < 12; ordinal++)
    results.push(await Promise.all(CANDIDATES.map((candidate) => load(`episodes/${ordinal}/${candidate}.json`))));
  const prefix = verifyCausalGapContinuationPrefix(results, await load('first-episode-complete.json'));
  // Identity checks are eager, so an invalid saved key can never become a fallback fresh request.
  return Object.freeze({
    warmup: () => nested(prior.warmup())!,
    block: (height: number) => {
      integer(height, 1);
      return getBlock(height);
    },
    market: (height: number) => {
      integer(height, 1);
      return getMarket(height);
    },
    quote: (key: string) => {
      check(SHA.test(key), 'lookup-key');
      return quotes.get(key) ?? nested(prior.quote(key));
    },
    boundFee: (key: string) => {
      check(SHA.test(key), 'lookup-key');
      return fees.get(key) ?? nested(prior.boundFee(key));
    },
    prefixResults: () => prefix,
    quarantined: () => freeze([...quarantined]),
    conservativeDebit: CONSERVATIVE_CONTINUATION_DEBIT,
  });
}
