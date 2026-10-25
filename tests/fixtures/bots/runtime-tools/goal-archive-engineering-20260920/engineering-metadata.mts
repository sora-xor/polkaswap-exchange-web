/** Fixed development-only metadata preparation. Importing this module never performs I/O or starts a run. */
import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { readFile, lstat, mkdir, open, link, unlink } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as blockExports from '../../../../../scripts/bots/historical-execution-block-reader';
import * as locatorExports from '../../../../../scripts/bots/historical-valuation-locator';
import * as collectorExports from '../../../../../scripts/bots/goal-qualification-metadata-collector';
import type { HistoricalClockBlock } from '../../../../../scripts/bots/historical-execution-clock';
import type { HistoricalBlockReaderSource } from '../../../../../scripts/bots/historical-execution-block-reader';
import type {
  GoalQualificationMetadataProtocol,
  GoalQualificationMetadataRange,
} from '../../../../../scripts/bots/goal-qualification-metadata-collector';

const { createHistoricalExecutionBlockReader } = (
  'default' in blockExports ? blockExports.default : blockExports
) as typeof import('../../../../../scripts/bots/historical-execution-block-reader');
const { locateHistoricalValuationBlock } = (
  'default' in locatorExports ? locatorExports.default : locatorExports
) as typeof import('../../../../../scripts/bots/historical-valuation-locator');
const { collectGoalQualificationMetadata, goalQualificationMetadataBudget } = (
  'default' in collectorExports ? collectorExports.default : collectorExports
) as typeof import('../../../../../scripts/bots/goal-qualification-metadata-collector');
type Boundary = Awaited<ReturnType<typeof locateHistoricalValuationBlock>>;
interface EngineeringProtocol {
  kind: 'development-only-200h-prefix-engineering-metadata-v1';
  definition: ReturnType<typeof engineeringDefinition>;
  source: HistoricalBlockReaderSource;
  schema: GoalQualificationMetadataProtocol['schema'];
  sourceHashes: Record<string, string>;
  evidenceSources: readonly { path: string; sha256: string }[];
  search: { seed: HistoricalClockBlock; upwardOffsets: readonly number[] };
  collectionCeilings: {
    blocks: number;
    shards: number;
    rpcCalls: number;
    totalBytes: number;
    maximumHttpStarts: number;
  };
  marketDataRead: false;
  qualification: false;
}
interface BoundsReceipt {
  ready: boolean;
  sourceHashesUnchanged: boolean;
  marketDataRead: boolean;
  qualification: boolean;
  protocolSha256: string;
  source: HistoricalBlockReaderSource;
  schema: GoalQualificationMetadataProtocol['schema'];
  range: GoalQualificationMetadataRange;
  budget: GoalQualificationMetadataProtocol['budget'];
  first: Boundary;
  last: Boundary;
}
const ROOT = resolve(fileURLToPath(new URL('../../../../../', import.meta.url)));
const BASE = dirname(fileURLToPath(import.meta.url));
const EARLIER = resolve(ROOT, 'output/go-history/earlier-window-metadata-20260920');
const RUN = resolve(BASE, 'callback-collection');
const ENDPOINT = 'https://mof2.sora.org/';
const TIMESTAMP = '0xf0c365c3cf59d671eb72da0e7a4113c49f1f0515f462cdcf84e0f1d6045dfcbb';
const HOUR = 3600000;
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const canonical = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
          .join(',')}}`
      : JSON.stringify(value);
function check(value: unknown, reason: string): asserts value {
  if (!value) throw Error(reason);
}
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);

/** Dates follow only the 200-hour exclusion boundary; no observation is an input. */
export function engineeringDefinition() {
  const firstHistoryBucketAtMs = Date.parse('2026-06-21T04:00:00Z');
  const firstWarmupCloseAtMs = firstHistoryBucketAtMs + HOUR;
  const startAtMs = firstHistoryBucketAtMs + 201 * HOUR,
    endAtMs = startAtMs + 24 * HOUR;
  return Object.freeze({
    id: 'development' as const,
    firstHistoryBucketAtMs,
    firstWarmupCloseAtMs,
    warmupHours: 200,
    queryCloses: 201,
    startAtMs,
    endAtMs,
    firstTargetAtMs: startAtMs - 60000,
    lastTargetAtMs: endAtMs + 1,
  });
}
/** Independently found adjacent pairs prove the inclusive collection endpoints. */
export function engineeringRange(
  first: { previous: HistoricalClockBlock; block: HistoricalClockBlock },
  last: { previous: HistoricalClockBlock; block: HistoricalClockBlock }
): GoalQualificationMetadataRange {
  const definition = engineeringDefinition();
  for (const [pair, target] of [
    [first, definition.firstTargetAtMs],
    [last, definition.lastTargetAtMs],
  ] as const) {
    check(
      pair.previous.height + 1 === pair.block.height && pair.block.parentHash === pair.previous.hash,
      'nonadjacent-boundary'
    );
    check(pair.previous.timestampMs < target && pair.block.timestampMs >= target, 'wrong-boundary');
  }
  const result = {
    id: definition.id,
    startAtMs: definition.startAtMs,
    endAtMs: definition.endAtMs,
    first: first.previous,
    last: last.block,
  };
  check(result.last.height - result.first.height + 1 <= 20000, 'engineering-block-limit');
  goalQualificationMetadataBudget([result]);
  return result;
}
/** Strict metadata method allowlist for the locator's unbatched requests. */
export function allowEngineeringMetadataRequest(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const input = value as { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown };
  if (input.jsonrpc !== '2.0' || !Number.isSafeInteger(input.id) || !Array.isArray(input.params)) return false;
  const p = input.params,
    hash = (v: unknown) => typeof v === 'string' && /^0x[0-9a-f]{64}$/.test(v);
  if (input.method === 'chain_getFinalizedHead') return p.length === 0;
  if (input.method === 'chain_getBlockHash') return p.length === 1 && Number.isSafeInteger(p[0]) && p[0] >= 0;
  if (['chain_getHeader', 'state_getRuntimeVersion', 'state_getMetadata'].includes(String(input.method)))
    return p.length === 1 && hash(p[0]);
  if (input.method === 'state_getStorageHash') return p.length === 2 && p[0] === '0x3a636f6465' && hash(p[1]);
  if (input.method === 'state_getStorage') return p.length === 2 && p[0] === TIMESTAMP && hash(p[1]);
  return false;
}
async function json<T = unknown>(path: string, maximumBytes = 64 * 1024 * 1024): Promise<T> {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    check(info.isFile() && info.size > 0 && info.size <= maximumBytes, 'file-size');
    const chunks: Buffer[] = [];
    let length = 0;
    for (;;) {
      const buffer = Buffer.alloc(65536),
        { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (!bytesRead) break;
      length += bytesRead;
      check(length <= maximumBytes, 'file-grew');
      chunks.push(buffer.subarray(0, bytesRead));
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(Buffer.concat(chunks))) as T;
  } finally {
    await handle.close();
  }
}
async function writeOnce(path: string, value: unknown) {
  const temporary = path + '.pending-' + randomUUID(),
    handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(JSON.stringify(value) + '\n');
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await link(temporary, path);
  } finally {
    await unlink(temporary);
  }
  const directory = await open(dirname(path), 'r');
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}
async function missing(path: string) {
  try {
    await lstat(path);
    return false;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return true;
    throw error;
  }
}
async function sourceCheck(protocol: EngineeringProtocol) {
  for (const [path, expected] of Object.entries(protocol.sourceHashes)) {
    const full = resolve(ROOT, path);
    check(full.startsWith(ROOT + sep), 'source-path');
    check(sha(await readFile(full)) === expected, 'source-changed');
  }
  for (const entry of protocol.evidenceSources)
    check(sha(await readFile(resolve(ROOT, entry.path))) === entry.sha256, 'prior-evidence-changed');
}
/** This operation cannot compete with the earlier collector's global eight-start/second lane. */
async function priorCollectorFinished() {
  check(await missing(resolve(EARLIER, 'callback-collection/collector.lock')), 'earlier-collector-active');
  const bytes = await readFile(resolve(EARLIER, 'collector-complete-verification.json'));
  const verification = JSON.parse(bytes.toString());
  check(
    verification.verified === true &&
      verification.sourceHashesUnchanged === true &&
      verification.networkAttempts === 0 &&
      verification.marketDataRead === false &&
      verification.qualification === false,
    'earlier-collector-not-verified'
  );
  const exit = await json<{ exitCode: number; manifestSha256: string }>(
    resolve(EARLIER, 'collector-full-exit.json'),
    1024 * 1024
  );
  check(
    exit.exitCode === 0 && exit.manifestSha256 === verification.preparedManifestSha256,
    'earlier-collector-not-ended'
  );
  return { receiptSha256: sha(bytes), preparedManifestSha256: verification.preparedManifestSha256 };
}

async function locate(protocol: EngineeringProtocol, signal: AbortSignal) {
  const gate = await priorCollectorFinished();
  check(await missing(resolve(BASE, 'bounds.started.json')), 'bounds-already-attempted');
  check(await missing(resolve(BASE, 'bounds.complete.json')), 'bounds-already-complete');
  await writeOnce(resolve(BASE, 'bounds.started.json'), {
    protocolSha256: sha(await readFile(resolve(BASE, 'protocol.json'))),
    pid: process.pid,
    gate,
    startedAt: new Date().toISOString(),
    marketDataRead: false,
  });
  let count = 0,
    total = 0,
    lastStart = -Infinity;
  const transport: typeof fetch = async (url, init) => {
    check(
      String(url) === ENDPOINT &&
        init?.method === 'POST' &&
        typeof init.body === 'string' &&
        allowEngineeringMetadataRequest(JSON.parse(init.body)),
      'metadata-transport-only'
    );
    check(++count <= 272 && !signal.aborted, 'locator-budget-or-abort');
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, lastStart + 125 - Date.now())));
    check(!signal.aborted && !init.signal?.aborted, 'aborted');
    lastStart = Date.now();
    const response = await fetch(url, { ...init, redirect: 'error', credentials: 'omit' });
    check(response.body, 'response-body');
    let bytes = 0;
    const body = response.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          bytes += chunk.length;
          total += chunk.length;
          check(bytes <= 2097152 && total <= 12582912, 'locator-response-budget');
          controller.enqueue(chunk);
        },
      })
    );
    return new Proxy(response, {
      get(target, key) {
        if (key === 'body') return body;
        const value = Reflect.get(target, key, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  };
  let reader: Awaited<ReturnType<typeof createHistoricalExecutionBlockReader>> | undefined;
  try {
    reader = await createHistoricalExecutionBlockReader(protocol.source as HistoricalBlockReaderSource, {
      fetch: transport,
      signal,
      timeoutMs: 20000,
    });
    check(same(reader.context.schema, protocol.schema), 'schema-changed');
    const cache = new Map<number, HistoricalClockBlock>();
    const read = async (height: number) => {
      const prior = cache.get(height);
      if (prior) return prior;
      const block = await reader!.readBlock(height);
      cache.set(height, block);
      return block;
    };
    const seed = await read(protocol.search.seed.height);
    check(same(seed, protocol.search.seed), 'seed-changed');
    let upper = seed;
    const target = engineeringDefinition();
    check(seed.timestampMs < target.firstTargetAtMs, 'seed-not-lower');
    for (const distance of protocol.search.upwardOffsets) {
      upper = await read(seed.height + distance);
      if (upper.timestampMs >= target.lastTargetAtMs) break;
    }
    check(upper.timestampMs >= target.lastTargetAtMs, 'bounded-upper-unavailable');
    const first = await locateHistoricalValuationBlock(
      { targetAtMs: target.firstTargetAtMs, maximumLagMs: 600000, lower: seed, upper },
      read
    );
    const last = await locateHistoricalValuationBlock(
      { targetAtMs: target.lastTargetAtMs, maximumLagMs: 600000, lower: first.block, upper },
      read
    );
    const range = engineeringRange(first, last),
      budget = goalQualificationMetadataBudget([range]);
    check(
      budget.blocks <= protocol.collectionCeilings.blocks &&
        budget.shards <= protocol.collectionCeilings.shards &&
        budget.rpcCalls <= protocol.collectionCeilings.rpcCalls &&
        budget.totalBytes <= protocol.collectionCeilings.totalBytes &&
        budget.maximumHttpStarts <= protocol.collectionCeilings.maximumHttpStarts,
      'collection-ceiling'
    );
    await sourceCheck(protocol);
    await writeOnce(resolve(BASE, 'bounds.complete.json'), {
      ready: true,
      protocolSha256: sha(await readFile(resolve(BASE, 'protocol.json'))),
      source: protocol.source,
      schema: reader.context.schema,
      range,
      budget,
      first,
      last,
      rpcEvidence: reader.evidence(),
      counts: { rpcCalls: count, responseBytes: total, uniqueBlocks: cache.size },
      sourceHashesUnchanged: true,
      marketDataRead: false,
      qualification: false,
    });
    console.log(
      JSON.stringify({
        ready: true,
        range: {
          firstHeight: range.first.height,
          lastHeight: range.last.height,
          startAtMs: range.startAtMs,
          endAtMs: range.endAtMs,
        },
        budget,
        rpcCalls: count,
        marketDataRead: false,
        qualification: false,
      })
    );
  } catch (error) {
    await writeOnce(resolve(BASE, 'bounds.failed.json'), {
      reason: 'metadata-unavailable',
      diagnostic: (error as { diagnostic?: unknown }).diagnostic ?? null,
      rpcEvidence: reader?.evidence() ?? [],
      counts: { rpcCalls: count, responseBytes: total },
      marketDataRead: false,
      qualification: false,
    });
    console.log(
      JSON.stringify({ ready: false, reason: 'metadata-unavailable', rpcCalls: count, marketDataRead: false })
    );
    process.exitCode = 2;
  }
}

async function collectionProtocol(protocol: EngineeringProtocol): Promise<GoalQualificationMetadataProtocol> {
  const bounds = await json<BoundsReceipt>(resolve(BASE, 'bounds.complete.json'));
  check(
    bounds.ready === true &&
      bounds.sourceHashesUnchanged === true &&
      bounds.marketDataRead === false &&
      bounds.qualification === false &&
      bounds.protocolSha256 === sha(await readFile(resolve(BASE, 'protocol.json'))),
    'unverified-bounds'
  );
  check(
    same(bounds.source, protocol.source) &&
      same(bounds.schema, protocol.schema) &&
      same(bounds.range, engineeringRange(bounds.first, bounds.last)),
    'changed-bounds'
  );
  const budget = goalQualificationMetadataBudget([bounds.range]);
  check(same(budget, bounds.budget), 'changed-budget');
  return {
    version: 1,
    kind: 'qualification-callback-metadata-v1',
    source: bounds.source,
    schema: bounds.schema,
    sourceHashes: protocol.sourceHashes,
    ranges: [bounds.range],
    budget,
  };
}
async function prepareCollection(protocol: EngineeringProtocol) {
  const prepared = await collectionProtocol(protocol);
  await mkdir(RUN, { mode: 0o700 });
  await writeOnce(resolve(RUN, 'run-protocol.json'), {
    kind: 'fixed-development-callback-metadata-v1',
    protocol: prepared,
    protocolSha256: sha(canonical(prepared)),
    boundsSha256: sha(await readFile(resolve(BASE, 'bounds.complete.json'))),
    marketDataRead: false,
    qualification: false,
  });
  console.log(JSON.stringify({ prepared: true, budget: prepared.budget, networkCalls: 0, marketDataRead: false }));
}
async function collect(protocol: EngineeringProtocol, signal: AbortSignal, maximumNewShards?: number) {
  const gate = await priorCollectorFinished(),
    prepared = await collectionProtocol(protocol);
  const manifest = await json<{
    kind: string;
    protocol: GoalQualificationMetadataProtocol;
    protocolSha256: string;
    boundsSha256: string;
  }>(resolve(RUN, 'run-protocol.json'));
  check(
    manifest.kind === 'fixed-development-callback-metadata-v1' &&
      same(manifest.protocol, prepared) &&
      manifest.protocolSha256 === sha(canonical(prepared)) &&
      manifest.boundsSha256 === sha(await readFile(resolve(BASE, 'bounds.complete.json'))),
    'collection-not-prepared'
  );
  const limit = maximumNewShards ?? prepared.budget.shards;
  check(limit > 0 && limit <= prepared.budget.shards, 'shard-limit');
  await writeOnce(resolve(RUN, 'collector.lock'), { pid: process.pid, startedAt: new Date().toISOString(), gate });
  const invocation = `invocation-${Date.now()}-${randomUUID()}`;
  const path = (name: string) => {
    check(/^[a-z0-9.-]+$/.test(name), 'artifact-name');
    return resolve(RUN, name + '.json');
  };
  await writeOnce(path(invocation + '.started'), {
    protocolSha256: manifest.protocolSha256,
    maximumNewShards: limit,
    gate,
    sourceHashes: protocol.sourceHashes,
    marketDataRead: false,
  });
  try {
    const result = await collectGoalQualificationMetadata(prepared, {
      signal,
      maximumNewShards: limit,
      store: {
        read: async (name) => {
          try {
            return await json(path(name));
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
            throw error;
          }
        },
        writeOnce: (name, value) => writeOnce(path(name), value),
      },
      progress: (counts) => console.log(JSON.stringify({ counts, marketDataRead: false, qualification: false })),
    });
    await sourceCheck(protocol);
    await writeOnce(path(invocation + '.result'), {
      ...result,
      sourceHashesUnchanged: true,
      marketDataRead: false,
      qualification: false,
    });
    await unlink(resolve(RUN, 'collector.lock'));
    console.log(
      JSON.stringify({ status: result.status, counts: result.counts, marketDataRead: false, qualification: false })
    );
    if (result.status === 'unavailable') process.exitCode = 2;
  } catch {
    await writeOnce(path(invocation + '.failure'), {
      reason: 'collection-failed',
      marketDataRead: false,
      qualification: false,
    });
    console.log(JSON.stringify({ status: 'unavailable', marketDataRead: false }));
    process.exitCode = 2;
    // Keep ownership on uncertain failure; unresolved shards are not replayable attempts.
  }
}
/** Explicit entrypoint only. Root review and completed earlier collection precede every network mode. */
export async function runEngineeringMetadata(args: readonly string[]) {
  check(
    args.length >= 1 && args.length <= 2 && ['--locate', '--prepare-collection', '--collect'].includes(args[0]),
    'usage'
  );
  check(args.length === 1 || (args[0] === '--collect' && /^--maximum-new-shards=[1-9]\d{0,3}$/.test(args[1])), 'usage');
  const protocol = await json<EngineeringProtocol>(resolve(BASE, 'protocol.json'), 1024 * 1024);
  check(
    protocol.kind === 'development-only-200h-prefix-engineering-metadata-v1' &&
      same(protocol.definition, engineeringDefinition()) &&
      protocol.marketDataRead === false &&
      protocol.qualification === false,
    'protocol'
  );
  await sourceCheck(protocol);
  const abort = new AbortController(),
    stop = () => abort.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    if (args[0] === '--locate') await locate(protocol, abort.signal);
    else if (args[0] === '--prepare-collection') await prepareCollection(protocol);
    else await collect(protocol, abort.signal, args[1] ? Number(args[1].split('=')[1]) : undefined);
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runEngineeringMetadata(process.argv.slice(2)).catch(() => {
    console.log(
      JSON.stringify({
        status: 'not-started-or-unavailable',
        reason: 'preflight-or-retention-failed',
        marketDataRead: false,
      })
    );
    process.exitCode = 2;
  });
}
