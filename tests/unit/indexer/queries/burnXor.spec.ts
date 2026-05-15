import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { print } from 'graphql';

import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { IndexerType } from '@/indexer/queries/indexerConsts';
import { clearBurnXorQueryCaches, fetchData, isExcludedXorBurnAddress } from '@/indexer/queries/burnXor';
import { createSoraNexusXorBurnRemark } from '@/utils/soraNexusAccount';

const validSoraNexusAccount = 'sorauﾛ1NﾗhBUd2BﾂｦﾄiﾔﾆﾂﾇKSﾃaﾘﾒﾓQﾗrﾒoﾘﾅnｳﾘbQｳQJﾆLJ5HSE';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchAllEntities: vi.fn(),
  getBlockHash: vi.fn(),
  getBlock: vi.fn(),
  getEventsAt: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  PolkaswapIndexer: class PolkaswapIndexer {},
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    connection: {
      api: {
        rpc: {
          chain: {
            getBlockHash: indexerMocks.getBlockHash,
            getBlock: indexerMocks.getBlock,
          },
        },
        query: {
          system: {
            events: {
              at: indexerMocks.getEventsAt,
            },
          },
        },
      },
    },
  },
}));

describe('xor burn query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearBurnXorQueryCaches();
    indexerMocks.currentIndexer = undefined;
    indexerMocks.getBlockHash.mockImplementation(async (blockHeight: number) => `hash-${blockHeight}`);
    indexerMocks.getBlock.mockImplementation(async (blockHash: string) => ({
      block: {
        extrinsics: [
          { hash: { toString: () => `0x${blockHash}-0` } },
          { hash: { toString: () => `0x${blockHash}-1` } },
        ],
      },
    }));
    indexerMocks.getEventsAt.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('only excludes the configured ineligible burn address', () => {
    expect(isExcludedXorBurnAddress('cnRus2m2Rn776v88H5RUtyiaXtr3daN6ePn6yenLKepx1SqYo')).toBe(true);
    expect(isExcludedXorBurnAddress('cnV5d93J89p5kC4dRqF5WWtDNCk1XZ3HQo9dEhGUxBQnohxEB')).toBe(false);
  });

  it('fetches compact Polkaswap XOR burns and appends pre-indexing burn data', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createCompactXorBurn('account-live', '12.5', 123)),
      parse(createCompactXorBurn('account-other-asset', '99', 124, '0xother')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchData(100, 200);

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledTimes(1);
    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(expect.any(Object), {}, expect.any(Function));
    expect(result[0]?.address).toBe('account-live');
    expect(result[0]?.amount.toString()).toBe('12.5');
    expect(result[0]?.blockHeight).toBe(123);
    expect(result[0]?.txHash).toBe('0xtx-account-live-123');
    expect(result.some((item) => item.address === 'account-other-asset')).toBe(false);
    expect(result.length).toBeGreaterThan(1);
    expect(result.some((item) => item.address === 'cnV21a8zn14wUTuxUK6wy5Fmus8PXaGrsBUchz33MqavYqxHE')).toBe(true);
  });

  it('filters compact Polkaswap XOR burns by range and account in the client', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createCompactXorBurn('account-live', '12.5', 150)),
      parse(createCompactXorBurn('account-live', '1', 99)),
      parse(createCompactXorBurn('account-other', '3', 150)),
      parse(createCompactXorBurn('account-live', '99', 151, '0xother')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchData(100, 200, 'account-live');

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        address: 'account-live',
        blockHeight: 150,
        txHash: '0xtx-account-live-150',
      })
    );
    expect(result[0]?.amount.toString()).toBe('12.5');
  });

  it('falls back to historyElements when the compact Polkaswap burn query is unavailable', async () => {
    indexerMocks.fetchAllEntities
      .mockRejectedValueOnce(new Error('Cannot query field "xorBurns" on type "Query"'))
      .mockImplementationOnce(async (_query, _variables, parse) => [
        parse(createBurnHistoryElement('account-history', '42', 150)),
      ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchData(100, 200);

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledTimes(2);
    expect(indexerMocks.fetchAllEntities.mock.calls[1]?.[1]).toEqual({
      start: 100,
      end: 200,
    });
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          address: 'account-history',
          blockHeight: 150,
          txHash: '0xtx-account-history-150',
        }),
      ])
    );
    expect(result.find((item) => item.address === 'account-history')?.amount.toString()).toBe('42');
  });

  it('filters pre-indexing burn data by account on Polkaswap', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

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

  it('returns no burns for explicitly ineligible account lookups', async () => {
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchData(300, 500, 'cnRus2m2Rn776v88H5RUtyiaXtr3daN6ePn6yenLKepx1SqYo');

    expect(result).toEqual([]);
    expect(indexerMocks.fetchAllEntities).not.toHaveBeenCalled();
  });

  it('parses batched XOR burn calls from utility batch transactions', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createBatchBurnHistoryElement('account-batch', '42000000000000000000', 789)),
      parse(createBatchBurnHistoryElement('account-batch-legacy', '7000000000000000000', 790, XOR.address, 'batch')),
      parse(createBatchBurnHistoryElement('account-other', '99000000000000000000', 791, '0xother')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchData(700, 800);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          address: 'account-batch',
          amount: expect.objectContaining({}),
          blockHeight: 789,
          txHash: '0xtx-account-batch-789',
        }),
        expect.objectContaining({
          address: 'account-batch-legacy',
          blockHeight: 790,
          txHash: '0xtx-account-batch-legacy-790',
        }),
      ])
    );
    expect(result.find((item) => item.address === 'account-batch')?.amount.toString()).toBe('42');
    expect(result.find((item) => item.address === 'account-batch-legacy')?.amount.toString()).toBe('7');
    expect(result.find((item) => item.address === 'account-batch')?.nexusRecipient).toBe(validSoraNexusAccount);
    expect(result.find((item) => item.address === 'account-batch-legacy')?.nexusRecipient).toBeUndefined();
    expect(result.some((item) => item.address === 'account-other')).toBe(false);
    expect(print(indexerMocks.fetchAllEntities.mock.calls[1]?.[0])).toContain('dataAssets');
    expect(print(indexerMocks.fetchAllEntities.mock.calls[1]?.[0])).toContain('callNames');
  });

  it('falls back to chain events from the SOLSWAP burn start block when the indexer is missing data', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue(null);
    indexerMocks.getEventsAt.mockImplementation(async (blockHash: string) => {
      if (blockHash !== 'hash-25043004') return [];

      return [
        createAssetBurnEvent('account-chain', createAssetIdCodec(XOR.address), '10000000000000000000'),
        createAssetBurnEventWithAssetFirst(XOR.address, 'account-chain-alt', '20000000000000000000'),
        createAssetBurnEvent('account-other-asset', '0xother', '99000000000000000000'),
      ];
    });
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchData(25_043_003, 25_043_005);

    expect(indexerMocks.getBlockHash).toHaveBeenCalledWith(25_043_003);
    expect(indexerMocks.getBlockHash).toHaveBeenCalledWith(25_043_004);
    expect(indexerMocks.getBlockHash).toHaveBeenCalledWith(25_043_005);
    expect(result.some((item) => item.address === 'account-other-asset')).toBe(false);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          address: 'account-chain',
          blockHeight: 25_043_004,
        }),
        expect.objectContaining({
          address: 'account-chain-alt',
          blockHeight: 25_043_004,
        }),
      ])
    );
    expect(result.find((item) => item.address === 'account-chain')?.amount.toString()).toBe('10');
    expect(result.find((item) => item.address === 'account-chain-alt')?.amount.toString()).toBe('20');
    expect(result.find((item) => item.address === 'account-chain')?.txHash).toBe('0xhash-25043004-1');
  });

  it('does not call external hint APIs when indexer data is missing', async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);
    indexerMocks.fetchAllEntities.mockResolvedValue(null);
    indexerMocks.getEventsAt.mockImplementation(async (blockHash: string) => {
      if (blockHash !== 'hash-25043003') return [];

      return [createAssetBurnEvent('account-chain', createAssetIdCodec(XOR.address), '1000000000000000000')];
    });
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchData(25_043_003, 25_043_003);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          address: 'account-chain',
          blockHeight: 25_043_003,
        }),
      ])
    );
  });

  it('does not reject when the chain fallback runs before the websocket is connected', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue(null);
    indexerMocks.getBlockHash.mockRejectedValue(new Error('WebSocket is not connected'));
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    await expect(fetchData(25_043_003, 25_043_003)).resolves.toEqual(expect.any(Array));
  });
});

