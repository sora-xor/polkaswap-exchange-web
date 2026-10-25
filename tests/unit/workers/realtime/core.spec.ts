import { afterEach, describe, expect, it, vi } from 'vitest';

import { RealtimeDataPlaneCore } from '@/workers/realtime/core';

describe('RealtimeDataPlaneCore metrics lifecycle', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts metrics polling only when a client is registered and stops after last client leaves', () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const core = new RealtimeDataPlaneCore();
    const received: unknown[] = [];

    expect(setIntervalSpy).not.toHaveBeenCalled();

    core.registerClient('client-1', (message) => {
      received.push(message);
    });

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10_000);
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      type: 'metrics',
      metrics: {
        connectedClients: 1,
        pendingRpcRequests: 0,
      },
    });

    core.unregisterClient('client-1');
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(20_000);
    expect(received).toHaveLength(1);
  });

  it('unregisters clients that throw on post and keeps broadcasting to healthy clients', () => {
    vi.useFakeTimers();

    const core = new RealtimeDataPlaneCore();
    let failingClientCalls = 0;
    const healthyClient = vi.fn();

    core.registerClient('broken-client', () => {
      failingClientCalls += 1;
      throw new Error('port closed');
    });
    core.registerClient('healthy-client', healthyClient);

    vi.advanceTimersByTime(10_000);
    vi.advanceTimersByTime(10_000);

    expect(failingClientCalls).toBe(1);
    expect(healthyClient).toHaveBeenCalledTimes(2);

    core.unregisterClient('healthy-client');
  });
});
