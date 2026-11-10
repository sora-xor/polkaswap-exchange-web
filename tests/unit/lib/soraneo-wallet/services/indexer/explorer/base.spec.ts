import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/consts';
import BaseExplorer from '@/lib/soraneo-wallet/src/services/indexer/explorer/base';
import { StatsCoreNotReadyError } from '@/lib/soraneo-wallet/src/services/indexer/coreRefresh';
import { ConnectionStatus } from '@/lib/soraneo-wallet/src/types/common';

type MockPayload = {
  data?: unknown;
  error?: {
    networkError?: Error;
    graphQLErrors?: { message: string }[];
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

  it('discards partial data with GraphQL errors without retrying or marking the network unavailable', async () => {
    vi.useFakeTimers();
    const { explorer, statuses, createExplorerClient } = setupRetryExplorer([
      { data: { partial: true }, error: { graphQLErrors: [{ message: 'resolver failure' }] } },
    ]);

    await expect(explorer.request({} as never)).resolves.toBeUndefined();

    expect(createExplorerClient).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(statuses).toEqual([ConnectionStatus.Loading, ConnectionStatus.Available]);
  });

  it('retries a pending Pi price generation and returns only the complete response', async () => {
    vi.useFakeTimers();
    const { explorer, queryToPromise } = setup('https://indexer.test/graphql');
    const pending = { message: 'refreshing', extensions: { code: 'STATS_CORE_NOT_READY' } };
    queryToPromise
      .mockResolvedValueOnce({ data: { price: 'partial' }, error: { graphQLErrors: [pending] } })
      .mockResolvedValueOnce({ data: { price: 'current' } });
    const request = explorer.request({} as never, {}, { retryPendingCore: true, requestPolicy: 'network-only' });
    await vi.runAllTimersAsync();
    await expect(request).resolves.toEqual({ price: 'current' });
    expect(queryToPromise).toHaveBeenCalledTimes(2);
  });

  it('reports a persistent core refresh after three attempts and does not classify mixed errors as pending', async () => {
    vi.useFakeTimers();
    const { explorer, queryToPromise } = setup('https://indexer.test/graphql');
    const pending = { message: 'refreshing', extensions: { code: 'STATS_CORE_NOT_READY' } };
    queryToPromise.mockResolvedValue({ error: { graphQLErrors: [pending] } });
    const rejected = expect(explorer.request({} as never, {}, { retryPendingCore: true })).rejects.toThrow(
      StatsCoreNotReadyError
    );
    await vi.runAllTimersAsync();
    await rejected;
    expect(queryToPromise).toHaveBeenCalledTimes(3);
    queryToPromise.mockResolvedValue({ error: { graphQLErrors: [pending, { message: 'ordinary error' }] } });
    await expect(explorer.request({} as never, {}, { retryPendingCore: true })).resolves.toBeUndefined();
    expect(queryToPromise).toHaveBeenCalledTimes(4);
  });

  it('discards partial data when network retries are exhausted', async () => {
    vi.useFakeTimers();
    const { explorer, statuses, createExplorerClient } = setupRetryExplorer([
      { data: { partial: 1 }, error: { networkError: new Error('temporary outage') } },
      { data: { partial: 2 }, error: { networkError: new Error('still down') } },
      { data: { partial: 3 }, error: { networkError: new Error('final failure') } },
    ]);

    const request = explorer.request({} as never);
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

  it('returns only the successful response after a transient network error with partial data', async () => {
    vi.useFakeTimers();
    const { explorer, statuses, createExplorerClient } = setupRetryExplorer([
      { data: { partial: true }, error: { networkError: new Error('temporary outage') } },
      { data: { complete: true } },
    ]);
    const settled = vi.fn();

    const request = explorer.request({} as never).then(settled);
    await vi.advanceTimersByTimeAsync(399);
    expect(settled).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    await request;

    expect(settled).toHaveBeenCalledExactlyOnceWith({ complete: true });
    expect(createExplorerClient).toHaveBeenCalledTimes(2);
    expect(statuses).toEqual([ConnectionStatus.Loading, ConnectionStatus.Loading, ConnectionStatus.Available]);
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

describe('captured network-only queries', () => {
  it('forces network-only POST and never retries an error on another client', async () => {
    const { explorer, queryToPromise, createExplorerClient } = setup('https://indexer.test/graphql');
    queryToPromise.mockResolvedValue({ data: { cached: true }, error: { networkError: Error('offline') } });
    const session = explorer.captureNetworkOnly();
    await expect(session.request({} as never)).resolves.toBeUndefined();
    expect(explorer.client.query).toHaveBeenCalledWith(
      {},
      {},
      {
        requestPolicy: 'network-only',
        preferGetMethod: false,
        fetchOptions: { cache: 'no-store', credentials: 'omit', headers: { accept: 'application/json' } },
      }
    );
    expect(createExplorerClient).toHaveBeenCalledOnce();
  });
  it('refuses a changed endpoint before queries and before re-capturing a session', async () => {
    let endpoint = 'https://one.test/graphql';
    const query = vi.fn(() => ({ toPromise: async () => ({ data: { ok: true } }) }));
    const explorer = new BaseExplorer({
      type: IndexerType.POLKASWAP,
      createExplorerClient: () => ({ query }) as never,
      getStatus: () => ConnectionStatus.Available,
      setStatus: async () => {},
      getEndpoint: () => endpoint,
    });
    const session = explorer.captureNetworkOnly();
    endpoint = 'https://two.test/graphql';
    await expect(session.request({} as never)).rejects.toThrow('Indexer changed');
    expect(() => session.captureNetworkOnly()).toThrow();
    expect(query).not.toHaveBeenCalled();
  });
  it('discards a response if the endpoint changes while it is pending', async () => {
    let endpoint = 'https://one.test/graphql';
    let finish!: (value: unknown) => void;
    const explorer = new BaseExplorer({
      type: IndexerType.POLKASWAP,
      createExplorerClient: () =>
        ({
          query: () => ({
            toPromise: () =>
              new Promise((r) => {
                finish = r;
              }),
          }),
        }) as never,
      getStatus: () => ConnectionStatus.Available,
      setStatus: async () => {},
      getEndpoint: () => endpoint,
    });
    const pending = explorer.captureNetworkOnly().request({} as never);
    endpoint = 'https://two.test/graphql';
    finish({ data: { stale: true } });
    await expect(pending).rejects.toThrow();
  });
  it('supports a narrowly typed network-only option on the regular request path', async () => {
    const { explorer, queryToPromise } = setup('https://indexer.test/graphql');
    queryToPromise.mockResolvedValue({ data: { ok: true } });
    await explorer.request({} as never, {}, { requestPolicy: 'network-only' });
    expect(explorer.client.query).toHaveBeenCalledWith({}, {}, { requestPolicy: 'network-only' });
  });
});

it('refuses an existing client created for an earlier endpoint before capability admission', () => {
  let endpoint = 'https://one.test/graphql';
  const query = vi.fn();
  const explorer = new BaseExplorer({
    type: IndexerType.POLKASWAP,
    createExplorerClient: () => ({ query }) as never,
    getStatus: () => ConnectionStatus.Available,
    setStatus: async () => {},
    getEndpoint: () => endpoint,
  });
  explorer.initClient();
  endpoint = 'https://two.test/graphql';
  expect(() => explorer.captureNetworkOnly()).toThrow('Indexer changed');
  expect(query).not.toHaveBeenCalled();
});

it('sends an uncached JSON POST with real urql and rejects an old-schema partial response quietly', async () => {
  const { createClient, fetchExchange, gql } = await import('@urql/core');
  const fetch = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({ data: { protectedValue: 999 }, errors: [{ message: 'Unknown capability field' }] }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
  );
  const client = createClient({
    url: 'https://indexer.test/graphql',
    exchanges: [fetchExchange],
    preferGetMethod: true,
    fetch,
  });
  const explorer = new BaseExplorer({
    type: IndexerType.POLKASWAP,
    createExplorerClient: () => client,
    getStatus: () => ConnectionStatus.Available,
    setStatus: async () => {},
    getEndpoint: () => 'https://indexer.test/graphql',
  });
  await expect(
    explorer.captureNetworkOnly().request(gql`
      query CapabilityTest {
        protectedValue
      }
    `)
  ).resolves.toBeUndefined();
  expect(fetch).toHaveBeenCalledOnce();
  const options = fetch.mock.calls[0][1] as RequestInit;
  expect(fetch.mock.calls[0][0]).toBe('https://indexer.test/graphql');
  expect(options).toMatchObject({ method: 'POST', cache: 'no-store', credentials: 'omit' });
  expect(new Headers(options.headers).get('accept')).toBe('application/json');
  expect(JSON.parse(String(options.body)).query).toContain('CapabilityTest');
});
