// @vitest-environment node
import { RpcCore } from '@polkadot/rpc-core';
import type { ProviderInterface } from '@polkadot/rpc-provider/types';
import { TypeRegistry } from '@polkadot/types';
import { firstValueFrom, type Observable } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { createGoalRpc, type GoalRpcClient, type GoalRpcMethod } from '@/features/agent-trading/goal-rpc';
import { types } from '@/lib/substrate/type-definitions';
import liquidityProxy from '@/lib/substrate/type-definitions/liquidityProxy';

const HASH = `0x${'11'.repeat(32)}`;
const XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';
const KUSD = '0x02000c0000000000000000000000000000000000000000000000000000000000';
const KEYS = Array.from({ length: 7 }, (_, i) => `0x${(i + 1).toString(16).padStart(2, '0')}`);
const signal = () => new AbortController().signal;
const quote = (reverse = false): unknown[] => [
  0,
  reverse ? XOR : KUSD,
  reverse ? KUSD : XOR,
  '1',
  'WithDesiredInput',
  ['XYKPool'],
  'AllowSelected',
  HASH,
];
const methods: readonly [GoalRpcMethod, keyof GoalRpcClient['rpc'], string, readonly unknown[]][] = [
  ['chain_getBlockHash', 'chain', 'getBlockHash', [0]],
  ['chain_getFinalizedHead', 'chain', 'getFinalizedHead', []],
  ['chain_getHeader', 'chain', 'getHeader', [HASH]],
  ['state_getRuntimeVersion', 'state', 'getRuntimeVersion', [HASH]],
  ['state_getMetadata', 'state', 'getMetadata', [HASH]],
  ['state_getStorageHash', 'state', 'getStorageHash', ['0x3a636f6465', HASH]],
  ['state_queryStorageAt', 'state', 'queryStorageAt', [KEYS, HASH]],
  ['state_call', 'state', 'call', ['TransactionPaymentApi_query_info', '0x0102', HASH]],
  ['liquidityProxy_quote', 'liquidityProxy', 'quote', quote()],
];

function fixture() {
  const raw = vi.fn(async (..._params: unknown[]): Promise<unknown> => null);
  const decorated = vi.fn(() => {
    throw new Error('Decorated RPC must not be called');
  });
  const rpc = Object.fromEntries(['chain', 'state', 'liquidityProxy'].map((section) => [section, {}])) as Record<
    string,
    Record<string, unknown>
  >;
  for (const [, section, method] of methods) rpc[section][method] = Object.assign(decorated.bind(null), { raw });
  const client = { rpc } as unknown as GoalRpcClient;
  const isCurrent = vi.fn(() => true);
  return { raw, decorated, client, isCurrent, adapter: createGoalRpc({ client, isCurrent }) };
}

