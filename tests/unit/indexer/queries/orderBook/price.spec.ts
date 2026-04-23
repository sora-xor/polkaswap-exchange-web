import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchOrderBookPriceData } from '@/indexer/queries/orderBook/price';

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

describe('order book price query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches SubQuery snapshots with filter variables and transforms chart values', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(createSnapshotResponse([createSnapshot()]));
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    const result = await fetchOrderBookPriceData('0-base-quote', 'DAY' as any, 50, 'cursor-1');

    expect(indexerMocks.fetchEntities).toHaveBeenCalledWith(expect.any(Object), {
      filter: {
        orderBookId: {
          equalTo: '0-base-quote',
        },
        type: {
          equalTo: 'DAY',
        },
      },
      first: 50,
      after: 'cursor-1',
    });
    expect(indexerMocks.fetchEntitiesConnection).not.toHaveBeenCalled();
    expect(result).toEqual({
      pageInfo: {
        hasNextPage: true,
        endCursor: 'end-cursor',
      },
      edges: [
        {
          cursor: 'edge-cursor-0',
          node: {
            timestamp: 1_700_000,
            price: [1.1, 1.2, 1, 1.4],
            volume: 88.5,
          },
        },
      ],
    });
  });

  it('fetches Subsquid snapshots with where variables and transforms nested price data', async () => {
    indexerMocks.fetchEntitiesConnection.mockResolvedValue(createSnapshotResponse([createSnapshot()]));
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBSQUID);

    const result = await fetchOrderBookPriceData('1-xor-val', 'HOUR' as any, 25, null);

    expect(indexerMocks.fetchEntitiesConnection).toHaveBeenCalledWith(expect.any(Object), {
      where: {
        orderBook: {
          id_eq: '1-xor-val',
        },
        type_eq: 'HOUR',
      },
      first: 25,
      after: null,
    });
    expect(indexerMocks.fetchEntities).not.toHaveBeenCalled();
    expect(result?.edges[0]?.node).toEqual({
      timestamp: 1_700_000,
      price: [1.1, 1.2, 1, 1.4],
      volume: 88.5,
    });
  });

  it('passes omitted pagination values through to SubQuery', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(createSnapshotResponse([]));
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    await expect(fetchOrderBookPriceData('0-base-quote', 'DAY' as any)).resolves.toEqual(createSnapshotResponse([]));

    expect(indexerMocks.fetchEntities).toHaveBeenCalledWith(expect.any(Object), {
      filter: {
        orderBookId: {
          equalTo: '0-base-quote',
        },
        type: {
          equalTo: 'DAY',
        },
      },
      first: undefined,
      after: undefined,
    });
  });

  it('returns null when the active indexer returns no connection data', async () => {
    indexerMocks.fetchEntitiesConnection.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBSQUID);

    await expect(fetchOrderBookPriceData('1-xor-val', 'DAY' as any)).resolves.toBeNull();
  });

  it('returns null for unsupported indexer types without requesting snapshots', async () => {
    indexerMocks.currentIndexer = createIndexer('unsupported');

    await expect(fetchOrderBookPriceData('0-base-quote', 'DAY' as any)).resolves.toBeNull();
    expect(indexerMocks.fetchEntities).not.toHaveBeenCalled();
    expect(indexerMocks.fetchEntitiesConnection).not.toHaveBeenCalled();
  });
});

const createIndexer = (type: unknown) => ({
  type,
  services: {
    explorer: {
      fetchEntities: indexerMocks.fetchEntities,
      fetchEntitiesConnection: indexerMocks.fetchEntitiesConnection,
    },
  },
});

const createSnapshotResponse = (nodes: Array<ReturnType<typeof createSnapshot>>) => ({
  pageInfo: {
    hasNextPage: true,
    endCursor: 'end-cursor',
  },
  edges: nodes.map((node, index) => ({
    cursor: `edge-cursor-${index}`,
    node,
  })),
});

const createSnapshot = () => ({
  timestamp: '1700',
  price: {
    open: '1.1',
    close: '1.2',
    low: '1.0',
    high: '1.4',
  },
  volumeUSD: '88.5',
});
