import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchAssetPriceData } from '@/indexer/queries/asset/price';
import { retryOnEmptyResult } from '@/indexer/queries/retry';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchEntities: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  PolkaswapIndexer: class PolkaswapIndexer {},
}));

vi.mock('@/indexer/queries/retry', () => ({
  retryOnEmptyResult: vi.fn(async (request, isEmpty) => {
    const result = await request();
    isEmpty(result);
    return result;
  }),
}));

describe('asset price query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches Polkaswap price snapshots with the asset/type filter and transforms snapshot nodes', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(
      createSnapshotResponse([createSnapshotEntity('1700', 11, 12, 10, 13, 42.5)])
    );
    indexerMocks.currentIndexer = {
      type: IndexerType.POLKASWAP,
      services: {
        explorer: {
          fetchEntities: indexerMocks.fetchEntities,
        },
      },
    };

    const result = await fetchAssetPriceData('xor-address', 'DAY' as any, 25, 'cursor-1');

    expect(retryOnEmptyResult).toHaveBeenCalledTimes(1);
    expect(indexerMocks.fetchEntities).toHaveBeenCalledWith(expect.any(Object), {
      filter: {
        assetId: { equalTo: 'xor-address' },
        type: { equalTo: 'DAY' },
      },
      first: 25,
      after: 'cursor-1',
    });
    expect(result).toEqual({
      pageInfo: {
        hasNextPage: false,
        endCursor: 'end-cursor',
      },
      edges: [
        {
          cursor: 'edge-cursor-0',
          node: {
            timestamp: 1_700_000,
            price: [11, 12, 10, 13],
            volume: 42.5,
          },
        },
      ],
    });
  });

  
  
  it('returns null when the active indexer returns no snapshot connection data', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = {
      type: IndexerType.POLKASWAP,
      services: {
        explorer: {
          fetchEntities: indexerMocks.fetchEntities,
        },
      },
    };

    await expect(fetchAssetPriceData('xor-address', 'DAY' as any)).resolves.toBeNull();
  });

  });

const createSnapshotResponse = (nodes: Array<ReturnType<typeof createSnapshotEntity>>) => ({
  pageInfo: {
    hasNextPage: false,
    endCursor: 'end-cursor',
  },
  edges: nodes.map((node, index) => ({
    cursor: `edge-cursor-${index}`,
    node,
  })),
});

const createSnapshotEntity = (
  timestamp: string,
  open: number,
  close: number,
  low: number,
  high: number,
  volume: number
) => ({
  timestamp,
  priceUSD: {
    open: String(open),
    close: String(close),
    low: String(low),
    high: String(high),
  },
  volume: {
    amountUSD: String(volume),
  },
});
