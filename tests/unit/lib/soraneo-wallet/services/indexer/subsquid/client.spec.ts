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

  it('forces POST transport by disabling preferGetMethod', () => {
    createExplorerClient('https://api.example.com/graphql');

    expect(mocks.createClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.example.com/graphql',
        requestPolicy: 'network-only',
        preferGetMethod: false,
      })
    );
  });
});
