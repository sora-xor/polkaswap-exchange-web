import { describe, expect, it, vi } from 'vitest';

import { Connection } from '@/lib/substrate/connection';

describe('Connection', () => {
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
