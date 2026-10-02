/** Offline exact target estimate re-execution. Storage claims and hypothetical API results grant no admission. */
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { createGoalTargetRuntimeAsyncQuoteAdapter } from './goal-target-runtime-quote';
import {
  createGoalTargetRuntimeStateCodec,
  createGoalCatalogTargetRuntimeStateCodec,
  GOAL_TARGET_STATE_PROFILES,
  type GoalTargetStateReceipt,
} from './goal-target-runtime-state';
import { HISTORICAL_EXECUTION_KUSD as KUSD, HISTORICAL_EXECUTION_XOR as XOR } from './historical-execution-codec';

import {
  assertGoalRuntimeCatalog,
  lookupGoalRuntimeCatalogEntry,
  type GoalRuntimeCatalog,
} from '../../src/features/bot-trading/execution-codecs/runtime-catalog';

type Adapter = Awaited<ReturnType<typeof createGoalTargetRuntimeAsyncQuoteAdapter>>;
export type GoalTargetRuntimeReplayedEstimate = Awaited<ReturnType<Adapter['quote']>>;
export interface GoalTargetRuntimeEstimateReplayInput {
  readonly compressedBytes: Uint8Array;
  readonly sourceBlock: { readonly hash: string; readonly height: number };
  readonly sourceMetadataHex: string;
  readonly receipts: readonly GoalTargetStateReceipt[];
  readonly estimate: unknown;
  readonly signal?: AbortSignal;
  /** One absolute budget for initialization, verification, execution and comparison; at most 30 seconds. */
  readonly timeoutMs?: number;
}

/** Same immutable replay contract with finite catalog ownership and the observed historical code identity. */
export interface GoalCatalogTargetRuntimeEstimateReplayInput extends GoalTargetRuntimeEstimateReplayInput {
  readonly catalog: GoalRuntimeCatalog;
  readonly sourceCodeHash: string;
}

const MAX_JSON_BYTES = 16 * 1024 * 1024;
const MAX_U128 = (1n << 128n) - 1n;
const fail = (reason: string): never => {
  throw new Error(`Invalid target-runtime replay: ${reason}`);
};
const check: (condition: unknown, reason: string) => asserts condition = (condition, reason) => {
  if (!condition) fail(reason);
};
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');

/** Exact own data fields only; getters, symbols, inherited configuration and injected transports are rejected. */
function own(value: unknown, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  check(value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype, 'data object');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  check(
    Reflect.ownKeys(descriptors).every((key) => typeof key === 'string' && [...required, ...optional].includes(key)),
    'fields'
  );
  check(
    required.every((key) => Object.hasOwn(descriptors, key)) &&
      Object.values(descriptors).every((d) => d.enumerable && 'value' in d),
    'fields'
  );
  return Object.fromEntries(Object.entries(descriptors).map(([key, d]) => [key, d.value]));
}

