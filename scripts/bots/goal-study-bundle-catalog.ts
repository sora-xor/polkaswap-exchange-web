/** Node-only schema bootstrap from pinned training receipts and exact target WASM. No episode admission. */
import { createGoalRuntimeCatalog } from '../../src/features/bot-trading/execution-codecs/runtime-catalog';
import { goalRawBytesSha256 } from '../../src/features/bot-trading/goal-raw-envelope';
import type { GoalBundleMetadataBinding } from '../../src/features/bot-trading/goal-bundle-metadata';
import { createGoalTargetRuntimeWorker } from './goal-target-runtime-worker-client';
import { snapshotGoalArchiveTargetBinary } from './goal-qualification-archive-reader';

const SHA = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
function check(value: unknown, reason: string): asserts value {
  if (!value) throw Error(`goal-study-bundle-catalog:${reason}`);
}
type Json = Record<string, any>; // Detached bounded JSON only; no caller object reaches receipt parsing.
function object(value: unknown): Json {
  check(
    value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype,
    'object'
  );
  return value as Json;
}
/** The raw collector digest permits metadata strings larger than the qualification plan's JSON limits. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Json)[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
const digest = (value: unknown) => goalRawBytesSha256(new TextEncoder().encode(canonical(value)));
/**
 * Establish only the owned schema catalog. Full original wire/finality reconstruction must still pass the
 * catalog metadata verifier; this helper reads one training shard and never opens validation observations.
 */