const createIndexer = (type: unknown) => ({
  type,
  services: {
    explorer: {
      fetchAllEntities: indexerMocks.fetchAllEntities,
    },
  },
});

const createCompactXorBurn = (
  address: string,
  amount: string,
  blockHeight: string | number,
  assetId = XOR.address
) => ({
  id: `0xcompact-${address}-${blockHeight}`,
  address,
  amount,
  assetId,
  blockHeight,
  txHash: `0xtx-${address}-${blockHeight}`,
});

const createBurnHistoryElement = (
  address: string,
  amount: string,
  blockHeight: string | number,
  assetId = XOR.address
) => ({
  id: `0xtx-${address}-${blockHeight}`,
  address,
  module: 'assets',
  method: 'burn',
  data: {
    amount,
    assetId,
  },
  blockHeight,
  calls: [],
});

const createBatchBurnHistoryElement = (
  address: string,
  amount: string,
  blockHeight: string | number,
  assetId = XOR.address,
  method = 'batchAll',
  remark = createSoraNexusXorBurnRemark(validSoraNexusAccount)
) => ({
  id: `0xtx-${address}-${blockHeight}`,
  address,
  module: 'utility',
  method,
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
            remark: toHex(remark),
          },
        },
      },
    ],
  },
});

const toHex = (value: string) => `0x${Buffer.from(value, 'utf8').toString('hex')}`;