/** Detach bounded JSON data while preserving raw string bytes; sorted-key encoding is for whole-result equality. */
function snapshot(raw: unknown): { value: unknown; canonical: string } {
  let nodes = 0,
    bytes = 0;
  const count = (text: string) => {
    bytes += Buffer.byteLength(text);
    check(bytes <= MAX_JSON_BYTES, 'JSON byte bound');
    return text;
  };
  const visit = (value: unknown, depth: number): { value: unknown; canonical: string } => {
    check(depth <= 24 && ++nodes <= 200000, 'JSON structure bound');
    if (value === null || typeof value === 'boolean') return { value, canonical: count(JSON.stringify(value)) };
    if (typeof value === 'string') {
      check(value.length <= MAX_JSON_BYTES, 'JSON string bound');
      return { value, canonical: count(JSON.stringify(value)) };
    }
    if (typeof value === 'number') {
      check(Number.isSafeInteger(value) && !Object.is(value, -0), 'JSON number');
      return { value, canonical: count(JSON.stringify(value)) };
    }
    check(value && typeof value === 'object', 'JSON value');
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Array.isArray(value)) {
      check(value.length <= 4096 && Reflect.ownKeys(descriptors).length === value.length + 1, 'JSON array');
      const items = Array.from({ length: value.length }, (_, index) => {
        const d = descriptors[String(index)];
        check(d?.enumerable && 'value' in d, 'JSON accessor');
        return visit(d.value, depth + 1);
      });
      count('[]' + ','.repeat(Math.max(0, items.length - 1)));
      return {
        value: Object.freeze(items.map((item) => item.value)),
        canonical: `[${items.map((item) => item.canonical).join(',')}]`,
      };
    }
    check(Object.getPrototypeOf(value) === Object.prototype, 'JSON object');
    const keys = Reflect.ownKeys(descriptors);
    check(keys.length <= 128 && keys.every((key) => typeof key === 'string'), 'JSON fields');
    const items = (keys as string[]).map((key) => {
      const d = descriptors[key];
      check(d.enumerable && 'value' in d, 'JSON accessor');
      count(JSON.stringify(key) + ':');
      return [key, visit(d.value, depth + 1)] as const;
    });
    count('{}' + ','.repeat(Math.max(0, items.length - 1)));
    return {
      value: Object.freeze(Object.fromEntries(items.map(([key, item]) => [key, item.value]))),
      canonical: `{${[...items]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, item]) => `${JSON.stringify(key)}:${item.canonical}`)
        .join(',')}}`,
    };
  };
  return visit(raw, 0);
}

/** Validate only the exact pending request. All other normalized fields must match actual re-execution. */
function pendingEstimate(value: unknown) {
  const common = [
    'version',
    'source',
    'target',
    'request',
    'observedFill',
    'transactionSubmitted',
    'signatureVerified',
    'feeAdequacyVerified',
    'qualificationEligible',
    'admissionGranted',
    'kind',
    'apis',
    'evidenceSha256',
  ];
  const estimate = own(value, common, ['quote', 'fees', 'envelope']);
  check(estimate.version === 1, 'estimate version');
  if (estimate.kind === 'hypothetical-target-runtime-execution-estimate')
    own(value, [...common, 'quote', 'fees', 'envelope']);
  else {
    check(estimate.kind === 'target-runtime-route-unavailable', 'estimate kind');
    own(value, common);
  }
  const request = own(estimate.request, [
    'assetIn',
    'assetOut',
    'amountInCodec',
    'dexId',
    'source',
    'filter',
    'slippageBasisPoints',
  ]);
  check(
    (request.assetIn === KUSD && request.assetOut === XOR) || (request.assetIn === XOR && request.assetOut === KUSD),
    'native pair'
  );
  check(
    request.dexId === 0 &&
      request.source === 'XYKPool' &&
      request.filter === 'AllowSelected' &&
      request.slippageBasisPoints === 50,
    'route'
  );
  check(
    typeof request.amountInCodec === 'string' &&
      /^[1-9]\d{0,38}$/.test(request.amountInCodec) &&
      BigInt(request.amountInCodec) <= MAX_U128,
    'amount'
  );
  return {
    assetIn: request.assetIn as string,
    assetOut: request.assetOut as string,
    amountInCodec: request.amountInCodec,
  };
}

/**
 * Reverify every original storage receipt and re-execute the entire retained estimate in the fixed worker.
 * Equal caller flags/digests alone never suffice. Canonical comparison includes every raw API, input,
 * host trace, normalized amount, provenance digest and false authority flag, including unavailable routes.
 * The caller still authenticates the source block/genesis/runtime and original causal study/file envelope.
 */
