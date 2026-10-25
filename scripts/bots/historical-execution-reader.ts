/**
 * Bounded public archive reader for hypothetical KUSD/XOR execution estimates.
 * Every state read is pinned to one requested historical hash. RPC-attested
 * canonical finality is not a cryptographic proof, historical arrival time, or
 * evidence that a hypothetical transaction would have been included or filled.
 */
import { createHash } from 'node:crypto';
import {
  createHistoricalExecutionCodec,
  assertHistoricalFeeDetailsMatchesQueryInfo,
} from './historical-execution-codec';

export const HISTORICAL_EXECUTION_ENDPOINT = 'https://mof2.sora.org/';
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';
const KUSD = '0x02000c0000000000000000000000000000000000000000000000000000000000';
const HASH = /^0x[0-9a-f]{64}$/;
const HEX = /^0x(?:[0-9a-fA-F]{2})+$/;
const U128_MAX = (1n << 128n) - 1n;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const MAX_CALLS = 24;

/** The source receipt is caller-provided provenance, independently verified upstream. */
export interface HistoricalExecutionRequest {
  block: { hash: string; height: number };
  finalizedSource: { hash: string; height: number; receiptSha256: string };
  expectedDenominator: string;
  assetIn: string;
  assetOut: string;
  amountInCodec: string;
}

/** Public raw JSON-RPC evidence; callers must avoid logging market values. */
export interface HistoricalRpcEvidence {
  id: number;
  method: string;
  params: readonly unknown[];
  requestedAt: string;
  completedAt?: string;
  httpStatus?: number;
  responseBody?: string;
  responseSha256?: string;
  failure?: string;
}

