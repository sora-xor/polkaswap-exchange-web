import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/consts';
import BaseExplorer from '@/lib/soraneo-wallet/src/services/indexer/explorer/base';
import { ConnectionStatus } from '@/lib/soraneo-wallet/src/types/common';

type MockPayload = {
  data?: unknown;
  error?: {
    networkError?: Error;
  } | null;
};

type Setup = {
  explorer: BaseExplorer;
  setStatus: ReturnType<typeof vi.fn>;
  createExplorerClient: ReturnType<typeof vi.fn>;
  queryToPromise: ReturnType<typeof vi.fn>;
  subscription: ReturnType<typeof vi.fn>;
};

const setup = (endpoint: Nullable<string> = null, supportsSubscriptions = true): Setup => {
  const setStatus = vi.fn(async () => {});
  const queryToPromise = vi.fn();
  const subscription = vi.fn();
  const client = {
    supportsSubscriptions,
    query: vi.fn(() => ({ toPromise: queryToPromise })),
    subscription,
  };
  const createExplorerClient = vi.fn(() => client);

  const explorer = new BaseExplorer({
    type: IndexerType.POLKASWAP,
    createExplorerClient,
    getStatus: () => ConnectionStatus.Available,
    setStatus,
    getEndpoint: () => endpoint,
  });

  return {
    explorer,
    setStatus,
    createExplorerClient,
    queryToPromise,
    subscription,
  };
};

const setupRetryExplorer = (payloads: MockPayload[]) => {
  const statuses: ConnectionStatus[] = [];
  let queryIndex = 0;

  const createExplorerClient = vi.fn(() => ({
    query: vi.fn(() => ({
      toPromise: vi.fn(async () => payloads[queryIndex++] ?? payloads[payloads.length - 1]),
    })),
  }));

  const explorer = new BaseExplorer({
    type: IndexerType.POLKASWAP,
    createExplorerClient: createExplorerClient as never,
    getStatus: () => statuses[statuses.length - 1] ?? ConnectionStatus.Loading,
    setStatus: async (status) => {
      statuses.push(status);
    },
    getEndpoint: () => 'https://indexer.example/graphql',
  });

  return { explorer, statuses, createExplorerClient };
};

describe('BaseExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null from request when endpoint is missing', async () => {
    const { explorer, setStatus, createExplorerClient } = setup('');

    await expect(explorer.request({} as never)).resolves.toBeNull();

    expect(createExplorerClient).not.toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith(ConnectionStatus.Unavailable);
  });

  it('returns a no-op unsubscribe when endpoint is missing', () => {
    const { explorer, setStatus, createExplorerClient } = setup(undefined);

    const subscribe = explorer.subscribe({} as never);
    const unsubscribe = subscribe(vi.fn());

    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
    expect(createExplorerClient).not.toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith(ConnectionStatus.Unavailable);
  });

  it('requests data when endpoint exists and updates status', async () => {
    const { explorer, setStatus, createExplorerClient, queryToPromise } = setup('https://indexer.test/graphql');
    queryToPromise.mockResolvedValue({ data: { ok: true }, error: null });

    await expect(explorer.request({} as never)).resolves.toEqual({ ok: true });

    expect(createExplorerClient).toHaveBeenCalledWith('https://indexer.test/graphql');
    expect(setStatus).toHaveBeenNthCalledWith(1, ConnectionStatus.Loading);
    expect(setStatus).toHaveBeenNthCalledWith(2, ConnectionStatus.Available);
  });

  it('returns a no-op unsubscribe when the indexer client has no subscription support', () => {
    const { explorer, subscription } = setup('https://indexer.test/graphql', false);

    const subscribe = explorer.subscribe({} as never);
    const unsubscribe = subscribe(vi.fn());

    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
    expect(subscription).not.toHaveBeenCalled();
  });

  it('retries transient network failures before surfacing unavailable status', async () => {
    vi.useFakeTimers();
    const { explorer, statuses, createExplorerClient } = setupRetryExplorer([
      { error: { networkError: new Error('temporary outage') } },
      { data: { ok: true } },
    ]);

    const request = explorer.request({} as never, {});
    await vi.runAllTimersAsync();

    await expect(request).resolves.toEqual({ ok: true });
    expect(createExplorerClient).toHaveBeenCalledTimes(2);
    expect(statuses).toEqual([ConnectionStatus.Loading, ConnectionStatus.Loading, ConnectionStatus.Available]);
  });

  it('marks the indexer unavailable after exhausting retries', async () => {
    vi.useFakeTimers();
    const { explorer, statuses, createExplorerClient } = setupRetryExplorer([
      { error: { networkError: new Error('temporary outage') } },
      { error: { networkError: new Error('still down') } },
      { error: { networkError: new Error('final failure') } },
    ]);

    const request = explorer.request({} as never, {});
    await vi.runAllTimersAsync();

    await expect(request).resolves.toBeUndefined();
    expect(createExplorerClient).toHaveBeenCalledTimes(3);
    expect(statuses).toEqual([
      ConnectionStatus.Loading,
      ConnectionStatus.Loading,
      ConnectionStatus.Loading,
      ConnectionStatus.Unavailable,
    ]);
  });
});
