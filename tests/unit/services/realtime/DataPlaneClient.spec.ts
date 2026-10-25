import { afterEach, describe, expect, it, vi } from 'vitest';

import { DataPlaneClient } from '@/services/realtime/DataPlaneClient';

type MessageListener = (event: { data: unknown }) => void;

function createAckingEndpoint(
  options: {
    onPostMessage?: (payload: { type?: string; requestId?: number }, emit: (payload: unknown) => void) => void;
  } = {}
) {
  const listeners = new Set<MessageListener>();

  const emit = (payload: unknown): void => {
    listeners.forEach((listener) => listener({ data: payload }));
  };

  return {
    addEventListener: vi.fn((type: string, listener: MessageListener) => {
      if (type === 'message') {
        listeners.add(listener);
      }
    }),
    removeEventListener: vi.fn((type: string, listener: MessageListener) => {
      if (type === 'message') {
        listeners.delete(listener);
      }
    }),
    postMessage: vi.fn((payload: { type?: string; requestId?: number }) => {
      if (options.onPostMessage) {
        options.onPostMessage(payload, emit);
        return;
      }

      const requestId = payload?.requestId;
      if (!Number.isFinite(requestId)) return;

      if (payload.type === 'request') {
        emit({ type: 'response', requestId, ok: true, result: null });
        return;
      }

      emit({ type: 'ack', requestId, ok: true });
    }),
    emit,
  };
}

describe('DataPlaneClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('falls back to dedicated worker when shared worker startup fails', async () => {
    const endpoint = createAckingEndpoint();
    const terminate = vi.fn();

    const sharedWorkerCtor = vi.fn(function SharedWorkerMock() {
      throw new Error('shared worker boot failed');
    });
    const workerCtor = vi.fn(function WorkerMock(this: Record<string, unknown>) {
      Object.assign(this, endpoint, { terminate });
    });

    vi.stubGlobal('SharedWorker', sharedWorkerCtor as unknown as typeof SharedWorker);
    vi.stubGlobal('Worker', workerCtor as unknown as typeof Worker);

    const client = new DataPlaneClient();

    await expect(client.start({ preferSharedWorker: true })).resolves.toBe(true);
    expect(sharedWorkerCtor).toHaveBeenCalledTimes(1);
    expect(workerCtor).toHaveBeenCalledTimes(1);

    await client.stop();
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it('returns false when workers are not supported', async () => {
    vi.stubGlobal('SharedWorker', undefined as unknown as typeof SharedWorker);
    vi.stubGlobal('Worker', undefined as unknown as typeof Worker);

    const client = new DataPlaneClient();
    await expect(client.start()).resolves.toBe(false);
  });

  it('dispatches status and metrics worker events to listeners', async () => {
    const endpoint = createAckingEndpoint();
    const terminate = vi.fn();
    const workerCtor = vi.fn(function WorkerMock(this: Record<string, unknown>) {
      Object.assign(this, endpoint, { terminate });
    });

    vi.stubGlobal('Worker', workerCtor as unknown as typeof Worker);
    vi.stubGlobal('SharedWorker', undefined as unknown as typeof SharedWorker);

    const client = new DataPlaneClient();
    const statusHandler = vi.fn();
    const metricsHandler = vi.fn();
    const stopStatus = client.onStatus(statusHandler);
    const stopMetrics = client.onMetrics(metricsHandler);

    await expect(client.start({ preferSharedWorker: false })).resolves.toBe(true);

    endpoint.emit({
      type: 'status',
      connectionId: 'conn-1',
      status: 'open',
    });
    endpoint.emit({
      type: 'metrics',
      metrics: {
        openConnections: 1,
        activeSubscriptions: 2,
        pendingRpcRequests: 0,
        connectedClients: 1,
        visible: true,
        profile: 'balanced',
      },
    });

    expect(statusHandler).toHaveBeenCalledWith({
      type: 'status',
      connectionId: 'conn-1',
      status: 'open',
    });
    expect(metricsHandler).toHaveBeenCalledWith({
      type: 'metrics',
      metrics: {
        openConnections: 1,
        activeSubscriptions: 2,
        pendingRpcRequests: 0,
        connectedClients: 1,
        visible: true,
        profile: 'balanced',
      },
    });

    stopStatus();
    stopMetrics();

    endpoint.emit({
      type: 'status',
      connectionId: 'conn-1',
      status: 'closed',
    });
    endpoint.emit({
      type: 'metrics',
      metrics: {
        openConnections: 0,
        activeSubscriptions: 0,
        pendingRpcRequests: 0,
        connectedClients: 0,
        visible: false,
        profile: 'balanced',
      },
    });

    expect(statusHandler).toHaveBeenCalledTimes(1);
    expect(metricsHandler).toHaveBeenCalledTimes(1);

    await client.stop();
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent connect commands for the same connection endpoint', async () => {
    const endpoint = createAckingEndpoint();
    const terminate = vi.fn();
    const workerCtor = vi.fn(function WorkerMock(this: Record<string, unknown>) {
      Object.assign(this, endpoint, { terminate });
    });

    vi.stubGlobal('Worker', workerCtor as unknown as typeof Worker);
    vi.stubGlobal('SharedWorker', undefined as unknown as typeof SharedWorker);

    const client = new DataPlaneClient();
    await expect(client.start({ preferSharedWorker: false })).resolves.toBe(true);
    endpoint.postMessage.mockClear();

    await Promise.all([client.connect('bridge-conn', 'wss://node-a'), client.connect('bridge-conn', 'wss://node-a')]);
    await client.connect('bridge-conn', 'wss://node-a');

    const connectCalls = endpoint.postMessage.mock.calls.filter(
      ([payload]) => (payload as { type?: string })?.type === 'connect'
    );
    expect(connectCalls).toHaveLength(1);

    await client.stop();
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it('rejects immediately when endpoint postMessage throws and keeps subsequent requests healthy', async () => {
    let shouldThrowRequest = true;
    const endpoint = createAckingEndpoint({
      onPostMessage: (payload, emit) => {
        const requestId = payload.requestId;
        if (!Number.isFinite(requestId)) return;

        if (payload.type === 'request') {
          if (shouldThrowRequest) {
            shouldThrowRequest = false;
            throw new Error('simulated postMessage failure');
          }

          emit({ type: 'response', requestId, ok: true, result: 'ok' });
          return;
        }

        emit({ type: 'ack', requestId, ok: true });
      },
    });
    const terminate = vi.fn();
    const workerCtor = vi.fn(function WorkerMock(this: Record<string, unknown>) {
      Object.assign(this, endpoint, { terminate });
    });

    vi.stubGlobal('Worker', workerCtor as unknown as typeof Worker);
    vi.stubGlobal('SharedWorker', undefined as unknown as typeof SharedWorker);

    const client = new DataPlaneClient();
    await expect(client.start({ preferSharedWorker: false })).resolves.toBe(true);

    await expect(client.request('bridge-conn', 'system_health')).rejects.toThrow('simulated postMessage failure');
    await expect(client.request('bridge-conn', 'system_health')).resolves.toBe('ok');

    await client.stop();
    expect(terminate).toHaveBeenCalledTimes(1);
  });
});
