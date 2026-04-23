import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CountType,
  fetchAccountMeta,
  fetchAccountPoints,
  fetchAccountPointSystems,
  fetchBridgeData,
  fetchCount,
} from '@/indexer/queries/pointSystem';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  request: vi.fn(),
  fetchAllEntities: vi.fn(),
  fetchAllEntitiesConnection: vi.fn(),
  fetchEntities: vi.fn(),
  fetchEntitiesConnection: vi.fn(),
}));

vi.mock('@/consts', () => ({
  IndexerType: {
    SUBQUERY: 'subquery',
    SUBSQUID: 'subsquid',
  },
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
}));

describe('point system indexer queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches SubQuery bridge data and classifies incoming and outgoing transfers', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse({ data: { amount: '10', assetId: 'xor', to: 'account-1' } }),
      parse({ data: { amount: '2.5', assetId: 'eth', sidechainAddress: '0xabc' } }),
    ]);
    indexerMocks.currentIndexer = createIndexer('subquery');

    const result = await fetchBridgeData(100, 200, 'account-1');

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        start: 100,
        end: 200,
        account: 'account-1',
      },
      expect.any(Function)
    );
    expect(indexerMocks.fetchAllEntitiesConnection).not.toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      assetId: 'xor',
      type: 'incoming',
    });
    expect(result[0]?.amount.toString()).toBe('10');
    expect(result[1]).toMatchObject({
      assetId: 'eth',
      type: 'outgoing',
    });
    expect(result[1]?.amount.toString()).toBe('2.5');
  });

  it('fetches Subsquid bridge data through connection pagination and returns empty fallback data', async () => {
    indexerMocks.fetchAllEntitiesConnection.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer('subsquid');

    await expect(fetchBridgeData(10, 20, 'account-2')).resolves.toEqual([]);
    expect(indexerMocks.fetchAllEntitiesConnection).toHaveBeenCalledWith(
      expect.any(Object),
      {
        start: 10,
        end: 20,
        account: 'account-2',
      },
      expect.any(Function)
    );
  });

  it('returns empty bridge data for unsupported indexer types without making requests', async () => {
    indexerMocks.currentIndexer = createIndexer('unsupported');

    await expect(fetchBridgeData(10, 20, 'account-1')).resolves.toEqual([]);
    expect(indexerMocks.fetchAllEntities).not.toHaveBeenCalled();
    expect(indexerMocks.fetchAllEntitiesConnection).not.toHaveBeenCalled();
  });

  it('fetches SubQuery activity counts and falls back to zero when no count is returned', async () => {
    indexerMocks.fetchEntities.mockResolvedValue({ totalCount: 7 });
    indexerMocks.currentIndexer = createIndexer('subquery');

    await expect(fetchCount(100, 200, 'account-1', CountType.Swap)).resolves.toBe(7);
    expect(indexerMocks.fetchEntities).toHaveBeenCalledWith(expect.any(Object), {
      start: 100,
      end: 200,
      account: 'account-1',
    });

    indexerMocks.fetchEntities.mockResolvedValue(null);

    await expect(fetchCount(100, 200, 'account-1', CountType.PoolDeposit)).resolves.toBe(0);
  });

  it('fetches Subsquid activity counts and returns zero for unsupported indexers', async () => {
    indexerMocks.fetchEntitiesConnection.mockResolvedValue({ totalCount: 11 });
    indexerMocks.currentIndexer = createIndexer('subsquid');

    await expect(fetchCount(300, 400, 'account-2', CountType.PoolWithdraw)).resolves.toBe(11);
    expect(indexerMocks.fetchEntitiesConnection).toHaveBeenCalledWith(expect.any(Object), {
      start: 300,
      end: 400,
      account: 'account-2',
    });

    vi.clearAllMocks();
    indexerMocks.currentIndexer = createIndexer('unsupported');

    await expect(fetchCount(300, 400, 'account-2', CountType.PoolWithdraw)).resolves.toBe(0);
    expect(indexerMocks.fetchEntities).not.toHaveBeenCalled();
    expect(indexerMocks.fetchEntitiesConnection).not.toHaveBeenCalled();
  });

  it('fetches and parses SubQuery account metadata into versioned point calculations', async () => {
    indexerMocks.request.mockResolvedValue({
      data: createAccountMetaEntity(),
    });
    indexerMocks.currentIndexer = createIndexer('subquery');

    const result = await fetchAccountMeta('account-1');

    expect(indexerMocks.request).toHaveBeenCalledWith(expect.any(Object), {
      id: 'account-1',
    });
    expect(result?.createdAt).toEqual({
      block: 123,
      timestamp: 1_700_000_000,
    });
    expect(result?.points[0]?.version).toBe(1);
    expect(result?.points[0]?.fees.amount.toString()).toBe('1');
    expect(result?.points[0]?.governance.votes.toString()).toBe('5');
    expect(result?.points[0]?.bridge.incomingUSD.toString()).toBe('17');
  });

  it('returns null for account metadata when the indexer is unsupported or throws', async () => {
    indexerMocks.currentIndexer = createIndexer('unsupported');

    await expect(fetchAccountMeta('account-1')).resolves.toBeNull();

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    indexerMocks.request.mockRejectedValue(new Error('query failed'));
    indexerMocks.currentIndexer = createIndexer('subquery');

    await expect(fetchAccountMeta('account-1')).resolves.toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('fetches and parses versioned account point systems', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createAccountPointSystemEntity()),
    ]);
    indexerMocks.currentIndexer = createIndexer('subquery');

    const result = await fetchAccountPointSystems('account-1');

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        id: 'account-1',
      },
      expect.any(Function)
    );
    expect(result).toHaveLength(1);
    expect(result?.[0]?.version).toBe(2);
    expect(result?.[0]?.startedAtBlock).toBe(456);
    expect(result?.[0]?.burned.amountUSD.toString()).toBe('4');
  });

  it('returns null for account point systems when the indexer is unsupported or throws', async () => {
    indexerMocks.currentIndexer = createIndexer('unsupported');

    await expect(fetchAccountPointSystems('account-1')).resolves.toBeNull();
    expect(indexerMocks.fetchAllEntities).not.toHaveBeenCalled();

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    indexerMocks.fetchAllEntities.mockRejectedValue(new Error('point query failed'));
    indexerMocks.currentIndexer = createIndexer('subquery');

    await expect(fetchAccountPointSystems('account-1')).resolves.toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('combines account metadata with versioned point systems when available', async () => {
    indexerMocks.request.mockResolvedValue({
      data: createAccountMetaEntity(),
    });
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createAccountPointSystemEntity()),
    ]);
    indexerMocks.currentIndexer = createIndexer('subquery');

    const result = await fetchAccountPoints('account-1');

    expect(result?.createdAt.block).toBe(123);
    expect(result?.points).toHaveLength(1);
    expect(result?.points[0]?.version).toBe(2);
  });

  it('falls back to metadata points when versioned point systems are unavailable', async () => {
    indexerMocks.request.mockResolvedValue({
      data: createAccountMetaEntity(),
    });
    indexerMocks.fetchAllEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer('subquery');

    const result = await fetchAccountPoints('account-1');

    expect(result?.points).toHaveLength(1);
    expect(result?.points[0]?.version).toBe(1);
  });

  it('returns null account points when account metadata is unavailable', async () => {
    indexerMocks.request.mockResolvedValue(null);
    indexerMocks.fetchAllEntities.mockResolvedValue([createAccountPointSystemEntity()]);
    indexerMocks.currentIndexer = createIndexer('subquery');

    await expect(fetchAccountPoints('account-1')).resolves.toBeNull();
  });
});

