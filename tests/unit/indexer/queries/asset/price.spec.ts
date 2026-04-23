import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchAssetPriceData } from '@/indexer/queries/asset/price';
import { retryOnEmptyResult } from '@/indexer/queries/retry';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchEntities: vi.fn(),
  fetchEntitiesConnection: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  SubqueryIndexer: class SubqueryIndexer {},
  SubsquidIndexer: class SubsquidIndexer {},
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

  it('fetches SubQuery price snapshots with the asset/type filter and transforms snapshot nodes', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(createSnapshotResponse([createSnapshotEntity('1700', 11, 12, 10, 13, 42.5)]));
    indexerMocks.currentIndexer = {
      type: IndexerType.SUBQUERY,
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

  it('normalizes an empty Subsquid cursor to null and transforms connection snapshots', async () => {
    indexerMocks.fetchEntitiesConnection.mockResolvedValue(
      createSnapshotResponse([createSnapshotEntity('1800', 1.5, 2.5, 1.25, 3.75, 9)])
    );
    indexerMocks.currentIndexer = {
      type: IndexerType.SUBSQUID,
      services: {
        explorer: {
          fetchEntitiesConnection: indexerMocks.fetchEntitiesConnection,
        },
      },
    };

    const result = await fetchAssetPriceData('val-address', 'HOUR' as any, 10, '');

    expect(indexerMocks.fetchEntitiesConnection).toHaveBeenCalledWith(expect.any(Object), {
      filter: {
        asset: { id_eq: 'val-address' },
        type_eq: 'HOUR',
      },
      first: 10,
      after: null,
    });
    expect(result?.edges[0]?.node).toEqual({
      timestamp: 1_800_000,
      price: [1.5, 2.5, 1.25, 3.75],
      volume: 9,
    });
  });

  it('preserves non-empty Subsquid cursors', async () => {
    indexerMocks.fetchEntitiesConnection.mockResolvedValue(createSnapshotResponse([]));
    indexerMocks.currentIndexer = {
      type: IndexerType.SUBSQUID,
      services: {
        explorer: {
          fetchEntitiesConnection: indexerMocks.fetchEntitiesConnection,
        },
      },
    };

    const result = await fetchAssetPriceData('val-address', 'HOUR' as any, undefined, 'cursor-2');

    expect(indexerMocks.fetchEntitiesConnection).toHaveBeenCalledWith(expect.any(Object), {
      filter: {
        asset: { id_eq: 'val-address' },
        type_eq: 'HOUR',
      },
      first: undefined,
      after: 'cursor-2',
    });
    expect(result?.edges).toEqual([]);
  });

  it('returns null when the active indexer returns no snapshot connection data', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = {
      type: IndexerType.SUBQUERY,
      services: {
        explorer: {
          fetchEntities: indexerMocks.fetchEntities,
        },
      },
    };

    await expect(fetchAssetPriceData('xor-address', 'DAY' as any)).resolves.toBeNull();
  });

  it('returns null for unsupported indexer types without making indexer requests', async () => {
    indexerMocks.currentIndexer = {
      type: 'unknown',
      services: {
        explorer: {},
      },
    };

    await expect(fetchAssetPriceData('xor-address', 'DAY' as any)).resolves.toBeNull();
    expect(indexerMocks.fetchEntities).not.toHaveBeenCalled();
    expect(indexerMocks.fetchEntitiesConnection).not.toHaveBeenCalled();
    expect(retryOnEmptyResult).not.toHaveBeenCalled();
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
