import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchPoolPriceData } from '@/indexer/queries/pool/price';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchEntities: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  SubqueryIndexer: class SubqueryIndexer {},
}));

describe('pool price query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches SubQuery pool price snapshots and transforms price/volume fields', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(createSnapshotResponse([createPoolPriceSnapshot()]));
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    const result = await fetchPoolPriceData('pool-id', 'DAY' as any, 20, 'cursor-1');

    expect(indexerMocks.fetchEntities).toHaveBeenCalledWith(expect.any(Object), {
      filter: {
        poolId: {
          equalTo: 'pool-id',
        },
        type: {
          equalTo: 'DAY',
        },
      },
      first: 20,
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
            price: [1.1, 1.2, 1, 1.4],
            volume: 42.5,
            baseVolume: 1_000n,
            targetVolume: 2_000n,
          },
        },
      ],
    });
  });

  it('passes optional pagination values through when omitted', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(createSnapshotResponse([]));
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    await expect(fetchPoolPriceData('pool-id', 'HOUR' as any)).resolves.toEqual(createSnapshotResponse([]));

    expect(indexerMocks.fetchEntities).toHaveBeenCalledWith(expect.any(Object), {
      filter: {
        poolId: {
          equalTo: 'pool-id',
        },
        type: {
          equalTo: 'HOUR',
        },
      },
      first: undefined,
      after: undefined,
    });
  });

  it('returns null when SubQuery returns no connection data', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    await expect(fetchPoolPriceData('pool-id', 'DAY' as any)).resolves.toBeNull();
  });

  it('returns null for unsupported indexer types without requesting snapshots', async () => {
    indexerMocks.currentIndexer = createIndexer('unsupported');

    await expect(fetchPoolPriceData('pool-id', 'DAY' as any)).resolves.toBeNull();
    expect(indexerMocks.fetchEntities).not.toHaveBeenCalled();
  });

  it('returns null for Subsquid until the query is implemented', async () => {
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBSQUID);

    await expect(fetchPoolPriceData('pool-id', 'DAY' as any)).resolves.toBeNull();
    expect(indexerMocks.fetchEntities).not.toHaveBeenCalled();
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

const createSnapshotResponse = (nodes: Array<ReturnType<typeof createPoolPriceSnapshot>>) => ({
  pageInfo: {
    hasNextPage: false,
    endCursor: 'end-cursor',
  },
  edges: nodes.map((node, index) => ({
    cursor: `edge-cursor-${index}`,
    node,
  })),
});

const createPoolPriceSnapshot = () => ({
  timestamp: '1700',
  priceUSD: {
    open: '1.1',
    close: '1.2',
    low: '1.0',
    high: '1.4',
  },
  volumeUSD: '42.5',
  baseAssetVolume: '1000',
  targetAssetVolume: '2000',
});
