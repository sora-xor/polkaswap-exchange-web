/** Offline target131 API estimates over verified historical storage; no network, signing or admission. */
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { TypeRegistry } from '@polkadot/types';
import type { BTreeMap, Option, Struct, Vec } from '@polkadot/types-codec';
import type { Codec } from '@polkadot/types-codec/types';
import { types } from '../../src/lib/substrate/type-definitions';
import {
  assertHistoricalFeeDetailsMatchesQueryInfo,
  createHistoricalExecutionCodec,
  historicalMinimumCodec,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from './historical-execution-codec';
import { createHistoricalGoalFeeCodec } from './historical-goal-fee-codec';
import {
  assertGoalTargetRuntimeState,
  GOAL_TARGET_STATE_PROFILES,
  type GoalTargetRuntimeState,
} from './goal-target-runtime-state';
import { createGoalTargetRuntimeHost } from './goal-target-runtime-host.cjs';
import {
  assertGoalTargetRuntimeWorker,
  createGoalTargetRuntimeWorker,
  type GoalTargetRuntimeWorker,
  type GoalTargetRuntimeWorkerOptions,
  type GoalTargetRuntimeWorkerCallOptions,
  type GoalTargetRuntimeWorkerInvocation,
  type GoalTargetRuntimeWorkerResult,
} from './goal-target-runtime-worker-client';

const MAX = (1n << 128n) - 1n;
const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const failure = (reason: string): never => {
  throw new Error(`Invalid target-runtime quote: ${reason}`);
};
const requireValue: (value: unknown, reason: string) => asserts value = (value, reason) => {
  if (!value) failure(reason);
};
const hex = (bytes: Uint8Array) => `0x${Buffer.from(bytes).toString('hex')}`;

/** Complete host receipt is retained even when an allowed API traps or returns malformed bytes. */
export interface GoalTargetRuntimeApiReceipt {
  readonly api:
    | 'LiquidityProxyAPI_quote'
    | 'TransactionPaymentApi_query_info'
    | 'TransactionPaymentApi_query_fee_details';
  readonly inputHex: string;
  readonly hostReceipt: GoalTargetRuntimeWorkerResult;
}
/** Failure evidence contains public hypothetical API data only, never a wallet or signing credential. */
export class GoalTargetRuntimeQuoteError extends Error {
  constructor(
    readonly stage: 'quote' | 'envelope' | 'info' | 'details',
    readonly receipts: readonly GoalTargetRuntimeApiReceipt[],
    readonly reason: 'invalid-evidence' | 'cancelled' | 'timeout' | 'worker-unavailable' = 'invalid-evidence'
  ) {
    super(`Target runtime estimate unavailable: ${stage}`);
    this.name = 'GoalTargetRuntimeQuoteError';
  }
}
function fields(value: unknown, expected: readonly string[], optional = false): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype)
    return failure('data object');
  const d = Object.getOwnPropertyDescriptors(value);
  const names = Reflect.ownKeys(d);
  if (
    names.some((k) => typeof k !== 'string' || !expected.includes(k) || !d[k].enumerable || !('value' in d[k])) ||
    (!optional && names.length !== expected.length)
  )
    return failure('own fields');
  return Object.fromEntries(names.map((k) => [k, d[k as string].value]));
}
function amount(value: unknown, positive = true): string {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,38})$/.test(value)) return failure('amount');
  const n = BigInt(value);
  if (n > MAX || (positive && n === 0n)) return failure('amount');
  return value;
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function request(value: unknown) {
  const raw = fields(value, ['state', 'assetIn', 'assetOut', 'amountInCodec']);
  assertGoalTargetRuntimeState(raw.state);
  const state: GoalTargetRuntimeState = raw.state;
  requireValue(
    (raw.assetIn === KUSD && raw.assetOut === XOR) || (raw.assetIn === XOR && raw.assetOut === KUSD),
    'native pair'
  );
  return {
    state,
    assetIn: raw.assetIn as string,
    assetOut: raw.assetOut as string,
    amountInCodec: amount(raw.amountInCodec),
  };
}

