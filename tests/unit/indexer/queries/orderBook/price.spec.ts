import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchOrderBookPriceData } from '@/indexer/queries/orderBook/price';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchEntities: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  PolkaswapIndexer: class PolkaswapIndexer {},
}));

describe('order book price query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches Polkaswap snapshots with filter variables and transforms chart values', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(createSnapshotResponse([createSnapshot()]));
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

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


  it('passes omitted pagination values through to Polkaswap', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(createSnapshotResponse([]));
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

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


  });

const createIndexer = (type: unknown) => ({
  type,
  services: {
    explorer: {
      fetchEntities: indexerMocks.fetchEntities,
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
