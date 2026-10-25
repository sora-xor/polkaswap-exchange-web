/** Restricted raw reads on the caller's connected SDK; no endpoint, wallet or submission capability. */

const XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';
const KUSD = '0x02000c0000000000000000000000000000000000000000000000000000000000';
const MAX_U128 = (1n << 128n) - 1n;

/** The execution-state provider validates raw results and binds their metadata, state and finality. */
export type GoalRpcMethod =
  | 'chain_getBlockHash'
  | 'chain_getFinalizedHead'
  | 'chain_getHeader'
  | 'state_getRuntimeVersion'
  | 'state_getMetadata'
  | 'state_getStorageHash'
  | 'state_queryStorageAt'
  | 'state_call'
  | 'liquidityProxy_quote';

/** SDK raw promise decoration is structural; no private provider access or output codec conversion. */
interface RawMethod {
  readonly raw: (...params: never[]) => Promise<unknown>;
}
export interface GoalRpcClient {
  readonly rpc: {
    readonly chain: {
      readonly getBlockHash: RawMethod;
      readonly getFinalizedHead: RawMethod;
      readonly getHeader: RawMethod;
    };
    readonly state: {
      readonly getRuntimeVersion: RawMethod;
      readonly getMetadata: RawMethod;
      readonly getStorageHash: RawMethod;
      readonly queryStorageAt: RawMethod;
      readonly call: RawMethod;
    };
    readonly liquidityProxy: { readonly quote: RawMethod };
  };
}

/** The caller's guard binds the captured client to its current connection/runtime identity. */
export interface GoalRpcOptions {
  client: GoalRpcClient;
  isCurrent: () => boolean;
}

/** Stable errors avoid exposing arbitrary SDK exception text. */
export class GoalRpcError extends Error {
  constructor(readonly reason: 'invalid-input' | 'unavailable' | 'context-changed' | 'aborted' | 'rpc-failed') {
    super(`Goal RPC ${reason}`);
    this.name = 'GoalRpcError';
  }
}

function requireValue(value: unknown): asserts value {
  if (!value) throw new GoalRpcError('invalid-input');
}

/** Copy bounded dense arrays from own data descriptors; never call input getters or toJSON. */
function array(input: unknown, count: number): unknown[] {
  requireValue(Array.isArray(input) && Object.getPrototypeOf(input) === Array.prototype);
  const length = Object.getOwnPropertyDescriptor(input, 'length');
  requireValue(length && 'value' in length && length.value === count);
  const descriptors = Object.getOwnPropertyDescriptors(input);
  requireValue(Reflect.ownKeys(descriptors).length === count + 1);
  return Array.from({ length: count }, (_, index) => {
    const item = descriptors[String(index)];
    requireValue(item?.enumerable && 'value' in item);
    return item.value;
  });
}

function hex(input: unknown, minimumBytes: number, maximumBytes = minimumBytes): string {
  requireValue(
    typeof input === 'string' &&
      input.length >= 2 + minimumBytes * 2 &&
      input.length <= 2 + maximumBytes * 2 &&
      /^0x(?:[0-9a-fA-F]{2})+$/.test(input)
  );
  return input;
}

/** The transport allowlist is deliberately narrower than the SDK's public read surface. */
function paramsCopy(method: GoalRpcMethod, input: readonly unknown[]): readonly unknown[] {
  let p: unknown[];
  switch (method) {
    case 'chain_getBlockHash':
      p = array(input, 1);
      requireValue(Number.isSafeInteger(p[0]) && (p[0] as number) >= 0 && (p[0] as number) <= 0xffff_ffff);
      break;
    case 'chain_getFinalizedHead':
      p = array(input, 0);
      break;
    case 'chain_getHeader':
    case 'state_getRuntimeVersion':
    case 'state_getMetadata':
      p = array(input, 1);
      hex(p[0], 32);
      break;
    case 'state_getStorageHash':
      p = array(input, 2);
      requireValue(p[0] === '0x3a636f6465');
      hex(p[1], 32);
      break;
    case 'state_queryStorageAt': {
      p = array(input, 2);
      const keys = array(p[0], 7).map((key) => hex(key, 1, 512));
      requireValue(new Set(keys.map((key) => key.toLowerCase())).size === 7);
      p[0] = Object.freeze(keys);
      hex(p[1], 32);
      break;
    }
    case 'state_call':
      p = array(input, 3);
      requireValue(p[0] === 'TransactionPaymentApi_query_info' || p[0] === 'TransactionPaymentApi_query_fee_details');
      hex(p[1], 1, 4096);
      hex(p[2], 32);
      break;
    case 'liquidityProxy_quote':
      p = array(input, 8);
      requireValue(p[0] === 0 && ((p[1] === KUSD && p[2] === XOR) || (p[1] === XOR && p[2] === KUSD)));
      requireValue(typeof p[3] === 'string' && /^[1-9]\d{0,38}$/.test(p[3]) && BigInt(p[3]) <= MAX_U128);
      requireValue(p[4] === 'WithDesiredInput' && p[6] === 'AllowSelected');
      requireValue(array(p[5], 1)[0] === 'XYKPool');
      p[5] = Object.freeze(['XYKPool']);
      hex(p[7], 32);
      break;
    default:
      throw new GoalRpcError('invalid-input');
  }
  return Object.freeze(p);
}