/** Reuse the existing SDK API-v3 definitions, with complete SCALE roundtrip and exact native-route checks. */
function decodeQuote(registry: TypeRegistry, raw: string, input: { assetIn: string; assetOut: string }) {
  requireValue(typeof raw === 'string' && raw.length <= 8194 && /^0x(?:[0-9a-f]{2})+$/.test(raw), 'quote bytes');
  const decoded = registry.createType<Option<Struct>>('Option<LPSwapOutcomeInfo>', Buffer.from(raw.slice(2), 'hex'));
  requireValue(hex(decoded.toU8a()) === raw, 'quote SCALE roundtrip');
  if (decoded.isNone) return null;
  const value = decoded.unwrap();
  const amountOutCodec = amount(value.get('amount')?.toString());
  const amountWithoutImpactCodec = amount(value.get('amountWithoutImpact')?.toString());
  requireValue(BigInt(amountWithoutImpactCodec) >= BigInt(amountOutCodec), 'quote impact');
  const route = Array.from(value.get('route') as Vec<Codec>, (v) => v.toHex());
  requireValue(route.length === 2 && route[0] === input.assetIn && route[1] === input.assetOut, 'quote route');
  requireValue((value.get('rewards') as Vec<Codec>).length === 0, 'quote rewards');
  const fees = Array.from((value.get('fee') as BTreeMap<Codec, Codec>).entries());
  requireValue(fees.length === 1 && fees[0][0].toHex() === XOR, 'quote fee asset');
  return {
    amountOutCodec,
    amountWithoutImpactCodec,
    minimumCodec: historicalMinimumCodec(amountOutCodec),
    poolFeeCodec: amount(fees[0][1].toString(), false),
    feeAssetAddress: XOR,
    route,
  };
}