describe('connected SDK goal RPC adapter', () => {
  it.each(methods)(
    'uses only public .raw for %s and preserves its result unchanged',
    async (method, _section, _name, params) => {
      const h = fixture();
      const raw = {
        spec_version: 130,
        amount_without_impact: '340282366920938463463374607431768211455',
        header: { number: '0x1f' },
      };
      h.raw.mockResolvedValueOnce(raw);
      const result = await h.adapter.request(method, params, signal());
      expect(result).toBe(raw);
      expect(h.raw).toHaveBeenCalledExactlyOnceWith(...params);
      expect(h.decorated).not.toHaveBeenCalled();
      expect(h.isCurrent).toHaveBeenCalledTimes(3);
    }
  );

  it('allows reverse exact-input XYK, both fee methods and u32/u128 endpoints', async () => {
    const h = fixture();
    const reverse = quote(true);
    reverse[3] = ((1n << 128n) - 1n).toString();
    await h.adapter.request('liquidityProxy_quote', reverse, signal());
    await h.adapter.request(
      'state_call',
      ['TransactionPaymentApi_query_fee_details', `0x${'00'.repeat(4096)}`, HASH],
      signal()
    );
    await h.adapter.request('chain_getBlockHash', [0xffff_ffff], signal());
    expect(h.raw).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['author_submitExtrinsic', ['0x01']],
    ['state_getStorage', ['0x01', HASH]],
    ['chain_getHeader', []],
    ['chain_getBlockHash', [-1]],
    ['chain_getBlockHash', [1.5]],
    ['chain_getBlockHash', [0x1_0000_0000]],
    ['chain_getBlockHash', ['1']],
    ['chain_getBlockHash', [NaN]],
    ['state_getMetadata', ['0x01']],
    ['state_getStorageHash', ['0x1234', HASH]],
    ['state_getStorageHash', ['0x3a636f6465']],
    ['state_call', ['BlockBuilder_apply_extrinsic', '0x01', HASH]],
    ['state_call', ['TransactionPaymentApi_query_info', `0x${'00'.repeat(4097)}`, HASH]],
    ['state_call', ['TransactionPaymentApi_query_info', '0x1', HASH]],
    ['state_call', ['TransactionPaymentApi_query_info', '0x', HASH]],
    ['state_queryStorageAt', [KEYS.slice(1), HASH]],
    ['state_queryStorageAt', [[...KEYS.slice(1), KEYS[1]], HASH]],
    ['state_queryStorageAt', [['0xAA', '0xaa', ...KEYS.slice(2)], HASH]],
    ['state_queryStorageAt', [[`0x${'00'.repeat(513)}`, ...KEYS.slice(1)], HASH]],
  ])('rejects unsupported method/parameters %s before any SDK call', async (method, params) => {
    const h = fixture();
    await expect(
      h.adapter.request(method as GoalRpcMethod, params as readonly unknown[], signal())
    ).rejects.toMatchObject({ reason: 'invalid-input' });
    expect(h.raw).not.toHaveBeenCalled();
  });

  it.each([
    [0, 1],
    [1, XOR],
    [2, KUSD],
    [3, '0'],
    [3, '01'],
    [3, '1.0'],
    [3, (1n << 128n).toString()],
    [4, 'WithDesiredOutput'],
    [5, ['XYKPool', 'OrderBook']],
    [6, 'Disabled'],
    [7, undefined],
  ])('rejects altered quote field %s', async (index, value) => {
    const h = fixture();
    const params = quote();
    params[index as number] = value;
    await expect(h.adapter.request('liquidityProxy_quote', params, signal())).rejects.toMatchObject({
      reason: 'invalid-input',
    });
    expect(h.raw).not.toHaveBeenCalled();
  });

  it('copies keys/source arrays before awaiting and captures the original SDK raw function', async () => {
    const h = fixture();
    let resolve!: (value: unknown) => void;
    h.raw.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        })
    );
    const keys = [...KEYS];
    const pending = h.adapter.request('state_queryStorageAt', [keys, HASH], signal());
    keys.reverse();
    const sent = h.raw.mock.calls[0][0];
    expect(sent).toEqual(KEYS);
    expect(Object.isFrozen(sent)).toBe(true);
    resolve(null);
    expect(await pending).toBeNull();
    const replacement = vi.fn(async () => 9);
    (h.client.rpc.chain.getHeader as { raw: typeof replacement }).raw = replacement;
    await h.adapter.request('chain_getHeader', [HASH], signal());
    expect(replacement).not.toHaveBeenCalled();
  });

  it('rejects sparse/accessor/extra/symbol/prototype arrays and object coercion without invoking getters or toJSON', async () => {
    const h = fixture();
    const getter = vi.fn(() => HASH);
    const toJSON = vi.fn(() => HASH);
    const top: unknown[] = [HASH];
    Object.defineProperty(top, '0', { enumerable: true, get: getter });
    const nested = [...KEYS];
    Object.defineProperty(nested, '0', { enumerable: true, get: getter });
    const symbol = [HASH];
    Object.defineProperty(symbol, Symbol('extra'), { value: true });
    const extra = Object.assign([HASH], { extra: true });
    const inherited = Object.setPrototypeOf([HASH], { toJSON });
    for (const params of [top, new Array(1), symbol, extra, inherited, [{ toJSON }]]) {
      await expect(h.adapter.request('chain_getHeader', params, signal())).rejects.toMatchObject({
        reason: 'invalid-input',
      });
    }
    await expect(h.adapter.request('state_queryStorageAt', [nested, HASH], signal())).rejects.toMatchObject({
      reason: 'invalid-input',
    });
    const input = { client: h.client, isCurrent: h.isCurrent };
    Object.defineProperty(input, 'client', { enumerable: true, get: getter });
    expect(() => createGoalRpc(input)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(toJSON).not.toHaveBeenCalled();
    expect(h.raw).not.toHaveBeenCalled();
  });

  it('rejects missing raw capability instead of falling back to decorated RPC', () => {
    const h = fixture();
    delete (h.client.rpc.state.call as unknown as { raw?: unknown }).raw;
    expect(() => createGoalRpc({ client: h.client, isCurrent: h.isCurrent })).toThrow('unavailable');
    expect(h.decorated).not.toHaveBeenCalled();
  });

  it('checks context before transport and again after a delayed result', async () => {
    const h = fixture();
    h.isCurrent.mockReturnValueOnce(false);
    await expect(h.adapter.request('chain_getHeader', [HASH], signal())).rejects.toMatchObject({
      reason: 'context-changed',
    });
    expect(h.raw).not.toHaveBeenCalled();
    let finish!: (value: unknown) => void;
    h.raw.mockImplementationOnce(
      () =>
        new Promise((r) => {
          finish = r;
        })
    );
    const pending = h.adapter.request('chain_getHeader', [HASH], signal());
    h.isCurrent.mockReturnValue(false);
    finish({ number: '0x01' });
    await expect(pending).rejects.toMatchObject({ reason: 'context-changed' });
    expect(h.raw).toHaveBeenCalledTimes(1);
  });

  it('sanitizes SDK/guard exceptions and does not retry', async () => {
    const h = fixture();
    h.raw.mockRejectedValueOnce(new Error('private SDK error'));
    await expect(h.adapter.request('chain_getHeader', [HASH], signal())).rejects.toMatchObject({
      reason: 'rpc-failed',
      message: 'Goal RPC rpc-failed',
    });
    h.isCurrent.mockImplementation(() => {
      throw new Error('private guard error');
    });
    await expect(h.adapter.request('chain_getHeader', [HASH], signal())).rejects.toMatchObject({
      reason: 'context-changed',
      message: 'Goal RPC context-changed',
    });
    expect(h.raw).toHaveBeenCalledTimes(1);
  });

  it.each(['resolve', 'reject'] as const)(
    'aborts its wait promptly and ignores a late SDK %s without disconnecting',
    async (late) => {
      const h = fixture();
      const disconnect = vi.fn();
      Object.assign(h.client, { disconnect });
      const abort = new AbortController();
      const remove = vi.spyOn(abort.signal, 'removeEventListener');
      let finish!: (value: unknown) => void;
      let fail!: (error: unknown) => void;
      h.raw.mockImplementationOnce(
        () =>
          new Promise((r, j) => {
            finish = r;
            fail = j;
          })
      );
      const pending = h.adapter.request('chain_getHeader', [HASH], abort.signal);
      abort.abort();
      await expect(pending).rejects.toMatchObject({ reason: 'aborted' });
      expect(remove).toHaveBeenCalledTimes(1);
      if (late === 'resolve') finish({ late: true });
      else fail(new Error('late error'));
      await Promise.resolve();
      await Promise.resolve();
      expect(disconnect).not.toHaveBeenCalled();
      expect(h.raw).toHaveBeenCalledTimes(1);
    }
  );

  it('does not call SDK for an already aborted signal, and removes a successful listener', async () => {
    const h = fixture();
    const abort = new AbortController();
    abort.abort();
    await expect(h.adapter.request('chain_getHeader', [HASH], abort.signal)).rejects.toMatchObject({
      reason: 'aborted',
    });
    expect(h.raw).not.toHaveBeenCalled();
    const open = new AbortController();
    const remove = vi.spyOn(open.signal, 'removeEventListener');
    await h.adapter.request('chain_getHeader', [HASH], open.signal);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('preserves actual installed RpcCore .raw JSON through a synthetic offline provider', async () => {
    const result = {
      amount: '123456789012345678901234567890',
      amount_without_impact: '123456789012345678901234567891',
      fee: { [XOR]: '7' },
    };
    const sent: { method: string; params: unknown[] }[] = [];
    const provider: ProviderInterface = {
      isConnected: true,
      isClonable: false,
      hasSubscriptions: false,
      clone() {
        throw new Error('not used');
      },
      async connect() {
        throw new Error('not used');
      },
      async disconnect() {
        throw new Error('not used');
      },
      on: () => () => undefined,
      async send<T>(method: string, params: unknown[]): Promise<T> {
        sent.push({ method, params });
        return result as T;
      },
      async subscribe() {
        throw new Error('not used');
      },
      async unsubscribe() {
        throw new Error('not used');
      },
    };
    const registry = new TypeRegistry();
    registry.register(types);
    const core = new RpcCore('goal-raw-offline-test', registry, {
      provider,
      userRpc: { liquidityProxy: liquidityProxy.rpc },
    }) as unknown as Record<string, Record<string, { raw: (...params: unknown[]) => Observable<unknown> }>>;
    const rpc = Object.fromEntries(['chain', 'state', 'liquidityProxy'].map((section) => [section, {}])) as Record<
      string,
      Record<string, unknown>
    >;
    for (const [, section, method] of methods)
      rpc[section][method] = { raw: (...params: unknown[]) => firstValueFrom(core[section][method].raw(...params)) };
    const adapter = createGoalRpc({ client: { rpc } as unknown as GoalRpcClient, isCurrent: () => true });
    expect(await adapter.request('liquidityProxy_quote', quote(), signal())).toBe(result);
    expect(sent).toHaveLength(1);
    expect(sent[0].method).toBe('liquidityProxy_quote');
    expect(sent[0].params).toEqual(quote());
    expect(result.amount_without_impact).toBe('123456789012345678901234567891');
  });
});
