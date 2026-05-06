import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectionStatus } from '@/lib/soraneo-wallet/src/types/common';

const mocks = vi.hoisted(() => ({
  resolveGlobalPinia: vi.fn(() => 'pinia'),
  useWalletStore: vi.fn(),
  createExplorerClient: vi.fn(),
  explorerCtor: vi.fn(function MockSubsquidExplorer(this: Record<string, unknown>, args: unknown) {
    this.args = args;
  }),
}));

vi.mock('@/plugins/pinia', () => ({
  resolveGlobalPinia: mocks.resolveGlobalPinia,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: mocks.useWalletStore,
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer/subsquid/client', () => ({
  createExplorerClient: mocks.createExplorerClient,
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer/subsquid/explorer', () => ({
  default: mocks.explorerCtor,
}));

describe('subsquid indexer entrypoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('creates the singleton explorer with store-backed status and endpoint accessors', async () => {
    const store = {
      setIndexerStatus: vi.fn(),
      indexers: {
        subsquid: {
          status: ConnectionStatus.Unavailable,
          endpoint: 'https://subsquid.example/graphql',
        },
      },
    };
    mocks.useWalletStore.mockReturnValue(store);

    const module = await import('@/lib/soraneo-wallet/src/services/indexer/subsquid');
    const config = mocks.explorerCtor.mock.calls[0]?.[0] as Record<string, any>;

    expect(mocks.explorerCtor).toHaveBeenCalledTimes(1);
    expect(config.type).toBe('subsquid');
    expect(config.createExplorerClient).toBe(mocks.createExplorerClient);
    expect(module.SubsquidExplorerService).toBeInstanceOf(mocks.explorerCtor as any);

    await config.setStatus(ConnectionStatus.Available);
    expect(store.setIndexerStatus).toHaveBeenCalledWith({
      indexer: 'subsquid',
      status: ConnectionStatus.Available,
    });

    expect(config.getStatus()).toBe(ConnectionStatus.Unavailable);
    expect(config.getEndpoint()).toBe('https://subsquid.example/graphql');
    expect(mocks.resolveGlobalPinia).toHaveBeenCalled();
    expect(mocks.useWalletStore).toHaveBeenCalledWith('pinia');
    expect(module.HistoryElementsQuery).toBeDefined();
  });

  it('gracefully handles wallet store resolution failures in its accessors', async () => {
    mocks.useWalletStore.mockImplementation(() => {
      throw new Error('pinia unavailable');
    });

    await import('@/lib/soraneo-wallet/src/services/indexer/subsquid');
    const config = mocks.explorerCtor.mock.calls[0]?.[0] as Record<string, any>;

    expect(config.setStatus(ConnectionStatus.Loading)).toBeUndefined();
    expect(config.getStatus()).toBeUndefined();
    expect(config.getEndpoint()).toBeUndefined();
  });
});
