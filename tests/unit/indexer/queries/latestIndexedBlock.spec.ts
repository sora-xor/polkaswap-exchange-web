import { describe, expect, it, vi, beforeEach } from 'vitest';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  request: vi.fn(),
  fetchEntities: vi.fn(),
  fetchSorametricsLatestBlock: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
}));

vi.mock('@/services/sorametrics', () => ({
  fetchSorametricsLatestBlock: indexerMocks.fetchSorametricsLatestBlock,
}));

import { fetchLatestIndexedBlock, parseLatestIndexedBlock } from '@/indexer/queries/latestIndexedBlock';

const createIndexer = (type: string) => ({
  type,
  services: {
    explorer: {
      request: indexerMocks.request,
      fetchEntities: indexerMocks.fetchEntities,
    },
  },
});

describe('latest indexed block query', () => {
  beforeEach(() => {
    indexerMocks.currentIndexer = undefined;
    indexerMocks.request.mockReset();
    indexerMocks.fetchEntities.mockReset();
    indexerMocks.fetchSorametricsLatestBlock.mockReset();
  });

  it('parses a safe block height from the latest history edge', () => {
    expect(
      parseLatestIndexedBlock({
        edges: [{ cursor: 'cursor', node: { blockHeight: '123456' } }],
      })
    ).toBe(123456);
  });

  it('rejects invalid block heights', () => {
    expect(
      parseLatestIndexedBlock({
        edges: [{ cursor: 'cursor', node: { blockHeight: '123.4' } }],
      })
    ).toBeNull();
    expect(parseLatestIndexedBlock(null)).toBeNull();
  });

  it('fetches the latest block from the Polkaswap stream state first', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    indexerMocks.request.mockResolvedValue({ data: { block: '41' } });

    await expect(fetchLatestIndexedBlock()).resolves.toEqual({ block: 41, source: 'polkaswap' });
    expect(indexerMocks.request).toHaveBeenCalledTimes(1);
    expect(indexerMocks.fetchEntities).not.toHaveBeenCalled();
  });

  it('uses the latest Polkaswap history block when stream state is empty', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    indexerMocks.request.mockResolvedValue({ data: null });
    indexerMocks.fetchEntities.mockResolvedValue({
      edges: [{ cursor: 'cursor', node: { blockHeight: '42' } }],
    });

    await expect(fetchLatestIndexedBlock()).resolves.toEqual({ block: 42, source: 'polkaswap' });
    expect(indexerMocks.fetchEntities).toHaveBeenCalledTimes(1);
  });

  it('uses Sorametrics when the Polkaswap indexer is unavailable and Sorametrics is configured', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    indexerMocks.request.mockRejectedValue(new Error('502'));
    indexerMocks.fetchSorametricsLatestBlock.mockResolvedValue(43);

    await expect(fetchLatestIndexedBlock('https://sorametrics.org')).resolves.toEqual({
      block: 43,
      source: 'sorametrics',
    });
    expect(indexerMocks.fetchSorametricsLatestBlock).toHaveBeenCalledWith('https://sorametrics.org');
  });
});
