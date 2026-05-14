import { FPNumber } from '@sora-substrate/math';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { createPoolsApySubscription, getPoolsApyObject } from '@/indexer/queries/pool/apy';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchAllEntities: vi.fn(),
  createEntitySubscription: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  PolkaswapIndexer: class PolkaswapIndexer {},
}));

describe('pool apy query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches Polkaswap pool APY entities and merges parsed APY objects', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, variables, parse) => {
      expect(variables).toEqual({});

      return [
        parse({ id: 'pool-a', strategicBonusApy: '0.125' }),
        parse({ id: 'pool-b', strategicBonusApy: '1.5' }),
        parse({ id: 'pool-skipped', strategicBonusApy: 'Infinity' }),
      ];
    });
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    await expect(getPoolsApyObject()).resolves.toEqual({
      'pool-a': toCodecString('0.125'),
      'pool-b': toCodecString('1.5'),
    });
    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(expect.any(Object), {}, expect.any(Function));
  });


  it('returns null when no APY entities are available', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    await expect(getPoolsApyObject()).resolves.toBeNull();
    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledTimes(1);
  });

  it('creates a Polkaswap APY subscription and parses stream update payloads', () => {
    const unsubscribe = vi.fn();
    indexerMocks.createEntitySubscription.mockReturnValue(unsubscribe);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);
    const handler = vi.fn();
    const errorHandler = vi.fn();

    const result = createPoolsApySubscription(handler, errorHandler);

    expect(result).toBe(unsubscribe);
    expect(indexerMocks.createEntitySubscription).toHaveBeenCalledWith(
      expect.any(Object),
      {},
      expect.any(Function),
      handler,
      errorHandler
    );

    const parse = indexerMocks.createEntitySubscription.mock.calls[0]?.[2];

    expect(parse({ data: JSON.stringify({ 'pool-a': '0.25', 'pool-b': null, 'pool-skipped': 'Infinity' }) })).toEqual({
      'pool-a': toCodecString('0.25'),
      'pool-b': toCodecString('0'),
    });
    expect(parse({ data: '' })).toEqual({});
  });

  });

const createIndexer = (type: unknown) => ({
  type,
  services: {
    explorer: {
      fetchAllEntities: indexerMocks.fetchAllEntities,
      createEntitySubscription: indexerMocks.createEntitySubscription,
    },
  },
});

const toCodecString = (value: string): string => new FPNumber(value).toCodecString();