const createSignedBlock = (txHash: string, method?: unknown) => ({
  block: {
    extrinsics: [
      { hash: { toString: () => '0xother' } },
      {
        hash: { toString: () => txHash },
        method,
      },
    ],
  },
});

const createNexusBatchAllMethod = (amount: string) => ({
  section: 'utility',
  method: 'batchAll',
  args: [
    [
      {
        section: 'assets',
        method: 'burn',
        args: [createAssetIdCodec(XOR.address), { toString: () => amount }],
      },
      {
        section: 'system',
        method: 'remark',
        args: [{ toString: () => toHex(createSoraNexusXorBurnRemark(validSoraNexusAccount)) }],
      },
    ],
  ],
});

const createAssetBurnEvent = (
  address: string,
  assetId: string | { toString: () => string; toJSON: () => unknown; code: { toString: () => string } },
  amount: string,
  extrinsicIndex = 1
) => ({
  phase: {
    isApplyExtrinsic: true,
    asApplyExtrinsic: {
      toNumber: () => extrinsicIndex,
      toString: () => `${extrinsicIndex}`,
    },
  },
  event: {
    section: 'assets',
    method: 'Burn',
    data: [
      { toString: () => address },
      typeof assetId === 'string' ? { toString: () => assetId } : assetId,
      { toString: () => amount },
    ],
  },
});

const createAssetIdCodec = (assetId: string) => ({
  code: { toString: () => assetId },
  toJSON: () => ({ code: assetId }),
  toString: () => JSON.stringify({ code: assetId }),
});

const createAssetBurnEventWithAssetFirst = (assetId: string, address: string, amount: string, extrinsicIndex = 1) => ({
  phase: {
    isApplyExtrinsic: true,
    asApplyExtrinsic: {
      toNumber: () => extrinsicIndex,
      toString: () => `${extrinsicIndex}`,
    },
  },
  event: {
    section: 'assets',
    method: 'Burn',
    data: [{ toString: () => assetId }, { toString: () => address }, { toString: () => amount }],
  },
});
