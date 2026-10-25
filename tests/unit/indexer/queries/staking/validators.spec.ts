import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getValidatorsInfoFromIndexer, stakingValidatorsQueryInternals } from '@/indexer/queries/staking/validators';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  request: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  PolkaswapIndexer: class PolkaswapIndexer {},
}));

describe('staking validators indexer query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = createIndexer();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and parses indexed validator returns from the stream payload', async () => {
    indexerMocks.request.mockResolvedValue({
      data: {
        data: JSON.stringify([
          {
            id: 'validator-1',
            address: 'validator-1',
            commission: '100000000',
            rewardPoints: 25,
            nominators: [{ who: 'nominator-1', value: '1' }],
            identity: { info: { display: 'Validator One' } },
            apy: '65.7',
            isOversubscribed: true,
            isKnownGood: true,
            stake: { total: '1000', own: '100' },
          },
        ]),
      },
    });

    await expect(getValidatorsInfoFromIndexer()).resolves.toEqual([
      {
        address: 'validator-1',
        commission: '100000000',
        blocked: false,
        rewardPoints: 25,
        nominators: [{ who: 'nominator-1', value: '1' }],
        identity: { info: { display: 'Validator One' } },
        apy: '65.7',
        isOversubscribed: true,
        isKnownGood: true,
        stake: { total: '1000', own: '100' },
      },
    ]);
    expect(indexerMocks.request).toHaveBeenCalledWith(expect.any(Object));
  });

  it('returns null when the stream payload is missing or invalid', () => {
    expect(stakingValidatorsQueryInternals.parseValidatorsStream(null)).toBeNull();
    expect(stakingValidatorsQueryInternals.parseValidatorsStream({ id: 'stakingValidators', block: 1, data: '{}' })).toBeNull();
    expect(
      stakingValidatorsQueryInternals.parseValidatorsStream({ id: 'stakingValidators', block: 1, data: 'not-json' })
    ).toBeNull();
  });

  it('returns null when the indexer request fails', async () => {
    indexerMocks.request.mockRejectedValue(new Error('indexer unavailable'));

    await expect(getValidatorsInfoFromIndexer()).resolves.toBeNull();
    expect(console.warn).toHaveBeenCalledWith('Failed to fetch indexed staking validators', expect.any(Error));
  });
});

const createIndexer = () => ({
  services: {
    explorer: {
      request: indexerMocks.request,
    },
  },
});
