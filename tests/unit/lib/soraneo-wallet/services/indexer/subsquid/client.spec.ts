import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClientMock: vi.fn(() => ({}) as any),
  subscriptionExchangeMock: vi.fn(() => ({}) as any),
  wsCreateClientMock: vi.fn(() => ({ subscribe: vi.fn() })),
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
    createExplorerClient('https://api.subquery.network/sq/sora-xor/sora-prod');

    expect(mocks.wsCreateClientMock).not.toHaveBeenCalled();
    expect(mocks.subscriptionExchangeMock).not.toHaveBeenCalled();
    expect(mocks.createClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        exchanges: [expect.any(Object)],
      })
    );
  });
});
