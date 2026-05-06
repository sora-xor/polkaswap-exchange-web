import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchPoolTvlData } from '@/indexer/queries/pool/tvl';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchEntities: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  SubqueryIndexer: class SubqueryIndexer {},
}));

describe('pool tvl query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches SubQuery pool TVL snapshots and transforms liquidity/reserve fields', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(createSnapshotResponse([createPoolTvlSnapshot()]));
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    const result = await fetchPoolTvlData('pool-id', 'DAY' as any, 5, null);

    expect(indexerMocks.fetchEntities).toHaveBeenCalledWith(expect.any(Object), {
      filter: {
        poolId: {
          equalTo: 'pool-id',
        },
        type: {
          equalTo: 'DAY',
        },
      },
      first: 5,
      after: null,
    });
    expect(result?.pageInfo).toEqual({
      hasNextPage: false,
      endCursor: 'end-cursor',
    });
    expect(result?.edges[0]?.cursor).toBe('edge-cursor-0');
    expect(result?.edges[0]?.node.timestamp).toBe(1_800_000);
    expect(result?.edges[0]?.node.liquidityUSD.toString()).toBe('99.5');
    expect(result?.edges[0]?.node.baseAssetReserves.toString()).toBe('1');
    expect(result?.edges[0]?.node.targetAssetReserves.toString()).toBe('2.5');
  });

  it('passes optional pagination values through when omitted', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(createSnapshotResponse([]));
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    await expect(fetchPoolTvlData('pool-id', 'HOUR' as any)).resolves.toEqual(createSnapshotResponse([]));

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

    await expect(fetchPoolTvlData('pool-id', 'DAY' as any)).resolves.toBeNull();
  });

  it('returns null for unsupported indexer types without requesting snapshots', async () => {
    indexerMocks.currentIndexer = createIndexer('unsupported');

    await expect(fetchPoolTvlData('pool-id', 'DAY' as any)).resolves.toBeNull();
    expect(indexerMocks.fetchEntities).not.toHaveBeenCalled();
  });

  it('returns null for Subsquid until the query is implemented', async () => {
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBSQUID);

    await expect(fetchPoolTvlData('pool-id', 'DAY' as any)).resolves.toBeNull();
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

const createSnapshotResponse = (nodes: Array<ReturnType<typeof createPoolTvlSnapshot>>) => ({
  pageInfo: {
    hasNextPage: false,
    endCursor: 'end-cursor',
  },
  edges: nodes.map((node, index) => ({
    cursor: `edge-cursor-${index}`,
    node,
  })),
});

const createPoolTvlSnapshot = () => ({
  timestamp: '1800',
  liquidityUSD: '99.5',
  baseAssetReserves: '1000000000000000000',
  targetAssetReserves: '2500000000000000000',
});
