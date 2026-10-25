/** Bounded archive-state acquisition plus owned target131 worker estimates; never signing or admission. */
import { performance } from 'node:perf_hooks';
import { createGoalTargetRuntimeAsyncQuoteAdapter, GoalTargetRuntimeQuoteError } from './goal-target-runtime-quote';
import {
  createGoalTargetRuntimeStateCodec,
  createGoalCatalogTargetRuntimeStateCodec,
  type GoalTargetStateReceipt,
} from './goal-target-runtime-state';
import {
  assertGoalRuntimeCatalog,
  lookupGoalRuntimeCatalogEntry,
  type GoalRuntimeCatalog,
} from '../../src/features/bot-trading/execution-codecs/runtime-catalog';
import { acquireGoalTargetRuntimeState, type GoalTargetStateAcquisition } from './goal-target-runtime-transport';
import { HISTORICAL_EXECUTION_KUSD as KUSD, HISTORICAL_EXECUTION_XOR as XOR } from './historical-execution-codec';

export interface GoalTargetRuntimeArchiveQuoteOptions {
  readonly compressedBytes: Uint8Array;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}
export interface GoalTargetRuntimeArchiveQuoteRequest {
  /** Canonical block and source runtime/genesis/finality authentication belong to the existing market reader. */
  readonly sourceBlock: { readonly hash: string; readonly height: number };
  readonly sourceMetadataHex: string;
  /** Exact PoolXYK.Properties value already authenticated at sourceBlock by the market reader. */
  readonly sourcePropertiesHex: string;
  readonly assetIn: string;
  readonly assetOut: string;
  readonly amountInCodec: string;
  readonly fetch: typeof fetch;
  readonly retain: GoalTargetStateAcquisition['retain'];
}
/** The source code hash comes from the canonical market reader's observed block, never a requested numeric version. */
export interface GoalCatalogTargetRuntimeArchiveQuoteRequest extends GoalTargetRuntimeArchiveQuoteRequest {
  readonly sourceCodeHash: string;
}
export interface GoalCatalogTargetRuntimeArchiveQuoteOptions extends GoalTargetRuntimeArchiveQuoteOptions {
  readonly catalog: GoalRuntimeCatalog;
}
export interface GoalTargetRuntimeArchiveQuoteCallOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}
const check: (value: unknown, reason: string) => asserts value = (value, reason) => {
  if (!value) throw new Error(`target-archive-quote:${reason}`);
};
/** Snapshot only own data fields; executable dependencies are explicit trusted program inputs. */
function fields(value: unknown, allowed: readonly string[], required = allowed): Record<string, unknown> {
  check(value && Object.getPrototypeOf(value) === Object.prototype, 'input');
  const d = Object.getOwnPropertyDescriptors(value);
  check(
    Reflect.ownKeys(d).every((k) => typeof k === 'string' && allowed.includes(k) && d[k].enumerable && 'value' in d[k]),
    'fields'
  );
  check(
    required.every((k) => Object.hasOwn(d, k)),
    'fields'
  );
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.value]));
}
function timeout(value: unknown, fallback: number): number {
  const ms = value === undefined ? fallback : value;
  check(Number.isSafeInteger(ms) && (ms as number) >= 1 && (ms as number) <= 30000, 'timeout');
  return ms as number;
}
function signal(value: unknown): AbortSignal | undefined {
  check(value === undefined || value instanceof AbortSignal, 'signal');
  return value as AbortSignal | undefined;
}
function snapshot(value: unknown, catalogMode = false) {
  const input = fields(value, [
    'sourceBlock',
    'sourceMetadataHex',
    'sourcePropertiesHex',
    'assetIn',
    'assetOut',
    'amountInCodec',
    'fetch',
    'retain',
    ...(catalogMode ? ['sourceCodeHash'] : []),
  ]);
  const block = fields(input.sourceBlock, ['hash', 'height']);
  check(typeof block.hash === 'string' && /^0x[0-9a-f]{64}$/.test(block.hash), 'block');
  check(
    Number.isSafeInteger(block.height) && (block.height as number) > 0 && (block.height as number) <= 0xffffffff,
    'block'
  );
  check(
    typeof input.sourceMetadataHex === 'string' &&
      input.sourceMetadataHex.length <= 2 + 2 * 1024 * 1024 &&
      /^0x(?:[0-9a-f]{2})+$/.test(input.sourceMetadataHex),
    'metadata'
  );
  check(
    typeof input.sourcePropertiesHex === 'string' && /^0x[0-9a-f]{128}$/.test(input.sourcePropertiesHex),
    'properties'
  );
  check(
    (input.assetIn === KUSD && input.assetOut === XOR) || (input.assetIn === XOR && input.assetOut === KUSD),
    'pair'
  );
  check(
    typeof input.amountInCodec === 'string' &&
      /^[1-9]\d{0,38}$/.test(input.amountInCodec) &&
      BigInt(input.amountInCodec) < 1n << 128n,
    'amount'
  );
  check(typeof input.fetch === 'function' && typeof input.retain === 'function', 'dependencies');
  if (catalogMode)
    check(typeof input.sourceCodeHash === 'string' && /^0x[0-9a-f]{64}$/.test(input.sourceCodeHash), 'source-code');
  return {
    sourceBlock: Object.freeze({ hash: block.hash, height: block.height as number }),
    sourceMetadataHex: input.sourceMetadataHex,
    ...(catalogMode ? { sourceCodeHash: input.sourceCodeHash as string } : {}),
    sourcePropertiesHex: input.sourcePropertiesHex,
    assetIn: input.assetIn as string,
    assetOut: input.assetOut as string,
    amountInCodec: input.amountInCodec,
    fetch: input.fetch as typeof fetch,
    retain: input.retain as GoalTargetStateAcquisition['retain'],
  };
}

