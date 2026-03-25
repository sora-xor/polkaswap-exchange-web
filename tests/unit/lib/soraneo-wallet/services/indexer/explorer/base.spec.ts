import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/consts';
import BaseExplorer from '@/lib/soraneo-wallet/src/services/indexer/explorer/base';
import { ConnectionStatus } from '@/lib/soraneo-wallet/src/types/common';

type Setup = {
  explorer: BaseExplorer;
  setStatus: ReturnType<typeof vi.fn>;
  createExplorerClient: ReturnType<typeof vi.fn>;
  queryToPromise: ReturnType<typeof vi.fn>;
};

const setup = (endpoint: Nullable<string> = null): Setup => {
  const setStatus = vi.fn(async () => {});
  const queryToPromise = vi.fn();
  const client = {
    query: vi.fn(() => ({ toPromise: queryToPromise })),
    subscription: vi.fn(),
  };
  const createExplorerClient = vi.fn(() => client);

  const explorer = new BaseExplorer({
    type: IndexerType.SUBQUERY,
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
  };
};

describe('BaseExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null from request when endpoint is missing', async () => {
    const { explorer, setStatus, createExplorerClient } = setup('');

    await expect(explorer.request({} as any)).resolves.toBeNull();

    expect(createExplorerClient).not.toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith(ConnectionStatus.Unavailable);
  });

  it('returns a no-op unsubscribe when endpoint is missing', () => {
    const { explorer, setStatus, createExplorerClient } = setup(undefined);

    const subscribe = explorer.subscribe({} as any);
    const unsubscribe = subscribe(vi.fn());

    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
    expect(createExplorerClient).not.toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith(ConnectionStatus.Unavailable);
  });

  it('requests data when endpoint exists and updates status', async () => {
    const { explorer, setStatus, createExplorerClient, queryToPromise } = setup('https://indexer.test/graphql');
    queryToPromise.mockResolvedValue({ data: { ok: true }, error: null });

    await expect(explorer.request({} as any)).resolves.toEqual({ ok: true });

    expect(createExplorerClient).toHaveBeenCalledWith('https://indexer.test/graphql');
    expect(setStatus).toHaveBeenNthCalledWith(1, ConnectionStatus.Loading);
    expect(setStatus).toHaveBeenNthCalledWith(2, ConnectionStatus.Available);
  });
});