/**
 * Capture the connected client's public .raw promises and a connection guard. Abort cancels this
 * adapter's wait only; a shared SDK request may remain in flight and its late result is discarded.
 * There are no retries, fallback endpoints, wire-cancellation claims or shared-socket disconnects.
 * The caller owns operation deadlines and semantic validation of the untouched raw JSON results.
 */
export function createGoalRpc(input: GoalRpcOptions) {
  requireValue(input && typeof input === 'object' && Object.getPrototypeOf(input) === Object.prototype);
  const options = Object.getOwnPropertyDescriptors(input);
  requireValue(
    Reflect.ownKeys(options).length === 2 &&
      ['client', 'isCurrent'].every((key) => options[key]?.enumerable && 'value' in options[key])
  );
  const client = options.client.value as GoalRpcClient;
  const isCurrent = options.isCurrent.value as () => boolean;
  requireValue(typeof isCurrent === 'function');
  const calls = new Map<GoalRpcMethod, (params: readonly unknown[]) => Promise<unknown>>();
  try {
    // The SDK's lazy method getters are trusted integration objects, unlike request parameters.
    const entries: readonly [GoalRpcMethod, RawMethod][] = [
      ['chain_getBlockHash', client.rpc.chain.getBlockHash],
      ['chain_getFinalizedHead', client.rpc.chain.getFinalizedHead],
      ['chain_getHeader', client.rpc.chain.getHeader],
      ['state_getRuntimeVersion', client.rpc.state.getRuntimeVersion],
      ['state_getMetadata', client.rpc.state.getMetadata],
      ['state_getStorageHash', client.rpc.state.getStorageHash],
      ['state_queryStorageAt', client.rpc.state.queryStorageAt],
      ['state_call', client.rpc.state.call],
      ['liquidityProxy_quote', client.rpc.liquidityProxy.quote],
    ];
    for (const [method, owner] of entries) {
      const raw = owner.raw;
      if (typeof raw !== 'function') throw new GoalRpcError('unavailable');
      calls.set(method, (params) => Reflect.apply(raw, owner, params));
    }
  } catch {
    throw new GoalRpcError('unavailable');
  }
  const request = async (
    method: GoalRpcMethod,
    inputParams: readonly unknown[],
    signal: AbortSignal
  ): Promise<unknown> => {
    const params = paramsCopy(method, inputParams);
    requireValue(signal instanceof AbortSignal);
    const current = () => {
      if (signal.aborted) throw new GoalRpcError('aborted');
      try {
        if (isCurrent() !== true) throw new GoalRpcError('context-changed');
      } catch {
        throw new GoalRpcError('context-changed');
      }
      if (signal.aborted) throw new GoalRpcError('aborted');
    };
    current();
    let onAbort: () => void = () => undefined;
    const interrupted = new Promise<never>((_resolve, reject) => {
      onAbort = () => reject(new GoalRpcError('aborted'));
      signal.addEventListener('abort', onAbort, { once: true });
    });
    try {
      current();
      const pending = calls.get(method)!(params);
      const result = await Promise.race([pending, interrupted]);
      current();
      return result;
    } catch (error) {
      current();
      if (error instanceof GoalRpcError) throw error;
      throw new GoalRpcError('rpc-failed');
    } finally {
      signal.removeEventListener('abort', onAbort);
    }
  };
  return Object.freeze({ request });
}
