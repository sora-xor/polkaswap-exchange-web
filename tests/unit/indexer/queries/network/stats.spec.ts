import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchActiveAccounts, fetchData } from '@/indexer/queries/network/stats';
import { retryOnEmptyResult } from '@/indexer/queries/retry';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchAllEntities: vi.fn(),
  request: vi.fn(),
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

describe('network stats query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches Polkaswap network snapshots and converts numeric fields to FPNumbers', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createNetworkSnapshotEntity('1700', '11', '22', '3', '4')),
    ]);
    indexerMocks.currentIndexer = createPolkaswapIndexerMock();

    const result = await fetchData(2_000, 1_000, 'DAY' as any);

    expect(retryOnEmptyResult).toHaveBeenCalledTimes(1);
    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        from: 2_000,
        to: 1_000,
        type: 'DAY',
      },
      expect.any(Function)
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.timestamp).toBe(1_700_000);
    expect(result[0]?.accounts.toString()).toBe('11');
    expect(result[0]?.activeAccounts.toString()).toBe('0');
    expect(result[0]?.transactions.toString()).toBe('22');
    expect(result[0]?.bridgeIncomingTransactions.toString()).toBe('3');
    expect(result[0]?.bridgeOutgoingTransactions.toString()).toBe('4');
  });

  it('returns an empty array when the active indexer returns null data', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = createPolkaswapIndexerMock();

    await expect(fetchData(2_000, 1_000, 'DAY' as any)).resolves.toEqual([]);
  });

  it('fetches unique transaction-active accounts for the exact stats period', async () => {
    indexerMocks.request.mockResolvedValue({ data: { activeAccounts: 17 } });
    indexerMocks.currentIndexer = createPolkaswapIndexerMock();

    const result = await fetchActiveAccounts(2_000, 1_000);

    expect(retryOnEmptyResult).toHaveBeenCalledTimes(1);
    expect(indexerMocks.request).toHaveBeenCalledWith(expect.any(Object), {
      from: 2_000,
      to: 1_000,
    });
    expect(result.toString()).toBe('17');
  });

  it.each([
    ['missing payload', {}],
    ['null payload', { data: null }],
    ['negative count', { data: { activeAccounts: -5 } }],
    ['numeric string count', { data: { activeAccounts: '17' } }],
    ['non-numeric count', { data: { activeAccounts: 'not-a-number' } }],
    ['infinite count', { data: { activeAccounts: Number.POSITIVE_INFINITY } }],
    ['NaN count', { data: { activeAccounts: Number.NaN } }],
    ['unsafe count', { data: { activeAccounts: Number.MAX_SAFE_INTEGER + 1 } }],
  ])('returns zero active accounts for %s', async (_case, response) => {
    indexerMocks.request.mockResolvedValue(response);
    indexerMocks.currentIndexer = createPolkaswapIndexerMock();

    const result = await fetchActiveAccounts(2_000, 1_000);

    expect(result.toString()).toBe('0');
  });

  it('rounds fractional active account payloads down defensively', async () => {
    indexerMocks.request.mockResolvedValue({ data: { activeAccounts: 17.9 } });
    indexerMocks.currentIndexer = createPolkaswapIndexerMock();

    const result = await fetchActiveAccounts(2_000, 1_000);

    expect(result.toString()).toBe('17');
  });
});

const createPolkaswapIndexerMock = () => ({
  type: IndexerType.POLKASWAP,
  services: {
    explorer: {
      fetchAllEntities: indexerMocks.fetchAllEntities,
      request: indexerMocks.request,
    },
  },
});

const createNetworkSnapshotEntity = (
  timestamp: string,
  accounts: string,
  transactions: string,
  bridgeIncomingTransactions: string,
  bridgeOutgoingTransactions: string
) => ({
  timestamp,
  accounts,
  transactions,
  bridgeIncomingTransactions,
  bridgeOutgoingTransactions,
});
