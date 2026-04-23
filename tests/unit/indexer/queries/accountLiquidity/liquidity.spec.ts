import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchAccountLiquidityData } from '@/indexer/queries/accountLiquidity/liquidity';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchEntities: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  SubqueryIndexer: class SubqueryIndexer {},
}));

describe('account liquidity query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches SubQuery account liquidity snapshots and transforms amounts', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(createSnapshotResponse([createLiquiditySnapshot()]));
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    const result = await fetchAccountLiquidityData('account-1', 'pool-1', 20, 'cursor-1');

    expect(indexerMocks.fetchEntities).toHaveBeenCalledWith(expect.any(Object), {
      filter: {
        accountLiquidityId: {
          equalTo: 'account-1-pool-1',
        },
      },
      first: 20,
      after: 'cursor-1',
    });
    expect(result?.pageInfo).toEqual({
      hasNextPage: false,
      endCursor: 'end-cursor',
    });
    expect(result?.edges[0]?.cursor).toBe('edge-cursor-0');
    expect(result?.edges[0]?.node.timestamp).toBe(1_700_000);
    expect(result?.edges[0]?.node.poolTokens.toString()).toBe('1.5');
    expect(result?.edges[0]?.node.liquidityUSD.toString()).toBe('44.25');
  });

  it('passes optional pagination values through when omitted', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(createSnapshotResponse([]));
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    await expect(fetchAccountLiquidityData('account-1', 'pool-1')).resolves.toEqual(createSnapshotResponse([]));

    expect(indexerMocks.fetchEntities).toHaveBeenCalledWith(expect.any(Object), {
      filter: {
        accountLiquidityId: {
          equalTo: 'account-1-pool-1',
        },
      },
      first: undefined,
      after: undefined,
    });
  });

  it('returns null when SubQuery returns no connection data', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    await expect(fetchAccountLiquidityData('account-1', 'pool-1')).resolves.toBeNull();
  });

  it('returns null for Subsquid until the query is implemented', async () => {
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBSQUID);

    await expect(fetchAccountLiquidityData('account-1', 'pool-1')).resolves.toBeNull();
    expect(indexerMocks.fetchEntities).not.toHaveBeenCalled();
  });

  it('returns null for unsupported indexer types without making requests', async () => {
    indexerMocks.currentIndexer = createIndexer('unsupported');

    await expect(fetchAccountLiquidityData('account-1', 'pool-1')).resolves.toBeNull();
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

const createSnapshotResponse = (nodes: Array<ReturnType<typeof createLiquiditySnapshot>>) => ({
  pageInfo: {
    hasNextPage: false,
    endCursor: 'end-cursor',
  },
  edges: nodes.map((node, index) => ({
    cursor: `edge-cursor-${index}`,
    node,
  })),
});

const createLiquiditySnapshot = () => ({
  timestamp: '1700',
  poolTokens: '1500000000000000000',
  liquidityUSD: '44.25',
});
