import { beforeEach, describe, expect, it, vi } from 'vitest';

import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchData } from '@/indexer/queries/burnXor';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchAllEntities: vi.fn(),
  fetchAllEntitiesConnection: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  SubqueryIndexer: class SubqueryIndexer {},
  SubsquidIndexer: class SubsquidIndexer {},
}));

describe('xor burn query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches SubQuery burn events and appends pre-indexing burn data', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createBurnHistoryElement('account-live', '12.5', '123')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    const result = await fetchData(100, 200);

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        start: 100,
        end: 200,
      },
      expect.any(Function)
    );
    expect(indexerMocks.fetchAllEntitiesConnection).not.toHaveBeenCalled();
    expect(result[0]?.address).toBe('account-live');
    expect(result[0]?.amount.toString()).toBe('12.5');
    expect(result[0]?.blockHeight).toBe(123);
    expect(result.length).toBeGreaterThan(1);
    expect(result.some((item) => item.address === 'cnV21a8zn14wUTuxUK6wy5Fmus8PXaGrsBUchz33MqavYqxHE')).toBe(true);
  });

  it('filters pre-indexing burn data by account on SubQuery', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    const result = await fetchData(100, 200, 'cnV5d93J89p5kC4dRqF5WWtDNCk1XZ3HQo9dEhGUxBQnohxEB');

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        start: 100,
        end: 200,
      },
      expect.any(Function)
    );
    expect(result).toHaveLength(2);
    expect(result.every((item) => item.address === 'cnV5d93J89p5kC4dRqF5WWtDNCk1XZ3HQo9dEhGUxBQnohxEB')).toBe(true);
    expect(result.map((item) => item.blockHeight)).toEqual([14465935, 14464669]);
  });

  it('fetches Subsquid burn events through the connection endpoint', async () => {
    indexerMocks.fetchAllEntitiesConnection.mockImplementation(async (_query, _variables, parse) => [
      parse(createBurnHistoryElement('account-subsquid', '99', 456)),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBSQUID);

    const result = await fetchData(300, 400, 'account-subsquid');

    expect(indexerMocks.fetchAllEntitiesConnection).toHaveBeenCalledWith(
      expect.any(Object),
      {
        start: 300,
        end: 400,
      },
      expect.any(Function)
    );
    expect(indexerMocks.fetchAllEntities).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]?.address).toBe('account-subsquid');
    expect(result[0]?.amount.toString()).toBe('99');
    expect(result[0]?.blockHeight).toBe(456);
  });

  it('parses batched XOR burn calls from utility.batchAll transactions', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createBatchBurnHistoryElement('account-batch', '42', 789)),
      parse(createBatchBurnHistoryElement('account-other', '99', 790, '0xother')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    const result = await fetchData(700, 800, 'account-batch');

    expect(result[0]?.address).toBe('account-batch');
    expect(result[0]?.amount.toString()).toBe('42');
    expect(result[0]?.blockHeight).toBe(789);
    expect(result.some((item) => item.address === 'account-other')).toBe(false);
  });

  it('returns an empty array when Subsquid returns null data', async () => {
    indexerMocks.fetchAllEntitiesConnection.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBSQUID);

    await expect(fetchData(300, 400)).resolves.toEqual([]);
  });

  it('returns an empty array for unsupported indexer types without making requests', async () => {
    indexerMocks.currentIndexer = createIndexer('unsupported');

    await expect(fetchData(100, 200)).resolves.toEqual([]);
    expect(indexerMocks.fetchAllEntities).not.toHaveBeenCalled();
    expect(indexerMocks.fetchAllEntitiesConnection).not.toHaveBeenCalled();
  });
});

const createIndexer = (type: unknown) => ({
  type,
  services: {
    explorer: {
      fetchAllEntities: indexerMocks.fetchAllEntities,
      fetchAllEntitiesConnection: indexerMocks.fetchAllEntitiesConnection,
    },
  },
});

const createBurnHistoryElement = (address: string, amount: string, blockHeight: string | number) => ({
  address,
  module: 'assets',
  method: 'burn',
  data: {
    amount,
    assetId: XOR.address,
  },
  blockHeight,
  calls: [],
});

const createBatchBurnHistoryElement = (
  address: string,
  amount: string,
  blockHeight: string | number,
  assetId = XOR.address
) => ({
  address,
  module: 'utility',
  method: 'batchAll',
  data: {},
  blockHeight,
  calls: {
    nodes: [
      {
        module: 'assets',
        method: 'burn',
        data: {
          args: {
            amount,
            assetId,
          },
        },
      },
      {
        module: 'system',
        method: 'remark',
        data: {
          args: {
            remark: '0x68656c6c6f',
          },
        },
      },
    ],
  },
});
