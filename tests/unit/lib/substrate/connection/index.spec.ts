// @vitest-environment node
import { RpcCore } from '@polkadot/rpc-core';
import { WsProvider as RealWsProvider } from '@polkadot/rpc-provider';
import { TypeRegistry } from '@polkadot/types';
import { u8aToHex } from '@polkadot/util';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Connection } from '@/lib/substrate/connection';

type ProviderArgs = ConstructorParameters<typeof RealWsProvider>;

/** Opens a cancelled one-shot connection and returns the arguments it gave to WsProvider. */
const captureProviderArgs = async (): Promise<ProviderArgs> => {
  const readiness = new Promise<never>(() => undefined);
  const api = {
    connect: vi.fn(),
    disconnect: vi.fn(async () => undefined),
    isReady: readiness,
    isReadyOrError: readiness,
    off: vi.fn(),
    on: vi.fn(),
  };
  const ApiPromise = vi.fn(function ApiPromiseMock() {
    return api;
  });
  const WsProvider = vi.fn(function WsProviderMock() {
    return {};
  });
  const connection = new Connection(ApiPromise as never, WsProvider as never, {});
  const openResult = connection.open('wss://node.example', { once: true }).catch(() => undefined);

  await vi.waitFor(() => expect(WsProvider).toHaveBeenCalledTimes(1));
  await connection.close();
  await openResult;

  return WsProvider.mock.calls[0] as unknown as ProviderArgs;
};

/**
 * Decodes two batched subscription notifications the way rpc-core does: the first carries both keys,
 * the second, 31 s later, carries only the key that changed. Returns the idle key's decoded value
 * (`''` when rpc-core decodes it as an empty Option, as it does for a missing storage value).
 */
const decodeIdleKeyAfter31s = (provider: RealWsProvider): string => {
  const registry = new TypeRegistry();
  const rpc = new RpcCore('connection-spec', registry, { provider, ttl: provider.ttl });
  const formatStorageSet = (
    rpc as unknown as {
      _formatStorageSet: (...args: unknown[]) => Array<{ toString: () => string }>;
    }
  )._formatStorageSet.bind(rpc);
  const key = (hex: string) => ({ toHex: () => hex, outputType: 'u128' });
  // Storage values are SCALE (little-endian) bytes; `u128.toHex()` would be big-endian.
  const encoded = (value: number) => u8aToHex(registry.createType('u128', value).toU8a());
  const lpKeys = [key('0x01'), key('0x02')];
  const otherKeys = [key('0x03'), key('0x04')];

  formatStorageSet(registry, undefined, lpKeys, [
    ['0x01', encoded(5)],
    ['0x02', encoded(7)],
  ]);
  vi.setSystemTime(Date.now() + 31_000);
  // Any other live subscription touches the shared cache every block, which evicts expired entries.
  formatStorageSet(registry, undefined, otherKeys, [
    ['0x03', encoded(1)],
    ['0x04', encoded(1)],
  ]);

  return formatStorageSet(registry, undefined, lpKeys, [['0x01', encoded(6)]])[1].toString();
};

describe('Connection', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('disables the storage cache expiry so idle keys in batched subscriptions keep their values', async () => {
    const [, autoConnectMs, headers, timeout, cacheCapacity, cacheTtl] = await captureProviderArgs();

    expect(cacheTtl).toBeNull();

    vi.useFakeTimers({ toFake: ['Date'] });
    // `once` connections never auto-connect, so this real provider stays offline.
    const provider = new RealWsProvider('wss://node.example', autoConnectMs, headers, timeout, cacheCapacity, cacheTtl);

    expect(decodeIdleKeyAfter31s(provider)).toBe('7');
  });

  it('documents the polkadot.js default: an idle batched key decodes as empty after 30 s', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const provider = new RealWsProvider('wss://node.example', false);

    expect(decodeIdleKeyAfter31s(provider)).toBe('');
  });

  it('cancels an API while its initial readiness promise is still pending', async () => {
    const readiness = new Promise<never>(() => undefined);
    const disconnect = vi.fn(async () => undefined);
    const api = {
      connect: vi.fn(),
      disconnect,
      isReady: readiness,
      isReadyOrError: readiness,
      off: vi.fn(),
      on: vi.fn(),
    };
    const ApiPromise = vi.fn(function ApiPromiseMock() {
      return api;
    });
    const WsProvider = vi.fn(function WsProviderMock() {
      return {};
    });
    const connection = new Connection(ApiPromise as never, WsProvider as never, {});

    const openResult = connection
      .open('wss://pending.example', { once: true })
      .then(() => null)
      .catch((error: Error) => error);

    await vi.waitFor(() => expect(connection.api).toBe(api));
    await expect(connection.close()).resolves.toBeUndefined();

    expect(await openResult).toEqual(new Error('Connection cancelled'));
    expect(disconnect).toHaveBeenCalled();
    expect(connection.api).toBeNull();
    expect(connection.endpoint).toBe('');
  });
});