/** Injectable HTTP transport is for offline tests; no provider or signing authority is accepted. */
export interface HistoricalExecutionReaderOptions {
  signal?: AbortSignal;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

/** Preserve bounded completed/failed reads for diagnosis without exposing values in an error message. */
export class HistoricalExecutionReadError extends Error {
  constructor(
    readonly diagnostic: {
      stage: string;
      reason: string;
      rpcEvidence: readonly HistoricalRpcEvidence[];
      financialActions: false;
    }
  ) {
    super(`Historical execution read failed: ${diagnostic.stage} (${diagnostic.reason})`);
    this.name = 'HistoricalExecutionReadError';
  }
}

function requireValue(condition: unknown): asserts condition {
  if (!condition) throw new Error('invalid-evidence');
}

/** Reject accessors/prototype-bearing input before copying the request. */
function object(value: unknown): Record<string, unknown> {
  requireValue(value && typeof value === 'object' && !Array.isArray(value));
  requireValue([Object.prototype, null].includes(Object.getPrototypeOf(value)));
  requireValue(Reflect.ownKeys(value).every((key) => typeof key === 'string'));
  requireValue(Object.values(Object.getOwnPropertyDescriptors(value)).every((item) => 'value' in item));
  return value as Record<string, unknown>;
}

function unsigned(value: unknown, positive = false): string {
  requireValue(typeof value === 'string' && /^(?:0|[1-9]\d{0,38})$/.test(value));
  const number = BigInt(value);
  requireValue(number <= U128_MAX && (!positive || number > 0n));
  return value;
}

function height(value: unknown): number {
  requireValue(Number.isSafeInteger(value) && Number(value) > 0);
  return value as number;
}

function hash(value: unknown): string {
  requireValue(typeof value === 'string' && HASH.test(value));
  return value;
}

/** Capture immutable scalar inputs so caller mutation during an await cannot change the scenario. */
function requestCopy(input: HistoricalExecutionRequest): HistoricalExecutionRequest {
  const source = object(input);
  const block = object(source.block);
  const anchor = object(source.finalizedSource);
  const requested = { hash: hash(block.hash), height: height(block.height) };
  const finalized = { hash: hash(anchor.hash), height: height(anchor.height), receiptSha256: anchor.receiptSha256 };
  requireValue(typeof finalized.receiptSha256 === 'string' && /^[0-9a-f]{64}$/.test(finalized.receiptSha256));
  requireValue(finalized.height >= requested.height);
  requireValue(
    (source.assetIn === KUSD && source.assetOut === XOR) || (source.assetIn === XOR && source.assetOut === KUSD)
  );
  return {
    block: requested,
    finalizedSource: { ...finalized, receiptSha256: finalized.receiptSha256 },
    expectedDenominator: unsigned(source.expectedDenominator, true),
    assetIn: source.assetIn as string,
    assetOut: source.assetOut as string,
    amountInCodec: unsigned(source.amountInCodec, true),
  };
}

/** Canonical JSON comparison is bounded to the small runtime-version response. */
function canonical(value: unknown, depth = 0): string {
  requireValue(depth < 12);
  if (Array.isArray(value)) {
    requireValue(value.length <= 256);
    return `[${value.map((item) => canonical(item, depth + 1)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const fields = object(value);
    requireValue(Object.keys(fields).length <= 64);
    return `{${Object.keys(fields)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(fields[key], depth + 1)}`)
      .join(',')}}`;
  }
  requireValue(value === null || ['string', 'number', 'boolean'].includes(typeof value));
  return JSON.stringify(value);
}

function runtime(value: unknown): { specVersion: number; transactionVersion: number } {
  const version = object(value);
  requireValue(version.specName === 'sora-substrate');
  for (const key of ['specVersion', 'transactionVersion']) {
    requireValue(Number.isSafeInteger(version[key]) && Number(version[key]) >= 0 && Number(version[key]) <= 0xffffffff);
  }
  requireValue(Number(version.specVersion) > 0 && Array.isArray(version.apis) && version.apis.length <= 256);
  for (const api of version.apis) {
    requireValue(Array.isArray(api) && api.length === 2 && /^0x[0-9a-f]{16}$/.test(api[0]));
    requireValue(Number.isSafeInteger(api[1]) && api[1] >= 0 && api[1] <= 0xffffffff);
  }
  return { specVersion: version.specVersion as number, transactionVersion: version.transactionVersion as number };
}

function header(value: unknown): { height: number; parentHash: string } {
  const source = object(value);
  requireValue(typeof source.number === 'string' && /^0x[0-9a-f]+$/.test(source.number));
  const number = BigInt(source.number);
  requireValue(number > 0n && number <= BigInt(Number.MAX_SAFE_INTEGER));
  hash(source.stateRoot);
  hash(source.extrinsicsRoot);
  const digest = object(source.digest);
  requireValue(Array.isArray(digest.logs) && digest.logs.length <= 128);
  requireValue(digest.logs.every((log) => typeof log === 'string' && HEX.test(log) && log.length <= 65538));
  return { height: Number(number), parentHash: hash(source.parentHash) };
}

function quote(value: unknown, request: HistoricalExecutionRequest) {
  const source = object(value);
  const amountOutCodec = unsigned(source.amount, true);
  const amountWithoutImpactCodec = unsigned(source.amount_without_impact, true);
  requireValue(BigInt(amountWithoutImpactCodec) >= BigInt(amountOutCodec));
  requireValue(Array.isArray(source.route) && source.route.length === 2);
  requireValue(source.route[0] === request.assetIn && source.route[1] === request.assetOut);
  const fees = object(source.fee);
  requireValue(Object.keys(fees).length === 1 && Object.keys(fees)[0] === XOR);
  const poolFeeCodec = unsigned(fees[XOR]);
  return {
    amountOutCodec,
    amountWithoutImpactCodec,
    poolFeeCodec,
    feeAssetAddress: XOR,
    route: [request.assetIn, request.assetOut],
  };
}

/**
 * Read one hypothetical exact-input quote and its fee envelope, never a fill.
 * The supplied source anchor is additionally checked against a single observed
 * finalized head and canonical RPC hashes. This is RPC attestation only; callers
 * separately decide causal research timing and acceptance of their source proof.
 */
export async function readHistoricalExecutionQuote(
  input: HistoricalExecutionRequest,
  options: HistoricalExecutionReaderOptions = {}
) {
  const evidence: HistoricalRpcEvidence[] = [];
  let stage = 'request';
  let totalBytes = 0;
  try {
    const request = requestCopy(input);
    const timeoutMs = options.timeoutMs ?? 20_000;
    const signal = options.signal;
    requireValue(Number.isSafeInteger(timeoutMs) && timeoutMs >= 1 && timeoutMs <= 30_000);
    const transport = options.fetch ?? globalThis.fetch;
    requireValue(typeof transport === 'function');
    const checkAbort = () => {
      if (signal?.aborted) throw new Error('aborted');
    };

    /** Single bounded request; body timeout and cancellation cover every byte, with no retry. */
    const rpc = async (method: string, params: readonly unknown[]): Promise<unknown> => {
      checkAbort();
      requireValue(evidence.length < MAX_CALLS);
      const item: HistoricalRpcEvidence = {
        id: evidence.length + 1,
        method,
        params,
        requestedAt: new Date().toISOString(),
      };
      evidence.push(item);
      const controller = new AbortController();
      let activeReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      let ended = false;
      let rejectAbort: (error: Error) => void;
      let abortReason = 'aborted';
      const aborted = new Promise<never>((_, reject) => {
        rejectAbort = reject;
      });
      const abort = () => {
        if (ended) return;
        controller.abort();
        void activeReader?.cancel().catch(() => undefined);
        rejectAbort(new Error(abortReason));
      };
      signal?.addEventListener('abort', abort, { once: true });
      const timer = setTimeout(() => {
        abortReason = 'timeout';
        abort();
      }, timeoutMs);
      const checkRequest = () => {
        if (ended || controller.signal.aborted) throw new Error(abortReason);
        checkAbort();
      };
      const pending = async () => {
        const response = await transport(HISTORICAL_EXECUTION_ENDPOINT, {
          method: 'POST',
          redirect: 'error',
          credentials: 'omit',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: item.id, method, params }),
          signal: controller.signal,
        });
        try {
          checkRequest();
        } catch (error) {
          // An injected/nonconforming transport may ignore AbortSignal and resolve
          // after the diagnostic was returned. Cancel it without touching evidence.
          void response.body?.cancel().catch(() => undefined);
          throw error;
        }
        item.httpStatus = response.status;
        requireValue(!response.redirected && (!response.url || response.url === HISTORICAL_EXECUTION_ENDPOINT));
        const length = response.headers.get('content-length');
        if (length !== null) requireValue(/^\d+$/.test(length) && Number(length) <= MAX_RESPONSE_BYTES);
        requireValue(response.body);
        const reader = response.body.getReader();
        activeReader = reader;
        const chunks: Uint8Array[] = [];
        let bytes = 0;
        try {
          while (true) {
            const chunk = await reader.read();
            checkRequest();
            if (chunk.done) break;
            bytes += chunk.value.byteLength;
            totalBytes += chunk.value.byteLength;
            if (bytes > MAX_RESPONSE_BYTES || totalBytes > MAX_TOTAL_BYTES) throw new Error('response-limit');
            chunks.push(chunk.value);
          }
        } finally {
          if (controller.signal.aborted || bytes > MAX_RESPONSE_BYTES || totalBytes > MAX_TOTAL_BYTES) {
            void reader.cancel().catch(() => undefined);
          }
          reader.releaseLock();
          activeReader = undefined;
        }
        checkRequest();
        const raw = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
        item.responseBody = raw;
        item.responseSha256 = createHash('sha256').update(raw).digest('hex');
        requireValue(response.status === 200);
        const result = object(JSON.parse(raw));
        requireValue(result.jsonrpc === '2.0' && result.id === item.id && !('error' in result) && 'result' in result);
        return result.result;
      };
      try {
        checkAbort();
        return await Promise.race([pending(), aborted]);
      } catch (error) {
        controller.abort();
        item.failure =
          error instanceof Error && ['aborted', 'timeout', 'response-limit'].includes(error.message)
            ? error.message
            : 'rpc-failed';
        throw new Error(item.failure);
      } finally {
        ended = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        item.completedAt = new Date().toISOString();
      }
    };

    stage = 'finality';
    requireValue((await rpc('chain_getBlockHash', [0])) === GENESIS);
    const finalizedHash = hash(await rpc('chain_getFinalizedHead', []));
    const finalized = header(await rpc('chain_getHeader', [finalizedHash]));
    requireValue(finalized.height >= request.finalizedSource.height);
    requireValue((await rpc('chain_getBlockHash', [request.finalizedSource.height])) === request.finalizedSource.hash);
    requireValue((await rpc('chain_getBlockHash', [request.block.height])) === request.block.hash);
    const atHeader = header(await rpc('chain_getHeader', [request.block.hash]));
    requireValue(atHeader.height === request.block.height);
    const parentHeader = header(await rpc('chain_getHeader', [atHeader.parentHash]));
    requireValue(parentHeader.height + 1 === request.block.height);

    stage = 'runtime';
    const postRuntime = await rpc('state_getRuntimeVersion', [request.block.hash]);
    const parentRuntime = await rpc('state_getRuntimeVersion', [atHeader.parentHash]);
    const runtimeVersion = runtime(postRuntime);
    runtime(parentRuntime);
    requireValue(canonical(postRuntime) === canonical(parentRuntime));
    const metadataHex = await rpc('state_getMetadata', [request.block.hash]);
    const parentMetadata = await rpc('state_getMetadata', [atHeader.parentHash]);
    requireValue(typeof metadataHex === 'string' && HEX.test(metadataHex));
    requireValue(typeof parentMetadata === 'string' && metadataHex.toLowerCase() === parentMetadata.toLowerCase());
    const codec = createHistoricalExecutionCodec({
      genesisHash: GENESIS,
      blockHash: request.block.hash,
      metadataHex,
      runtimeVersion,
    });

    stage = 'state';
    const keys = codec.storageKeys();
    const labels = ['timestamp', 'denominator', 'kusd', 'xor', 'dex0'] as const;
    const rawStorage = {} as Record<(typeof labels)[number], string | null>;
    requireValue(new Set(labels.map((label) => keys[label])).size === labels.length);
    for (const label of labels) {
      requireValue(typeof keys[label] === 'string' && HEX.test(keys[label]) && keys[label].length <= 1026);
      const raw = await rpc('state_getStorage', [keys[label], request.block.hash]);
      requireValue(raw === null || (typeof raw === 'string' && HEX.test(raw)));
      rawStorage[label] = raw as string | null;
    }
    const state = codec.decodeStorage(rawStorage);
    requireValue(state.denominator === request.expectedDenominator);
    requireValue(
      state.assets.kusd.assetId === KUSD && state.assets.kusd.symbol === 'KUSD' && state.assets.kusd.decimals === 18
    );
    requireValue(
      state.assets.xor.assetId === XOR && state.assets.xor.symbol === 'XOR' && state.assets.xor.decimals === 18
    );
    requireValue(state.dex.id === 0 && state.dex.baseAssetId === XOR);
    requireValue(Number.isSafeInteger(state.timestampMs) && state.timestampMs > 0);
    const context = {
      endpoint: HISTORICAL_EXECUTION_ENDPOINT,
      genesisHash: GENESIS,
      block: request.block,
      parentHash: atHeader.parentHash,
      finalizedSource: request.finalizedSource,
      finalityAttestation: { kind: 'rpc-canonical-finalized' as const, hash: finalizedHash, height: finalized.height },
      expectedDenominator: request.expectedDenominator,
      state,
      codecBinding: codec.binding,
      causalArrivalTimeKnown: false as const,
    };

    stage = 'quote';
    const rawQuote = await rpc('liquidityProxy_quote', [
      0,
      request.assetIn,
      request.assetOut,
      request.amountInCodec,
      'WithDesiredInput',
      ['XYKPool'],
      'AllowSelected',
      request.block.hash,
    ]);
    if (rawQuote === null)
      return { kind: 'historical-quote-unavailable' as const, context, request, rpcEvidence: evidence };
    const normalized = quote(rawQuote, request);
    stage = 'envelope';
    const envelope = codec.buildSwapEnvelope({
      assetIn: request.assetIn,
      assetOut: request.assetOut,
      amountInCodec: request.amountInCodec,
      quotedAmountOutCodec: normalized.amountOutCodec,
    });
    stage = 'fees';
    const infoHex = await rpc('state_call', [
      'TransactionPaymentApi_query_info',
      envelope.feeQueryDataHex,
      request.block.hash,
    ]);
    const detailsHex = await rpc('state_call', [
      'TransactionPaymentApi_query_fee_details',
      envelope.feeQueryDataHex,
      request.block.hash,
    ]);
    requireValue(
      typeof infoHex === 'string' && HEX.test(infoHex) && typeof detailsHex === 'string' && HEX.test(detailsHex)
    );
    const info = codec.decodeQueryInfo(infoHex);
    const details = assertHistoricalFeeDetailsMatchesQueryInfo(detailsHex, info.partialFeeCodec, '0');
    checkAbort();
    return {
      kind: 'hypothetical-historical-execution-estimate' as const,
      context,
      request,
      quote: { ...normalized, raw: rawQuote, dexId: 0, liquiditySource: 'XYKPool', slippageBps: 50 },
      envelope,
      fees: { assetId: XOR, info, details },
      rpcEvidence: evidence,
      observedFill: false as const,
      transactionSubmitted: false as const,
    };
  } catch (error) {
    const reason =
      error instanceof Error && ['aborted', 'timeout', 'response-limit', 'rpc-failed'].includes(error.message)
        ? error.message
        : 'invalid-evidence';
    throw new HistoricalExecutionReadError({ stage, reason, rpcEvidence: evidence, financialActions: false });
  }
}