export async function createGoalStudyBundleCatalog(
  binding: Readonly<GoalBundleMetadataBinding>,
  dependencies: {
    readArtifact(name: string, signal: AbortSignal): Promise<Uint8Array>;
    compressedBytes: Uint8Array;
    signal?: AbortSignal;
  }
) {
  const input = Object.getOwnPropertyDescriptors(dependencies);
  check(
    Object.getPrototypeOf(dependencies) === Object.prototype &&
      Reflect.ownKeys(input).every(
        (key) =>
          typeof key === 'string' &&
          ['readArtifact', 'compressedBytes', 'signal'].includes(key) &&
          input[key].enumerable &&
          'value' in input[key]
      ),
    'dependencies'
  );
  const readArtifact = input.readArtifact?.value as (name: string, signal: AbortSignal) => Promise<Uint8Array>;
  const signal = input.signal?.value as AbortSignal | undefined;
  check(typeof readArtifact === 'function' && (signal === undefined || signal instanceof AbortSignal), 'dependencies');
  const fields = Object.getOwnPropertyDescriptors(binding);
  check(
    Object.getPrototypeOf(binding) === Object.prototype &&
      Reflect.ownKeys(fields).every(
        (key) => typeof key === 'string' && fields[key].enumerable && 'value' in fields[key]
      ),
    'binding'
  );
  const bound = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
  check(
    bound.partition === 'training' &&
      typeof bound.manifestSha256 === 'string' &&
      SHA.test(bound.manifestSha256) &&
      typeof bound.rawManifestSha256 === 'string' &&
      SHA.test(bound.rawManifestSha256),
    'binding'
  );
  const compressedBytes = snapshotGoalArchiveTargetBinary(input.compressedBytes?.value);
  const lifetime = new AbortController(),
    abort = () => lifetime.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const active = () => check(!lifetime.signal.aborted, 'aborted');
  let worker: Awaited<ReturnType<typeof createGoalTargetRuntimeWorker>> | undefined;
  const read = async (name: string, sha256: string, maximum: number, exact = false) => {
    active();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onAbort: (() => void) | undefined;
    const interrupted = new Promise<never>((_resolve, reject) => {
      onAbort = () => reject(Error('goal-study-bundle-catalog:aborted'));
      lifetime.signal.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(() => {
        reject(Error('goal-study-bundle-catalog:timeout'));
        lifetime.abort();
      }, 30000);
    });
    let bytes: Uint8Array;
    try {
      bytes = await Promise.race([readArtifact(name, lifetime.signal), interrupted]);
    } finally {
      clearTimeout(timer);
      lifetime.signal.removeEventListener('abort', onAbort!);
    }
    active();
    check(
      bytes instanceof Uint8Array &&
        bytes.byteLength > 0 &&
        bytes.byteLength <= maximum &&
        (!exact || bytes.byteLength === maximum) &&
        goalRawBytesSha256(bytes) === sha256,
      'artifact-pin'
    );
    return object(JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)));
  };
  try {
    const manifest = await read('run-protocol', bound.manifestSha256, 8 * 1024 * 1024),
      protocol = object(manifest.protocol);
    check(
      protocol.version === 2 &&
        protocol.kind === 'qualification-callback-metadata-catalog-v2' &&
        manifest.protocolSha256 === digest(protocol),
      'protocol'
    );
    const source = object(protocol.source);
    check(
      source.kind === 'catalog-source-v1' && Array.isArray(source.schemaAnchors) && source.schemaAnchors.length === 3,
      'source'
    );
    const anchors = source.schemaAnchors.map(object);
    check(
      anchors.every(
        (anchor, i) =>
          anchor.specVersion === 128 + i &&
          HASH.test(anchor.hash) &&
          Number.isSafeInteger(anchor.height) &&
          anchor.height > 0
      ) && new Set(anchors.map((a) => a.hash)).size === 3,
      'anchors'
    );
    check(Array.isArray(protocol.ranges) && protocol.ranges.length > 0 && protocol.ranges.length <= 3, 'ranges');
    let firstTraining: number | undefined,
      offset = 0;
    for (const rawRange of protocol.ranges) {
      const range = object(rawRange),
        first = object(range.first),
        last = object(range.last);
      check(
        Number.isSafeInteger(first.height) &&
          first.height > 0 &&
          Number.isSafeInteger(last.height) &&
          last.height >= first.height &&
          last.height - first.height < 100000,
        'range'
      );
      if (range.id === 'training') {
        check(firstTraining === undefined, 'training');
        firstTraining = offset;
      }
      offset += Math.ceil((last.height - first.height + 1) / 64);
    }
    check(firstTraining !== undefined && offset <= 25000, 'training');
    const name = `shard-${String(firstTraining).padStart(5, '0')}.complete`;
    const inventory = await read('raw-manifest', bound.rawManifestSha256, 8 * 1024 * 1024);
    check(
      inventory.kind === 'verified-callback-raw-manifest-v1' &&
        inventory.version === 1 &&
        inventory.manifestSha256 === bound.manifestSha256 &&
        Array.isArray(inventory.files) &&
        inventory.files.length <= 25000,
      'inventory'
    );
    const entries = inventory.files.map(object).filter((entry: Json) => entry.name === name);
    check(
      entries.length === 1 &&
        SHA.test(entries[0].sha256) &&
        Number.isSafeInteger(entries[0].bytes) &&
        entries[0].bytes > 0 &&
        entries[0].bytes <= 8 * 1024 * 1024,
      'training-shard'
    );
    const shard = await read(name, entries[0].sha256, entries[0].bytes, true);
    const { sha256, ...shardBody } = shard;
    check(
      shard.version === 2 &&
        shard.kind === 'complete-catalog-metadata-shard' &&
        shard.rangeId === 'training' &&
        shard.index === firstTraining &&
        shard.protocolSha256 === manifest.protocolSha256 &&
        sha256 === digest(shardBody),
      'training-shard'
    );
    check(Array.isArray(shard.rpcEvidence) && shard.rpcEvidence.length <= 276, 'receipts');
    const metadataRows = shard.rpcEvidence.map(object).filter((row: Json) => row.method === 'state_getMetadata');
    check(metadataRows.length === 3, 'metadata');
    const hexes = anchors.map((anchor) => {
      const rows = metadataRows.filter(
        (row: Json) => Array.isArray(row.params) && row.params.length === 1 && row.params[0] === anchor.hash
      );
      check(rows.length === 1, 'metadata-anchor');
      const row = rows[0];
      check(
        row.httpStatus === 200 &&
          row.failure === undefined &&
          Number.isSafeInteger(row.id) &&
          row.id > 0 &&
          typeof row.responseBody === 'string' &&
          row.responseBody.length <= 4 * 1024 * 1024 &&
          goalRawBytesSha256(new TextEncoder().encode(row.responseBody)) === row.responseSha256,
        'metadata-receipt'
      );
      const response = object(JSON.parse(row.responseBody));
      check(
        response.jsonrpc === '2.0' &&
          response.id === row.id &&
          !Object.hasOwn(response, 'error') &&
          typeof response.result === 'string',
        'metadata-response'
      );
      return response.result as string;
    });
    active();
    worker = await createGoalTargetRuntimeWorker({ compressedBytes, signal: lifetime.signal });
    active();
    const catalog = createGoalRuntimeCatalog({
      source128MetadataHex: hexes[0],
      source129MetadataHex: hexes[1],
      source130MetadataHex: hexes[2],
      target131MetadataHex: worker.metadataHex,
    });
    active();
    return catalog;
  } finally {
    await worker?.dispose();
    signal?.removeEventListener('abort', abort);
    lifetime.abort();
  }
}