const createIndexer = (type: unknown) => ({
  type,
  services: {
    explorer: {
      request: indexerMocks.request,
      fetchAllEntities: indexerMocks.fetchAllEntities,
      fetchAllEntitiesConnection: indexerMocks.fetchAllEntitiesConnection,
      fetchEntities: indexerMocks.fetchEntities,
      fetchEntitiesConnection: indexerMocks.fetchEntitiesConnection,
    },
  },
});

const createPointFields = () => ({
  xorFees: {
    amount: '1',
    amountUSD: '2',
  },
  xorBurned: {
    amount: '3',
    amountUSD: '4',
  },
  xorStakingValRewards: {
    amount: '6',
    amountUSD: '7',
  },
  orderBook: {
    created: 8,
    closed: 9,
    amountUSD: '10',
  },
  vault: {
    created: 11,
    closed: 12,
    amountUSD: '13',
  },
  governance: {
    votes: 5,
    amount: '15',
    amountUSD: '16',
  },
  deposit: {
    incomingUSD: '17',
    outgoingUSD: '18',
  },
});

const createAccountMetaEntity = () => ({
  id: 'meta-1',
  accountId: 'account-1',
  createdAtTimestamp: 1_700_000,
  createdAtBlock: 123,
  ...createPointFields(),
});

const createAccountPointSystemEntity = () => ({
  id: 'point-system-1',
  accountId: 'account-1',
  version: 2,
  startedAtBlock: 456,
  ...createPointFields(),
});