/** One private codec/receipt program, driven synchronously offline or asynchronously by an owned worker. */
function prepareQuote(profile: GoalTargetRuntimeWorker['profile'], metadataHex: string, value: unknown) {
  requireValue(
    profile.codeHash === GOAL_TARGET_STATE_PROFILES.target.codeHash &&
      profile.metadataSha256 === GOAL_TARGET_STATE_PROFILES.target.metadataSha256,
    'target profile'
  );
  const input = request(value);
  const { state, ...pending } = input;
  const registry = new TypeRegistry();
  registry.register(types);
  const source = {
    block: state.sourceBlock,
    runtimeProfile: state.profiles.source,
    stateSha256: state.stateSha256,
    receiptSha256: state.receiptSha256,
    provenance: state.provenance,
    ...('catalogSha256' in state
      ? { catalogSha256: state.catalogSha256, sourceBindingSha256: state.sourceBindingSha256 }
      : {}),
  };
  const target = { profile, execution: 'read-only-target-api-over-source-state' as const };
  const requestBinding = {
    ...pending,
    dexId: 0 as const,
    source: 'XYKPool' as const,
    filter: 'AllowSelected' as const,
    slippageBasisPoints: 50 as const,
  };
  const common = {
    version: 1 as const,
    source,
    target,
    request: requestBinding,
    observedFill: false as const,
    transactionSubmitted: false as const,
    signatureVerified: false as const,
    feeAdequacyVerified: false as const,
    qualificationEligible: false as const,
    admissionGranted: false as const,
  };
  const identity = {
    genesisHash: state.profiles.source.genesisHash,
    // A decoding/era context only: this remains the actual historical block, never a claimed131 block.
    blockHash: state.sourceBlock.hash,
    metadataHex,
    runtimeVersion: { specVersion: 131, transactionVersion: 131 },
  };
  const execution = createHistoricalExecutionCodec(identity);
  const feeCodec = createHistoricalGoalFeeCodec(identity);
  const receipts: GoalTargetRuntimeApiReceipt[] = [];
  let stage: GoalTargetRuntimeQuoteError['stage'] = 'quote';
  function* invoke(
    api: GoalTargetRuntimeApiReceipt['api'],
    inputHex: string
  ): Generator<GoalTargetRuntimeWorkerInvocation, string, GoalTargetRuntimeWorkerResult> {
    const hostReceipt = yield { api, inputHex, state };
    requireValue(receipts.at(-1)?.hostReceipt === hostReceipt, 'unretained host result');
    requireValue(
      hostReceipt.success === true &&
        hostReceipt.api === api &&
        hostReceipt.stateSha256 === state.stateSha256 &&
        hostReceipt.storageWrites === 0 &&
        hostReceipt.transactionExecution === false &&
        hostReceipt.admissionGranted === false,
      'host result'
    );
    requireValue(typeof hostReceipt.resultHex === 'string', 'host bytes');
    return hostReceipt.resultHex;
  }
  function* run() {
    const tupleType = '(DEXId,AssetId,AssetId,Balance,SwapVariant,Vec<LiquiditySourceType>,FilterMode)';
    const encoded = registry.createType(tupleType, [
      0,
      input.assetIn,
      input.assetOut,
      input.amountInCodec,
      'WithDesiredInput',
      ['XYKPool'],
      'AllowSelected',
    ]);
    const quoteInputHex = hex(encoded.toU8a());
    requireValue(
      quoteInputHex.length === 178 &&
        registry.createType(tupleType, Buffer.from(quoteInputHex.slice(2), 'hex')).toHex() === quoteInputHex,
      'quote input'
    );
    const quote = decodeQuote(registry, yield* invoke('LiquidityProxyAPI_quote', quoteInputHex), pending);
    if (quote === null) {
      const body = { ...common, kind: 'target-runtime-route-unavailable' as const, apis: receipts };
      return freeze({ ...body, evidenceSha256: sha(body) });
    }
    stage = 'envelope';
    const envelope = feeCodec.buildBoundSwapEnvelope(
      { ...pending, quotedAmountOutCodec: quote.amountOutCodec },
      { blockNumber: state.sourceBlock.height }
    );
    requireValue(
      envelope.encodedLength > 0 && envelope.encodedLength <= 215 && envelope.minimumCodec === quote.minimumCodec,
      'bound envelope'
    );
    stage = 'info';
    const info = execution.decodeQueryInfo(yield* invoke('TransactionPaymentApi_query_info', envelope.feeQueryDataHex));
    stage = 'details';
    const details = assertHistoricalFeeDetailsMatchesQueryInfo(
      yield* invoke('TransactionPaymentApi_query_fee_details', envelope.feeQueryDataHex),
      info.partialFeeCodec,
      '0'
    );
    const body = {
      ...common,
      kind: 'hypothetical-target-runtime-execution-estimate' as const,
      quote,
      fees: {
        basis: `target131-api-over-source${state.profiles.source.specVersion}-multiplier` as const,
        assetId: XOR,
        info,
        details,
        feeCodec: details.finalFee,
      },
      envelope: { context: 'target-codec-at-source-block-height-for-estimation-only' as const, bound: envelope },
      apis: receipts,
    };
    return freeze({ ...body, evidenceSha256: sha(body) });
  }
  return {
    run: run(),
    retain(call: GoalTargetRuntimeWorkerInvocation, hostReceipt: GoalTargetRuntimeWorkerResult) {
      receipts.push(
        freeze({ api: call.api as GoalTargetRuntimeApiReceipt['api'], inputHex: call.inputHex, hostReceipt })
      );
    },
    error: (reason: GoalTargetRuntimeQuoteError['reason'] = 'invalid-evidence') =>
      new GoalTargetRuntimeQuoteError(stage, freeze(receipts.slice()), reason),
  };
}