/**
 * Own one reusable worker session. Each quote has one monotonic deadline across acquisition, raw
 * retention, verification and APIs. The transport may finish its bounded failure-journal cleanup
 * after expiry; no later request or estimate is permitted. No ambient/default fetch is available.
 */
export async function createGoalTargetRuntimeArchiveQuote(raw: GoalTargetRuntimeArchiveQuoteOptions) {
  return createTargetRuntimeArchiveQuote(raw, false);
}
/** Use the same pinned target worker over one authenticated historical profile from the owned catalog. */
export async function createGoalCatalogTargetRuntimeArchiveQuote(raw: GoalCatalogTargetRuntimeArchiveQuoteOptions) {
  return createTargetRuntimeArchiveQuote(raw, true);
}
async function createTargetRuntimeArchiveQuote(
  raw: GoalTargetRuntimeArchiveQuoteOptions | GoalCatalogTargetRuntimeArchiveQuoteOptions,
  catalogMode: boolean
) {
  const options = fields(
    raw,
    ['compressedBytes', 'signal', 'timeoutMs', ...(catalogMode ? ['catalog'] : [])],
    ['compressedBytes', ...(catalogMode ? ['catalog'] : [])]
  );
  const catalog = catalogMode ? options.catalog : undefined;
  if (catalogMode) assertGoalRuntimeCatalog(catalog);
  const parentSignal = signal(options.signal);
  const defaultTimeout = timeout(options.timeoutMs, 20000);
  const adapter = await createGoalTargetRuntimeAsyncQuoteAdapter({
    compressedBytes: options.compressedBytes as Uint8Array,
    signal: parentSignal,
    readinessTimeoutMs: defaultTimeout,
    invocationTimeoutMs: defaultTimeout,
  });
  let closed: string | undefined;
  let busy = false;
  let active: AbortController | undefined;
  let termination: Promise<void> | undefined;
  const close = (reason: string) => {
    if (!closed) {
      closed = reason;
      active?.abort();
      parentSignal?.removeEventListener('abort', parentAbort);
      termination = adapter.dispose();
      void termination.catch(() => undefined);
    }
    return termination ?? Promise.resolve();
  };
  const parentAbort = () => {
    void close('aborted');
  };
  parentSignal?.addEventListener('abort', parentAbort, { once: true });
  if (parentSignal?.aborted) {
    await close('aborted');
    check(false, 'aborted');
  }
  return Object.freeze({
    /** Return complete immutable evidence, including genuine unavailable routes, for the archive sink to retain. */
    async quote(
      rawInput: GoalTargetRuntimeArchiveQuoteRequest | GoalCatalogTargetRuntimeArchiveQuoteRequest,
      rawCall: GoalTargetRuntimeArchiveQuoteCallOptions = {}
    ) {
      check(!closed && !parentSignal?.aborted, closed ?? 'aborted');
      check(!busy, 'busy');
      const call = fields(rawCall, ['signal', 'timeoutMs'], []);
      const callerSignal = signal(call.signal);
      const deadline = performance.now() + timeout(call.timeoutMs, defaultTimeout);
      const input = snapshot(rawInput, catalogMode);
      busy = true;
      const controller = new AbortController();
      active = controller;
      const abort = () => {
        void close('aborted');
      };
      const timer = setTimeout(
        () => {
          void close('timeout');
        },
        Math.max(1, deadline - performance.now())
      );
      callerSignal?.addEventListener('abort', abort, { once: true });
      const current = () => {
        check(
          !closed && !controller.signal.aborted && !callerSignal?.aborted && !parentSignal?.aborted,
          closed ?? 'aborted'
        );
        check(performance.now() < deadline, 'timeout');
      };
      const remaining = () => {
        current();
        const ms = Math.floor(deadline - performance.now());
        check(ms >= 1, 'timeout');
        return ms;
      };
      let delivered: Awaited<ReturnType<typeof adapter.quote>> | undefined;
      try {
        current();
        if (catalogMode) {
          assertGoalRuntimeCatalog(catalog);
          const entry = lookupGoalRuntimeCatalogEntry(catalog, input.sourceCodeHash!);
          check(entry.role === 'historical-source' && entry.metadataHex === input.sourceMetadataHex, 'source-catalog');
          check(catalog.target.metadataHex === adapter.metadataHex, 'target-catalog');
        }
        const codec = catalogMode
          ? createGoalCatalogTargetRuntimeStateCodec({
              catalog: catalog as GoalRuntimeCatalog,
              sourceCodeHash: input.sourceCodeHash!,
            })
          : createGoalTargetRuntimeStateCodec({
              sourceMetadataHex: input.sourceMetadataHex,
              targetMetadataHex: adapter.metadataHex,
            });
        const pool = codec.derivePoolKeys(input.sourcePropertiesHex);
        const acquired = await acquireGoalTargetRuntimeState({
          blockHash: input.sourceBlock.hash,
          pointKeys: [...Object.values(codec.fixedKeys), pool.poolXor, pool.poolKusd],
          prefix: codec.xstPrefix,
          fetch: (url, init) => {
            current();
            return input.fetch(url, init);
          },
          // Failure diagnostics retain their bounded cleanup allowance even after the operation has expired.
          retain: input.retain,
          signal: controller.signal,
          timeoutMs: remaining(),
        });
        current();
        const state = codec.verify({ sourceBlock: input.sourceBlock, receipts: acquired.receipts });
        check(state.hostState.entries[codec.fixedKeys.properties] === input.sourcePropertiesHex, 'properties-changed');
        current();
        delivered = await adapter.quote(
          { state, assetIn: input.assetIn, assetOut: input.assetOut, amountInCodec: input.amountInCodec },
          { signal: controller.signal, timeoutMs: remaining() }
        );
        current();
        // Successful codec verification has rejected nullable HTTP status and every failure receipt.
        return Object.freeze({
          state,
          receipts: acquired.receipts as readonly GoalTargetStateReceipt[],
          estimate: delivered,
        });
      } catch (error) {
        const reason =
          closed ??
          (callerSignal?.aborted || parentSignal?.aborted
            ? 'aborted'
            : performance.now() >= deadline
              ? 'timeout'
              : undefined);
        await close(reason ?? 'failed');
        // Cancellation must not erase public API outputs already delivered by the owned worker.
        if (error instanceof GoalTargetRuntimeQuoteError) throw error;
        if (delivered)
          throw new GoalTargetRuntimeQuoteError(
            delivered.apis.length === 3 ? 'details' : 'quote',
            delivered.apis,
            reason === 'timeout' ? 'timeout' : 'cancelled'
          );
        if (reason) check(false, reason);
        throw error;
      } finally {
        clearTimeout(timer);
        callerSignal?.removeEventListener('abort', abort);
        controller.abort();
        active = undefined;
        busy = false;
      }
    },
    dispose: () => close('disposed'),
  });
}
