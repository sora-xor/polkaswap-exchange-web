import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClientMock: vi.fn(() => ({}) as any),
  subscriptionExchangeMock: vi.fn(() => ({}) as any),
  wsCreateClientMock: vi.fn(() => ({
    subscribe: vi.fn(() => vi.fn()),
  })),
  disposeMock: vi.fn(),
  sink: { next: vi.fn(), error: vi.fn(), complete: vi.fn() },
}));

vi.mock('@urql/core', () => ({
  createClient: mocks.createClientMock,
  fetchExchange: {} as any,
  subscriptionExchange: mocks.subscriptionExchangeMock,
}));

vi.mock('graphql-ws', () => ({
  createClient: mocks.wsCreateClientMock,
}));

import { createExplorerClient } from '@/lib/soraneo-wallet/src/services/indexer/subsquid/client';

describe('subsquid createExplorerClient', () => {
  beforeEach(() => {
    mocks.createClientMock.mockClear();
    mocks.subscriptionExchangeMock.mockClear();
    mocks.wsCreateClientMock.mockClear();
  });

  it('configures explorer client with network-only policy', () => {
    createExplorerClient('https://api.example.com/graphql');

    expect(mocks.createClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.example.com/graphql',
        requestPolicy: 'network-only',
      })
    );
  });

  it('skips websocket subscription exchange for unsupported subquery gateway endpoints', () => {
    const client = createExplorerClient('https://api.subquery.network/sq/sora-xor/sora-prod');

    expect(mocks.wsCreateClientMock).not.toHaveBeenCalled();
    expect(mocks.subscriptionExchangeMock).not.toHaveBeenCalled();
    expect(client.supportsSubscriptions).toBe(false);
    expect(mocks.createClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        exchanges: [expect.any(Object)],
      })
    );
  });

  it('configures graphql-ws subscriptions for supported endpoints', () => {
    const client = createExplorerClient('https://indexer.example.com/graphql');

    expect(mocks.wsCreateClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'wss://indexer.example.com/graphql',
        lazy: expect.any(Boolean),
        retryAttempts: expect.any(Number),
        shouldRetry: expect.any(Function),
      })
    );
    expect(mocks.subscriptionExchangeMock).toHaveBeenCalledOnce();
    expect(client.supportsSubscriptions).toBe(true);

    const exchangeOptions = mocks.subscriptionExchangeMock.mock.calls[0]?.[0];
    const subscription = exchangeOptions.forwardSubscription({ query: 'subscription test' });
    const subscriptionHandle = subscription.subscribe(mocks.sink);

    expect(subscriptionHandle).toEqual({ unsubscribe: expect.any(Function) });
  });

  it('converts plain http endpoints to ws subscriptions', () => {
    createExplorerClient('http://indexer.example.com/graphql');

    expect(mocks.wsCreateClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'ws://indexer.example.com/graphql',
      })
    );
  });

  it('preserves websocket endpoints without rewriting them', () => {
    createExplorerClient('wss://indexer.example.com/graphql');

    expect(mocks.wsCreateClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'wss://indexer.example.com/graphql',
      })
    );
  });

  it('skips subscriptions for unsupported protocols', () => {
    const client = createExplorerClient('ftp://indexer.example.com/graphql');

    expect(mocks.wsCreateClientMock).not.toHaveBeenCalled();
    expect(mocks.subscriptionExchangeMock).not.toHaveBeenCalled();
    expect(client.supportsSubscriptions).toBe(false);
  });

  it('falls back to simple string replacement when URL parsing fails', () => {
    createExplorerClient('http//broken-endpoint');

    expect(mocks.wsCreateClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'ws//broken-endpoint',
      })
    );
  });
});