/** Synchronous exact-binary adapter for offline tools; production orchestration uses the async worker factory. */
export function createGoalTargetRuntimeQuoteAdapter(compressedRuntimeBytes: Buffer) {
  const host = createGoalTargetRuntimeHost(compressedRuntimeBytes);
  return Object.freeze({
    profile: host.profile as GoalTargetRuntimeWorker['profile'],
    quote(value: unknown) {
      const program = prepareQuote(host.profile, host.metadataHex, value);
      try {
        let step = program.run.next();
        while (step.done === false) {
          const { state, ...call } = step.value;
          const result = host.invoke({ ...call, state: state!.hostState });
          program.retain(step.value, result);
          step = program.run.next(result);
        }
        requireValue(step.done === true, 'program completion');
        return step.value;
      } catch {
        throw program.error();
      }
    },
  });
}

function timeout(value: unknown, fallback: number): number {
  const result = value === undefined ? fallback : value;
  requireValue(Number.isSafeInteger(result) && (result as number) >= 1 && (result as number) <= 30000, 'timeout');
  return result as number;
}

/**
 * Own a fixed terminable worker. One quote deadline spans all three API calls and local decoding;
 * caller/lifetime cancellation, deadline expiry or disposal prevents returning an estimate.
 */
export async function createGoalTargetRuntimeAsyncQuoteAdapter(raw: GoalTargetRuntimeWorkerOptions) {
  const input = fields(raw, ['compressedBytes', 'signal', 'readinessTimeoutMs', 'invocationTimeoutMs'], true);
  const lifetimeSignal = input.signal as AbortSignal | undefined;
  const defaultTimeout = timeout(input.invocationTimeoutMs, 10000);
  const worker = await createGoalTargetRuntimeWorker(input as unknown as GoalTargetRuntimeWorkerOptions);
  try {
    assertGoalTargetRuntimeWorker(worker);
  } catch (error) {
    await worker.dispose();
    throw error;
  }
  let busy = false;
  return Object.freeze({
    profile: worker.profile,
    metadataHex: worker.metadataHex,
    async quote(value: unknown, rawOptions: GoalTargetRuntimeWorkerCallOptions = {}) {
      assertGoalTargetRuntimeWorker(worker);
      requireValue(!busy, 'busy');
      const options = fields(rawOptions, ['signal', 'timeoutMs'], true);
      requireValue(options.signal === undefined || options.signal instanceof AbortSignal, 'signal');
      const signal = options.signal as AbortSignal | undefined;
      const deadline = performance.now() + timeout(options.timeoutMs, defaultTimeout);
      const checkCurrent = () => {
        requireValue(!signal?.aborted && !lifetimeSignal?.aborted, 'cancelled');
        requireValue(performance.now() < deadline, 'timeout');
        assertGoalTargetRuntimeWorker(worker);
      };
      const program = prepareQuote(worker.profile, worker.metadataHex, value);
      busy = true;
      try {
        checkCurrent();
        let step = program.run.next();
        while (step.done === false) {
          checkCurrent();
          const remaining = Math.floor(deadline - performance.now());
          requireValue(remaining >= 1, 'timeout');
          const result = await worker.invoke(step.value, { signal, timeoutMs: remaining });
          // Retain any completed delivered receipt before checking cancellation or advancing to another API.
          program.retain(step.value, result);
          checkCurrent();
          step = program.run.next(result);
          checkCurrent();
        }
        checkCurrent();
        requireValue(step.done === true, 'program completion');
        return step.value;
      } catch (error) {
        const reason =
          signal?.aborted || lifetimeSignal?.aborted
            ? 'cancelled'
            : performance.now() >= deadline ||
                (error instanceof Error &&
                  ['target-worker:timeout', 'Invalid target-runtime quote: timeout'].includes(error.message))
              ? 'timeout'
              : error instanceof Error && /^target-worker:/.test(error.message)
                ? 'worker-unavailable'
                : 'invalid-evidence';
        await worker.dispose();
        throw program.error(reason);
      } finally {
        busy = false;
      }
    },
    dispose: () => worker.dispose(),
  });
}