export async function replayGoalTargetRuntimeEstimate(
  raw: GoalTargetRuntimeEstimateReplayInput
): Promise<GoalTargetRuntimeReplayedEstimate> {
  return replayTargetRuntimeEstimate(raw, false);
}
/** Replay the original catalog source identity and exact target outputs; copied catalogs cannot confer authority. */
export async function replayGoalCatalogTargetRuntimeEstimate(
  raw: GoalCatalogTargetRuntimeEstimateReplayInput
): Promise<GoalTargetRuntimeReplayedEstimate> {
  return replayTargetRuntimeEstimate(raw, true);
}
async function replayTargetRuntimeEstimate(
  raw: GoalTargetRuntimeEstimateReplayInput | GoalCatalogTargetRuntimeEstimateReplayInput,
  catalogMode: boolean
): Promise<GoalTargetRuntimeReplayedEstimate> {
  const input = own(
    raw,
    [
      'compressedBytes',
      'sourceBlock',
      'sourceMetadataHex',
      'receipts',
      'estimate',
      ...(catalogMode ? ['catalog', 'sourceCodeHash'] : []),
    ],
    ['signal', 'timeoutMs']
  );
  const catalog = catalogMode ? input.catalog : undefined;
  if (catalogMode) assertGoalRuntimeCatalog(catalog);
  check(input.signal === undefined || input.signal instanceof AbortSignal, 'signal');
  const signal = input.signal as AbortSignal | undefined;
  const timeoutMs = input.timeoutMs ?? 20000;
  check(Number.isSafeInteger(timeoutMs) && (timeoutMs as number) >= 1 && (timeoutMs as number) <= 30000, 'timeout');
  const deadline = performance.now() + (timeoutMs as number);
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs as number);
  signal?.addEventListener('abort', abort, { once: true });
  let adapter: Adapter | undefined;
  let verified: GoalTargetRuntimeReplayedEstimate | undefined;
  const current = () => {
    check(!signal?.aborted, 'aborted');
    check(!timedOut && performance.now() < deadline, 'timeout');
  };
  const remaining = () => {
    current();
    const duration = Math.floor(deadline - performance.now());
    check(duration >= 1, 'timeout');
    return duration;
  };
  try {
    current();
    const sourceBlock = snapshot(input.sourceBlock).value;
    const receipts = snapshot(input.receipts).value;
    const saved = snapshot(input.estimate);
    const request = pendingEstimate(saved.value);
    check(
      typeof input.sourceMetadataHex === 'string' &&
        input.sourceMetadataHex.length <= 2 + 4 * 1024 * 1024 &&
        /^0x(?:[0-9a-f]{2})+$/.test(input.sourceMetadataHex),
      'source metadata'
    );
    const sourceMetadataHex = input.sourceMetadataHex;
    if (catalogMode) {
      assertGoalRuntimeCatalog(catalog);
      const entry = lookupGoalRuntimeCatalogEntry(catalog, input.sourceCodeHash as string);
      check(entry.role === 'historical-source' && entry.metadataHex === sourceMetadataHex, 'source catalog pin');
    } else
      check(
        sha(Buffer.from(sourceMetadataHex.slice(2), 'hex')) === GOAL_TARGET_STATE_PROFILES.source.metadataSha256,
        'source metadata pin'
      );
    current();
    adapter = await createGoalTargetRuntimeAsyncQuoteAdapter({
      compressedBytes: input.compressedBytes as Uint8Array,
      signal: controller.signal,
      readinessTimeoutMs: remaining(),
      invocationTimeoutMs: remaining(),
    });
    current();
    if (catalogMode)
      check((catalog as GoalRuntimeCatalog).target.metadataHex === adapter.metadataHex, 'target catalog pin');
    const codec = catalogMode
      ? createGoalCatalogTargetRuntimeStateCodec({
          catalog: catalog as GoalRuntimeCatalog,
          sourceCodeHash: input.sourceCodeHash as string,
        })
      : createGoalTargetRuntimeStateCodec({ sourceMetadataHex, targetMetadataHex: adapter.metadataHex });
    const state = codec.verify({ sourceBlock, receipts });
    current();
    const recomputed = await adapter.quote(
      { state, ...request },
      { signal: controller.signal, timeoutMs: remaining() }
    );
    current();
    const actual = snapshot(recomputed);
    check(sha(actual.canonical) === sha(saved.canonical) && actual.canonical === saved.canonical, 'estimate mismatch');
    current();
    verified = recomputed;
  } catch (error) {
    current();
    throw error;
  } finally {
    try {
      await adapter?.dispose();
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }
  current();
  check(verified, 'missing result');
  return verified;
}
