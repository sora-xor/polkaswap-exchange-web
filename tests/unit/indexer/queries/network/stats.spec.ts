import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchActiveAccounts } from '@/indexer/queries/network/stats';
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

  it('fetches unique transaction-active accounts for the exact stats period', async () => {
    indexerMocks.request.mockResolvedValue({ data: { activeAccounts: 17 } });
    indexerMocks.currentIndexer = createPolkaswapIndexerMock();

    const result = await fetchActiveAccounts(2_000, 1_000);

    expect(retryOnEmptyResult).toHaveBeenCalledTimes(1);
    expect(indexerMocks.request).toHaveBeenCalledWith(expect.any(Object), {
      from: 2_000,
      to: 1_000,
    });
    expect(result?.toString()).toBe('17');
  });

  it.each([
    ['missing payload', {}],
    ['null payload', { data: null }],
    ['negative count', { data: { activeAccounts: -5 } }],
    ['numeric string count', { data: { activeAccounts: '17' } }],
    ['non-numeric count', { data: { activeAccounts: 'not-a-number' } }],
    ['infinite count', { data: { activeAccounts: Number.POSITIVE_INFINITY } }],
    ['NaN count', { data: { activeAccounts: Number.NaN } }],
    ['fractional count', { data: { activeAccounts: 17.9 } }],
    ['unsafe count', { data: { activeAccounts: Number.MAX_SAFE_INTEGER + 1 } }],
  ])('preserves unavailability for %s', async (_case, response) => {
    indexerMocks.request.mockResolvedValue(response);
    indexerMocks.currentIndexer = createPolkaswapIndexerMock();

    const result = await fetchActiveAccounts(2_000, 1_000);

    expect(result).toBeNull();
  });

  it('preserves an observed zero active accounts', async () => {
    indexerMocks.request.mockResolvedValue({ data: { activeAccounts: 0 } });
    indexerMocks.currentIndexer = createPolkaswapIndexerMock();

    const result = await fetchActiveAccounts(2_000, 1_000);

    expect(result?.toString()).toBe('0');
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
